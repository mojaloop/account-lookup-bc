/**
 License
 --------------
 Copyright © 2021 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License.

 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Coil
 - Jason Bruwer <jason.bruwer@coil.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>
 
 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

 "use strict";


import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { InvalidMessagePayloadError, InvalidMessageTypeError, NoSuchOracleProviderError, NoSuchParticipantError, NoSuchParticipantFspIdError, RequiredParticipantIsNotActive, UnableToAssociatePartyError, UnableToDisassociatePartyError, UnableToGetOracleError, UnableToGetOracleProviderError, UnableToProcessMessageError } from "./errors";
import { IOracleFinder, IOracleProvider, IParticipantService} from "./interfaces/infrastructure";
import { AccountLookupBCEvents, AccountLookUperrorEvt, AccountLookUperrorEvtPayload, ParticipantAssociationRemovedEvt, ParticipantAssociationCreatedEvt, ParticipantAssociationCreatedEvtPayload, ParticipantAssociationRemovedEvtPayload, ParticipantAssociationRequestReceivedEvtPayload, ParticipantDisassociateRequestReceivedEvtPayload, ParticipantQueryReceivedEvt, ParticipantQueryReceivedEvtPayload, ParticipantQueryResponseEvtPayload, PartyInfoAvailableEvtPayload, PartyInfoRequestedEvt, PartyInfoRequestedEvtPayload, PartyQueryReceivedEvtPayload  } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IParticipant } from "./types";
export class AccountLookupAggregate  {
	private readonly _logger: ILogger;
	private readonly _oracleFinder: IOracleFinder;
	private readonly _oracleProviders: IOracleProvider[];
	private readonly _messageProducer: IMessageProducer;
	private readonly _participantService: IParticipantService;
	

	constructor(
		logger: ILogger,
		oracleFinder:IOracleFinder,
		oracleProviders:IOracleProvider[],
		messageProducer:IMessageProducer,
		participantService: IParticipantService
	) {
		this._logger = logger;
		this._oracleFinder = oracleFinder;
		this._oracleProviders = oracleProviders;
		this._messageProducer = messageProducer;
		this._participantService = participantService;
	}

	async init(): Promise<void> {
		try {
			this._oracleFinder.init();
			this._logger.debug("Oracle finder initialized");
			for await (const oracle of this._oracleProviders) {
				await oracle.init();
				this._logger.debug("Oracle provider initialized with type" + oracle.partyType);
			}
		}
		catch(error) {
			{
				this._logger.fatal("Unable to intialize account lookup aggregate" + error);
				throw error;
			}
		}
	}

	async destroy(): Promise<void> {
		try{
			await this._oracleFinder.destroy();
			for await (const oracle of this._oracleProviders) {
				oracle.destroy();
			}
		} catch(error) {
			this._logger.fatal("Unable to destroy account lookup aggregate" + error);
			throw error;
		}
	}


	async publishAccountLookUpEvent(message: IMessage): Promise<void> {
		const isMessageValid = this.validateMessage(message);
		if(isMessageValid) {
			try{
				await this.handleEvent(message);
			}
			catch(error:any) {
				const errorMessage = (error.message)? error.message : error.constructor.name;
				this._logger.error(`${message.msgName} ` + error.message);
				await this.publishErrorEvent(message, errorMessage);
			}
		}
	}

	private validateMessage(message:IMessage): boolean {
		if(!message.payload){
			this._logger.error(`AccountLookUpEventHandler: message payload has invalid format or value`);
			throw new InvalidMessagePayloadError();
		}

		if(! Object.values(AccountLookupBCEvents).some(event => event === message?.msgName)){
			this._logger.error(`AccountLookUpEventHandler: message name ${message?.msgName} is not a valid event type`);
			throw new InvalidMessageTypeError();
		}

		return true;
	}

	private async publishErrorEvent(message: IMessage, errorMsg: string) {
		const errorPayload: AccountLookUperrorEvtPayload = {
			errorMsg,
			partyId: message.payload?.partyId ?? "Unknow party id",
			sourceEvent: message.msgName
		};
		const messageToPublish = new AccountLookUperrorEvt(errorPayload);
		messageToPublish.fspiopOpaqueState = message.fspiopOpaqueState;
		await this._messageProducer.send(messageToPublish);
	}

	private async handleEvent(message:IMessage):Promise<void> {
		const {payload, fspiopOpaqueState} = message;
		let eventToPublish = null;
		switch(message.msgName){
			case AccountLookupBCEvents.PartyInfoRequested:
				eventToPublish = await this.getPartyEvent(payload);
				break;
			case AccountLookupBCEvents.PartyInfoAvailable:
				eventToPublish = await this.getPartyInfoEvent(payload);
				break;
			case AccountLookupBCEvents.ParticipantQueryReceived:
				eventToPublish = await this.getParticipantEvent(payload);
				break;
			case AccountLookupBCEvents.ParticipantAssociationRequested:
				eventToPublish = await this.participantAssociationEvent(payload);
				break;
			case AccountLookupBCEvents.ParticipantDisassociateRequest:
				eventToPublish = await this.participantDisassociationEvent(payload);
				break;
			}
		if(eventToPublish != null){
			eventToPublish.fspiopOpaqueState = fspiopOpaqueState;
			await this._messageProducer.send(eventToPublish);
		}
		else{
			throw new UnableToProcessMessageError();
		}

	}

	private async getParticipantEvent({ requesterFspId, partyType, partyId, partySubType, currency }: ParticipantQueryReceivedEvtPayload):Promise<ParticipantQueryReceivedEvt>{
		const sourceFsp = await this._participantService.getParticipantInfo(requesterFspId);
  
		this.validateParticipant(sourceFsp);
		
		const destinationFsp: IParticipant = await this.getDestinationFsp({ partyId, partyType, partySubType, destinationFspId: null });
		
		const payload: ParticipantQueryResponseEvtPayload = { 
			requesterFspId: requesterFspId,
			ownerFspId: destinationFsp.id,
			partyType: partyType,
			partyId: partyId,
			partySubType: partySubType,
			currency: currency
		}; 

		const event = new ParticipantQueryReceivedEvt(payload);
		
		return event;
	}

	private async participantAssociationEvent({ ownerFspId, partyType, partySubType, partyId }: ParticipantAssociationRequestReceivedEvtPayload):Promise<ParticipantAssociationCreatedEvt>{
		const requesterFsp = await this._participantService.getParticipantInfo(ownerFspId);
  
		this.validateParticipant(requesterFsp);

		const oracleProvider = await this.getOracleProvider(partyType, partySubType);

		await oracleProvider.associateParty(partyId).catch(error=>{
			this._logger.error(`Unable to associate party id: ${partyId} ` + error);
			throw new UnableToAssociatePartyError();
		});

		const payload : ParticipantAssociationCreatedEvtPayload = {
			partyId: partyId,
		};

		const event = new ParticipantAssociationCreatedEvt(payload);

		return event;

	}

	private async participantDisassociationEvent({ ownerFspId, partyType, partySubType,partyId }: ParticipantDisassociateRequestReceivedEvtPayload):Promise<ParticipantAssociationRemovedEvt>{
		const requesterFsp = await this._participantService.getParticipantInfo(ownerFspId);
  
		this.validateParticipant(requesterFsp);
		
		const oracleProvider = await this.getOracleProvider(partyType, partySubType);

		await oracleProvider.disassociateParty(partyId).catch(error=>{
			this._logger.error(`Unable to disassociate party id: ${partyId} ` + error);
			throw new UnableToDisassociatePartyError();
		});

		const payload:ParticipantAssociationRemovedEvtPayload = { 
			partyId,
		}; 

		const event = new ParticipantAssociationRemovedEvt(payload);

		return event;

	}

	private async getPartyEvent({ requesterFspId, partyType, partyId, partySubType, currency, destinationFspId }: PartyQueryReceivedEvtPayload):Promise<PartyInfoRequestedEvt>{
		const sourceFsp = await this._participantService.getParticipantInfo(requesterFspId);
  
		this.validateParticipant(sourceFsp);

		const destinationFsp: IParticipant = await this.getDestinationFsp({ partyId, partyType, partySubType, destinationFspId });

		const payload:PartyInfoRequestedEvtPayload = { 
			requesterFspId: requesterFspId ,
			destinationFspId: destinationFsp.id,
			partyType: partyType,
			partyId: partyId,
			partySubType: partySubType,
			currency: currency
		};

		const event = new PartyInfoRequestedEvt(payload);

		return event;
		
	}
	
	private async getPartyInfoEvent({ requesterFspId, ownerFspId, partyType, partyId, partySubType, destinationFspId, currency, partyName, partyDoB }: PartyInfoAvailableEvtPayload):Promise<PartyInfoRequestedEvt>{
		const sourceFsp = await this._participantService.getParticipantInfo(requesterFspId);

		this.validateParticipant(sourceFsp);

		const destinationFsp = await this._participantService.getParticipantInfo(destinationFspId as string);

		this.validateParticipant(destinationFsp);

		const payload:PartyInfoAvailableEvtPayload = { 
			requesterFspId: requesterFspId,
			destinationFspId: destinationFsp?.id ?? null,
			partyType: partyType,
			partyId: partyId,
			partySubType: partySubType,
			currency: currency,
			ownerFspId: ownerFspId,
			partyDoB: partyDoB,
			partyName: partyName
		};

		const event = new PartyInfoRequestedEvt(payload);

		return event;
	}
	

	private async getOracleProvider(partyType:string, partySubType:string | null): Promise<IOracleProvider> {
		const oracleProvider = await this._oracleFinder.getOracleProvider(partyType, partySubType).catch(error=>{
			this._logger.error(`Unable to get oracle for type: ${partyType} ` + error);
			throw new UnableToGetOracleError();
		});

		if(!oracleProvider) {
			this._logger.debug(`No oracle provider found for partyType: ${partyType}`);
			throw new UnableToGetOracleProviderError();
		}

		return oracleProvider;
	}
	
	private validateParticipant(participant: IParticipant | null):void{
		if(!participant) {
			this._logger.debug(`No participant found`);
			throw new NoSuchParticipantError();
		}

		if(!participant.isActive) {
			this._logger.debug(`${participant.id} is not active`);
			throw new RequiredParticipantIsNotActive();
		}
		
	}

	private async getDestinationFsp({ partyId, partyType, partySubType, destinationFspId }: { partyId:string, partyType:string, partySubType:string | null, destinationFspId: string | null }):Promise<IParticipant>{
		let destinationFsp: IParticipant|null = null;

		// In this case, the sourceFspId already knows the destinationFspId,
		// so we just need to validate it
		if(destinationFspId) {
			const participant = await this._participantService.getParticipantInfo(destinationFspId);
			
			this.validateParticipant(participant);

			if(participant) {
				destinationFsp = participant; 
			}
		} else {
			destinationFsp = await this.getParticipantFromOracle(partyId, partyType, partySubType);
		}  

		if(!destinationFsp){
			this._logger.debug(`partyId:${partyId} has no existing fspId owner`);
			throw new NoSuchParticipantFspIdError();
		}

		return destinationFsp;
	}

	private async getParticipantFromOracle(partyId:string, partyType:string, partySubType:string | null): Promise<IParticipant|null> {
		const oracle = await this._oracleFinder.getOracleProvider(partyType, partySubType);
		
		if(!oracle) {
			this._logger.debug(`oracle for ${partyType} not found`);
			throw new NoSuchOracleProviderError();
		}

		const fspId = await oracle.getParticipant(partyId);

		if(!(fspId)) {
			this._logger.debug(`partyId:${partyId} has no existing fspId owner`);
			throw new NoSuchParticipantFspIdError();
		}

		// The participants BC will return a participant's info  
		// more info than just a regular ID, example:
		// {
		//     id: string;
		//     isActive: Boolean;
		// }
		const participant = await this._participantService.getParticipantInfo(fspId);
		
		this.validateParticipant(participant);

		return participant;
	}
}
