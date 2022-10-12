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
import { IMessageProducer, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { InvalidMessagePayloadError, InvalidMessageTypeError, InvalidParticipantIdError, NoSuchOracleAdapterError, NoSuchOracleError, NoSuchParticipantError, NoSuchParticipantFspIdError, RequiredParticipantIsNotActive, UnableToAddOracleError,  UnableToAssociateParticipantError,  UnableToDisassociateParticipantError, UnableToProcessMessageError } from "./errors";
import { IOracleFinder, IOracleProviderAdapter, IOracleProviderFactory, IParticipantService, Oracle} from "./interfaces/infrastructure";
import { AccountLookUperrorEvt, AccountLookUperrorEvtPayload, ParticipantAssociationRemovedEvt, ParticipantAssociationCreatedEvt, ParticipantAssociationCreatedEvtPayload, ParticipantAssociationRemovedEvtPayload, ParticipantAssociationRequestReceivedEvtPayload, ParticipantDisassociateRequestReceivedEvtPayload, ParticipantQueryReceivedEvt, ParticipantQueryReceivedEvtPayload, ParticipantQueryResponseEvtPayload, PartyInfoAvailableEvtPayload, PartyInfoRequestedEvt, PartyInfoRequestedEvtPayload, PartyQueryReceivedEvtPayload, PartyQueryReceivedEvt, PartyInfoAvailableEvt, ParticipantAssociationRequestReceivedEvt, ParticipantDisassociateRequestReceivedEvt, PartyQueryResponseEvt, PartyQueryResponseEvtPayload  } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";

export class AccountLookupAggregate  {
	private readonly _logger: ILogger;
	private readonly _oracleFinder: IOracleFinder;
	private oracleProvidersAdapters: IOracleProviderAdapter[];
	private readonly _oracleProvidersFactory: IOracleProviderFactory;
	private readonly _messageProducer: IMessageProducer;
	private readonly _participantService: IParticipantService;
	

	constructor(
		logger: ILogger,
		oracleFinder:IOracleFinder,
		oracleProvidersFactory:IOracleProviderFactory,
		messageProducer:IMessageProducer,
		participantService: IParticipantService
	) {
		this._logger = logger;
		this._oracleFinder = oracleFinder;
		this._oracleProvidersFactory = oracleProvidersFactory;
		this._messageProducer = messageProducer;
		this._participantService = participantService;
	}

	async init(): Promise<void> {
		try {
			this._oracleFinder.init();
			const oracles = await this._oracleFinder.getAllOracles();
			this._logger.debug("Oracle finder initialized");
			for await (const oracle of oracles) {
				const oracleAdapter = this._oracleProvidersFactory.create(oracle);
				await oracleAdapter.init();
				this.oracleProvidersAdapters.push(oracleAdapter);
				this._logger.debug("Oracle provider initialized " + oracle.name);
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
			for await (const oracle of this.oracleProvidersAdapters) {
				oracle.destroy();
			}
		} catch(error) {
			this._logger.fatal("Unable to destroy account lookup aggregate" + error);
			throw error;
		}
	}


	async publishAccountLookUpEvent(message: IMessage): Promise<void> {
		try{
				const isMessageValid = this.validateMessage(message);
				if(isMessageValid) {
					await this.handleEvent(message);
				}
			}
			catch(error:any) {
				const errorMessage = error.constructor.name;
				this._logger.error(`Error processing event : ${message.msgName} -> ` + errorMessage);
				await this.publishErrorEvent(message, errorMessage);
			}
	}
	

	private validateMessage(message:IMessage): boolean {
		if(!message.payload){
			this._logger.error(`AccountLookUpEventHandler: message payload has invalid format or value`);
			throw new InvalidMessagePayloadError();
		}
		if(message.msgType !== MessageTypes.DOMAIN_EVENT){
			this._logger.error(`AccountLookUpEventHandler: message type is invalid : ${message.msgType}`);
			throw new InvalidMessageTypeError();
		}

		return true;
	}

	private async publishErrorEvent(message: IMessage, errorMsg: string) {
		const errorPayload: AccountLookUperrorEvtPayload = {
			errorMsg,
			partyId: message.payload?.partyId ?? "N/A",
			sourceEvent: message.msgName,
			partyType: message.payload?.partyType ?? "N/A",
			partySubType: message.payload?.partySubType ?? "N/A",
			requesterFspId: message.payload?.requesterFspId ?? "N/A",

		};
		const messageToPublish = new AccountLookUperrorEvt(errorPayload);
		messageToPublish.fspiopOpaqueState = message.fspiopOpaqueState;
		await this._messageProducer.send(messageToPublish);
	}

	private async handleEvent(message:IMessage):Promise<void> {
		const {payload, fspiopOpaqueState} = message;
		let eventToPublish = null;
		switch(message.msgName){
			case PartyQueryReceivedEvt.name:
				eventToPublish = await this.getPartyEvent(payload);
				break;
			case PartyInfoAvailableEvt.name:
				eventToPublish = await this.getPartyInfoEvent(payload);
				break;
			case ParticipantQueryReceivedEvt.name:
				eventToPublish = await this.getParticipantEvent(payload);
				break;
			case ParticipantAssociationRequestReceivedEvt.name:
				eventToPublish = await this.participantAssociationEvent(payload);
				break;
			case ParticipantDisassociateRequestReceivedEvt.name:
				eventToPublish = await this.participantDisassociationEvent(payload);
				break;
			default:
				this._logger.error(`message type has invalid format or value ${message.msgName}`);
				throw new InvalidMessageTypeError();
			}
		if(eventToPublish != null){
			eventToPublish.fspiopOpaqueState = fspiopOpaqueState;
			await this._messageProducer.send(eventToPublish);
		}
		else{
			throw new UnableToProcessMessageError();
		}

	}

	private async getPartyEvent({ requesterFspId, partyType, partyId, partySubType, currency, destinationFspId }: PartyQueryReceivedEvtPayload):Promise<PartyInfoRequestedEvt>{
		let destinationFspIdToUse = destinationFspId;
		await this.validateParticipant(requesterFspId);

		if(!destinationFspIdToUse){
			destinationFspIdToUse = await this.getParticipantIdFromOracle(partyId, partyType, partySubType);
		}

		await this.validateParticipant(destinationFspIdToUse);

		const payload:PartyInfoRequestedEvtPayload = { 
			requesterFspId: requesterFspId ,
			destinationFspId: destinationFspIdToUse,
			partyType: partyType,
			partyId: partyId,
			partySubType: partySubType,
			currency: currency
		};

		const event = new PartyInfoRequestedEvt(payload);

		return event;
		
	}

	private async getPartyInfoEvent({ requesterFspId, ownerFspId, partyType, partyId, partySubType, destinationFspId, currency, partyName, partyDoB }: PartyInfoAvailableEvtPayload):Promise<PartyQueryResponseEvt>{

		await this.validateParticipant(requesterFspId);

		await this.validateParticipant(destinationFspId);

		const payload:PartyQueryResponseEvtPayload = { 
			requesterFspId: requesterFspId,
			destinationFspId: destinationFspId as string,
			partyDoB: partyDoB,
			partyName: partyName,
			ownerFspId: ownerFspId,
			partyType: partyType,
			partyId: partyId,
			partySubType: partySubType,
			currency: currency,
		};

		const event = new PartyQueryResponseEvt(payload);

		return event;
	}

	private async getParticipantEvent({ requesterFspId, partyType, partyId, partySubType, currency }: ParticipantQueryReceivedEvtPayload):Promise<ParticipantQueryReceivedEvt>{
  
		await this.validateParticipant(requesterFspId);

		const participantId = await this.getParticipantIdFromOracle(partyId, partyType, partySubType);

		await this.validateParticipant(participantId);

		const payload: ParticipantQueryResponseEvtPayload = { 
			requesterFspId: requesterFspId,
			ownerFspId: participantId,
			partyType: partyType,
			partyId: partyId,
			partySubType: partySubType,
			currency: currency
		}; 

		const event = new ParticipantQueryReceivedEvt(payload);
		
		return event;
	}

	private async participantAssociationEvent({ ownerFspId, partyType, partySubType, partyId }: ParticipantAssociationRequestReceivedEvtPayload):Promise<ParticipantAssociationCreatedEvt>{
		await this.validateParticipant(ownerFspId);

		const oracleProvider = await this.getOracleAdapter(partyType, partySubType);

		await oracleProvider.associateParticipant(partyId,ownerFspId).catch(error=>{
			this._logger.error(`Unable to associate party id: ${partyId} ` + error);
			throw new UnableToAssociateParticipantError();
		});

		const payload : ParticipantAssociationCreatedEvtPayload = {
			partyId,
			ownerFspId,
			partyType,
			partySubType
		};

		const event = new ParticipantAssociationCreatedEvt(payload);

		return event;

	}

	private async participantDisassociationEvent({ ownerFspId, partyType, partySubType,partyId }: ParticipantDisassociateRequestReceivedEvtPayload):Promise<ParticipantAssociationRemovedEvt>{
		await this.validateParticipant(ownerFspId);
		
		const oracleProvider = await this.getOracleAdapter(partyType, partySubType);

		await oracleProvider.disassociateParticipant(partyId, ownerFspId).catch(error=>{
			this._logger.error(`Unable to disassociate party id: ${partyId} ` + error);
			throw new UnableToDisassociateParticipantError();
		});

		const payload:ParticipantAssociationRemovedEvtPayload = { 
			partyId,
			ownerFspId,
			partyType,
			partySubType
		}; 

		const event = new ParticipantAssociationRemovedEvt(payload);

		return event;

	}

	private async validateParticipant(participantId: string | null):Promise<void>{
		
		if(participantId){
			const participant = await this._participantService.getParticipantInfo(participantId);
		
			if(!participant) {
				this._logger.debug(`No participant found`);
				throw new NoSuchParticipantError();
			}

			if(participant.id !== participantId){
				this._logger.debug(`Participant id mismatch ${participant.id} ${participantId}`);
				throw new InvalidParticipantIdError();
			}
	
			if(!participant.isActive) {
				this._logger.debug(`${participant.id} is not active`);
				throw new RequiredParticipantIsNotActive();
			}
		
		}
		
	}
	
	//#region Oracles
	private async getOracleAdapter(partyType:string, partySubType:string | null): Promise<IOracleProviderAdapter> {
		const oracle = await this._oracleFinder.getOracle(partyType, partySubType); 
		if(!oracle) {
			this._logger.debug(`oracle for ${partyType} not found`);
			throw new NoSuchOracleError();
		}
		
		const oracleAdapter = this.oracleProvidersAdapters.find(provider=>provider.oracleId === oracle?.id);
		
		if(!oracleAdapter) {
			this._logger.debug(`oracle adapter for ${partyType} not found`);
			throw new NoSuchOracleAdapterError();
		}
		
		return oracleAdapter;
	}
	
	

	private async getParticipantIdFromOracle(partyId:string, partyType:string, partySubType:string | null): Promise<string> {
		const oracleAdapter = await this.getOracleAdapter(partyType, partySubType);
		
		const fspId = await oracleAdapter.getParticipantFspId(partyId);

		if(!(fspId)) {
			this._logger.debug(`partyId:${partyId} has no existing fspId owner`);
			throw new NoSuchParticipantFspIdError();
		}

		return fspId;
	}

	public async addOracle(oracle: Oracle): Promise<void> {
		const addedOracle = await this._oracleFinder.addOracle(oracle);
		
		if(!addedOracle) {
			this._logger.debug(`oracle for ${oracle.type} not added`);
			throw new UnableToAddOracleError();
		}
		const addedOracleProvider = this._oracleProvidersFactory.create(oracle);
		await addedOracleProvider.init();
		this.oracleProvidersAdapters.push(addedOracleProvider);
	}
	
	public async removeOracle(id: string): Promise<void> {
		await this._oracleFinder.removeOracle(id);
		this.oracleProvidersAdapters = this.oracleProvidersAdapters.filter((o) => o.oracleId !== id);
	}
	
	public async getAllOracles(): Promise<Oracle[]> {
		const oracles = await this._oracleFinder.getAllOracles();
		const mappedOracles = oracles.map((o) => {
			return {
				id: o.id,
				name: o.name,
				type: o.type,
				partyType: o.partyType,
				partySubType: o.partySubType ?? "N/A",
				endpoint: o.endpoint ?? "N/A",
			} as Oracle;
		});

		return mappedOracles;
	}
	
	public async healthCheck(id:string): Promise<boolean> {
		const oracleFound =  this.oracleProvidersAdapters.find((o) => o.oracleId === id);
		if(!oracleFound) {
			return false;
			//TODO: throw error
		}
		return await oracleFound.healthCheck();
	}

	//#endregion


}
