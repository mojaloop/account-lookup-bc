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
import { NoSuchOracleProviderError, NoSuchParticipantFspIdError, RequiredParticipantIsNotActive, UnableToAssociatePartyError, UnableToDisassociatePartyError, UnableToGetOracleError, UnableToGetOracleProviderError } from "./errors";
import { IOracleFinder, IOracleProvider, IParticipantService} from "./interfaces/infrastructure";
import { AccountLookupBCEvents, AccountLookUperrorEvt, AccountLookUperrorEvtPayload, ParticipantAssociationAssociationRemovedEvt, ParticipantAssociationCreatedEvt, ParticipantAssociationCreatedEvtPayload, ParticipantAssociationRemovedEvtPayload, ParticipantAssociationRequestReceivedEvtPayload, ParticipantDisassociateRequestReceivedEvtPayload, ParticipantQueryReceivedEvt, ParticipantQueryReceivedEvtPayload, ParticipantQueryResponseEvtPayload, PartyInfoAvailableEvtPayload, PartyInfoRequestedEvt, PartyInfoRequestedEvtPayload, PartyQueryReceivedEvtPayload  } from "@mojaloop/platform-shared-lib-public-messages-lib";
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


	async publishAccountLookUpEvent(message: IMessage): Promise<void> {
		const isMessageValid = this.validateMessage(message);
		if(isMessageValid) {
			try{
				await this.handleMessage(message);
			}
			catch(error:any) {
				this._logger.error(`${message.msgName} ` + error.message);
				await this.publishErrorEvent(message, error.message);
			}
		}
	}

	async publishErrorEvent(message: IMessage, errorMessage: string) {
		const errorPayload: AccountLookUperrorEvtPayload = {
			errorMsg: AccountLookupBCEvents.AccountLookUperror,
			partyId: message.payload?.partyId ?? "Unknow party id",
		}
		const messageToPublish = new AccountLookUperrorEvt(errorPayload);
		await this._messageProducer.send(messageToPublish);
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

	//Participant.
	async getParticipant({ requesterFspId, partyType, partyId, partySubType, currency }: ParticipantQueryReceivedEvtPayload):Promise<ParticipantQueryReceivedEvt>{
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

		const message = new ParticipantQueryReceivedEvt(payload);
		
		return message;
	}

	async participantAssociation({ ownerFspId, partyType, partySubType, partyId }: ParticipantAssociationRequestReceivedEvtPayload):Promise<ParticipantAssociationCreatedEvt>{
		const requesterFsp = await this._participantService.getParticipantInfo(ownerFspId);
  
		this.validateParticipant(requesterFsp);

		const oracleProvider = await this.getOracleProvider(partyType, partySubType);

		await oracleProvider.associateParty(partyId).catch(error=>{
			this._logger.error(`Unable to associate party id: ${partyId} ` + error);
			throw new UnableToAssociatePartyError(error);
		});

		const payload : ParticipantAssociationCreatedEvtPayload = {
			partyId: partyId,
		}

		const message = new ParticipantAssociationCreatedEvt(payload);

		return message;

	}

	async participantDisassociation({ ownerFspId, partyType, partySubType,partyId }: ParticipantDisassociateRequestReceivedEvtPayload):Promise<ParticipantAssociationAssociationRemovedEvt>{
		const requesterFsp = await this._participantService.getParticipantInfo(ownerFspId);
  
		this.validateParticipant(requesterFsp);
		
		const oracleProvider = await this.getOracleProvider(partyType, partySubType);

		await oracleProvider.disassociateParty(partyId).catch(error=>{
			this._logger.error(`Unable to disassociate party id: ${partyId} ` + error);
			throw new UnableToDisassociatePartyError(error);
		});

		const payload:ParticipantAssociationRemovedEvtPayload = { 
			partyId,
		}; 

		const message = new ParticipantAssociationAssociationRemovedEvt(payload);

		return message;

	}

	// missing destinationFspId
	async getParty({ requesterFspId, partyType, partyId, partySubType, currency,  }: PartyQueryReceivedEvtPayload):Promise<PartyInfoRequestedEvt>{
		const sourceFsp = await this._participantService.getParticipantInfo(requesterFspId);
  
		this.validateParticipant(sourceFsp);

		const destinationFsp: IParticipant = await this.getDestinationFsp({ partyId, partyType, partySubType, destinationFspId:null });

		const payload:PartyInfoRequestedEvtPayload = { 
			requesterFspId: requesterFspId ,
			destinationFspId: destinationFsp.id,
			partyType: partyType,
			partyId: partyId,
			partySubType: partySubType,
			currency: currency
		};

		const message = new PartyInfoRequestedEvt(payload);

		return message;
		
	}
	
	async getPartyInfo({ requesterFspId, ownerFspId, partyType, partyId, partySubType, currency, partyName, partyDoB }: PartyInfoAvailableEvtPayload):Promise<PartyInfoRequestedEvt>{
		const sourceFsp = await this._participantService.getParticipantInfo(requesterFspId);

		this.validateParticipant(sourceFsp);

		const destinationFsp = await this._participantService.getParticipantInfo(ownerFspId);

		this.validateParticipant(destinationFsp);

		const payload:PartyInfoRequestedEvtPayload = { 
			requesterFspId: requesterFspId,
			destinationFspId: destinationFsp?.id ?? null,
			partyType: partyType,
			partyId: partyId,
			partySubType: partySubType,
			currency: currency,
			// partyName: "TODO",
			// partyDoB: partyDoB
		};

		const message = new PartyInfoRequestedEvt(payload);

		return message;
	}


	//Private methods.
	private validateMessage(message:IMessage): boolean {
		if(!message.payload){
			this._logger.error(`AccountLookUpEventHandler: message payload has invalid format or value`);
			return false;
		}

		if(! Object.values(AccountLookupBCEvents).some(event => event === message?.msgName)){
			this._logger.error(`AccountLookUpEventHandler: message name ${message?.msgName} is not a valid event type`);
			return false;
		}

		return true;
	}

	private async handleMessage(message:IMessage):Promise<void> {
		let {payload, fspiopOpaqueState} = message;
		let messageToPublish = null;
		switch(message.msgName){
			case AccountLookupBCEvents.PartyInfoRequested:
				messageToPublish = await this.getParty(payload);
				break;
			case AccountLookupBCEvents.PartyInfoAvailable:
				messageToPublish = await this.getPartyInfo(payload);
				break;
			case AccountLookupBCEvents.ParticipantQueryReceived:
				messageToPublish = await this.getParticipant(payload);
				break;
			case AccountLookupBCEvents.ParticipantAssociationRequested:
				messageToPublish = await this.participantAssociation(payload);
				break;
			case AccountLookupBCEvents.ParticipantDisassociateRequest:
				messageToPublish = await this.participantDisassociation(payload);
				break;
			}
		if(messageToPublish != null){
			messageToPublish.fspiopOpaqueState = fspiopOpaqueState;
			await this._messageProducer.send(messageToPublish);
		}
		else{
			await this.publishErrorEvent(message, "Unable to process message");
		}


	}

	private async getOracleProvider(partyType:string, partySubType:string | null): Promise<IOracleProvider> {
		const oracleProvider = await this._oracleFinder.getOracleProvider(partyType, partySubType).catch(error=>{
			this._logger.error(`Unable to get oracle for type: ${partyType} ` + error);
			throw new UnableToGetOracleError(error);
		});

		if(!oracleProvider) {
			this._logger.debug(`No oracle provider found for partyType: ${partyType}`);
			throw new UnableToGetOracleProviderError(`Oracle provider not found for partyType: ${partyType}`);
		}

		return oracleProvider;
	}
	
	private validateParticipant(participant: IParticipant | null):void{
		if(!participant) {
			throw new NoSuchParticipantFspIdError(`fspId does not exist`);
		}

		if(!participant.isActive) {
			throw new RequiredParticipantIsNotActive(`fspId:${participant.id} is not active`);
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
			throw new NoSuchParticipantFspIdError(`partyId:${partyId} has no existing fspId owner`);
		}

		return destinationFsp;
	}

	private async getParticipantFromOracle(partyId:string, partyType:string, partySubType:string | null): Promise<IParticipant|null> {
		const oracle = await this._oracleFinder.getOracleProvider(partyType, partySubType);
		
		if(!oracle) {
			throw new NoSuchOracleProviderError(`oracle for ${partyType} not found`);
		}

		const fspId = await oracle.getParticipant(partyId);

		if(!(fspId)) {
			throw new NoSuchParticipantFspIdError(`partyId:${partyId} has no existing fspId owner`);
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
