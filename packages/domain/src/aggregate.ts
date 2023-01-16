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
import {
	DuplicateOracleError,
	InvalidMessagePayloadError,
	InvalidMessageTypeError,
	InvalidParticipantIdError,
	NoSuchOracleAdapterError,
	NoSuchOracleError,
	NoSuchParticipantError,
	NoSuchParticipantFspIdError,
	RequiredParticipantIsNotActive,
	UnableToAssociateParticipantError,
	UnableToDisassociateParticipantError,
	UnableToProcessMessageError
} from "./errors";
import { AddOracleDTO, IOracleFinder, IOracleProviderAdapter, IOracleProviderFactory, IParticipantService, Oracle} from "./interfaces/infrastructure";
import {
	AccountLookUperrorEvt,
	AccountLookUperrorEvtPayload,
	ParticipantAssociationRemovedEvt,
	ParticipantAssociationCreatedEvt,
	ParticipantAssociationCreatedEvtPayload,
	ParticipantAssociationRemovedEvtPayload,
	ParticipantQueryReceivedEvt,
	ParticipantQueryResponseEvtPayload,
	PartyInfoRequestedEvt,
	PartyInfoRequestedEvtPayload,
	PartyQueryReceivedEvt,
	PartyInfoAvailableEvt,
	ParticipantAssociationRequestReceivedEvt,
	ParticipantDisassociateRequestReceivedEvt,
	PartyQueryResponseEvt,
	PartyQueryResponseEvtPayload,
	ParticipantQueryResponseEvt
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { randomUUID } from "crypto";
import { ParticipantLookup } from "./types";

export class AccountLookupAggregate  {
	private readonly _logger: ILogger;
	private readonly _oracleFinder: IOracleFinder;
	private readonly _oracleProvidersFactory: IOracleProviderFactory;
	private readonly _messageProducer: IMessageProducer;
	private readonly _participantService: IParticipantService;
	private _oracleProvidersAdapters: IOracleProviderAdapter[];
	
	constructor(
		logger: ILogger,
		oracleFinder:IOracleFinder,
		oracleProvidersFactory:IOracleProviderFactory,
		messageProducer:IMessageProducer,
		participantService: IParticipantService
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._oracleFinder = oracleFinder;
		this._oracleProvidersFactory = oracleProvidersFactory;
		this._messageProducer = messageProducer;
		this._participantService = participantService;
		this._oracleProvidersAdapters = [];
	}

	public get oracleProvidersAdapters(): IOracleProviderAdapter[] {
		const clonedArray = this._oracleProvidersAdapters.map(a => {return {...a};});
		return clonedArray;
	}

	async init(): Promise<void> {
		try {
			this._oracleFinder.init();
			const oracles = await this._oracleFinder.getAllOracles();
			this._logger.debug("Oracle finder initialized");
			for await (const oracle of oracles) {
				const oracleAdapter = this._oracleProvidersFactory.create(oracle);
				await oracleAdapter.init();
				this._oracleProvidersAdapters.push(oracleAdapter);
				this._logger.debug("Oracle provider initialized " + oracle.name);
			}
		}
		catch(error) {
			{
				this._logger.fatal("Unable to initialize account lookup aggregate" + error);
				throw error;
			}
		}
	}

	async destroy(): Promise<void> {
		try{
			await this._oracleFinder.destroy();
			for await (const oracle of this._oracleProvidersAdapters) {
				oracle.destroy();
			}
		} catch(error) {
			this._logger.fatal("Unable to destroy account lookup aggregate" + error);
			throw error;
		}
	}

	//#region Event handlers
	async handleAccountLookUpEvent(message: IMessage): Promise<void> {
		try{
				const isMessageValid = this.validateMessage(message);
				if(isMessageValid) {
					await this.handleEvent(message);
				}
			}
			catch(error: any) {
				const errorMessage = error.constructor.name;
				this._logger.error(`Error processing event : ${message.msgName} -> ` + errorMessage);

				// TODO: find a way to publish the correct error event type

				const errorPayload: AccountLookUperrorEvtPayload = {
					errorMsg: errorMessage,
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

	private async handleEvent(message:IMessage):Promise<void> {
		let eventToPublish = null;
		switch(message.msgName){
			case PartyQueryReceivedEvt.name:
				eventToPublish = await this.handlePartyQueryReceivedEvt(message as PartyQueryReceivedEvt);
				break;
			case PartyInfoAvailableEvt.name:
				eventToPublish = await this.handlePartyInfoAvailableEvt(message as PartyInfoAvailableEvt);
				break;
			case ParticipantQueryReceivedEvt.name:
				eventToPublish = await this.handleParticipantQueryReceivedEvt(message as ParticipantQueryReceivedEvt);
				break;
			case ParticipantAssociationRequestReceivedEvt.name:
				eventToPublish = await this.handleParticipantAssociationRequestReceivedEvt(message as ParticipantAssociationRequestReceivedEvt);
				break;
			case ParticipantDisassociateRequestReceivedEvt.name:
				eventToPublish = await this.handleParticipantDisassociateRequestReceivedEvt(message as ParticipantDisassociateRequestReceivedEvt);
				break;
			default:
				this._logger.error(`message type has invalid format or value ${message.msgName}`);
				throw new InvalidMessageTypeError();
			}
		if(eventToPublish){
			await this._messageProducer.send(eventToPublish);
		}else{
			throw new UnableToProcessMessageError();
		}

	}

	private async handlePartyQueryReceivedEvt(msg: PartyQueryReceivedEvt):Promise<PartyInfoRequestedEvt>{
		this._logger.debug(`Got getPartyEvent msg for partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId} - requesterFspId: ${msg.payload.requesterFspId} destinationFspId: ${msg.payload.destinationFspId}`);
		let destinationFspIdToUse = msg.payload.destinationFspId;
		await this.validateParticipant(msg.payload.requesterFspId);

		if(!destinationFspIdToUse){
			destinationFspIdToUse = await this.getParticipantIdFromOracle(msg.payload.partyId, msg.payload.partyType, msg.payload.partySubType, msg.payload.currency);
		}

		await this.validateParticipant(destinationFspIdToUse);

		const payload:PartyInfoRequestedEvtPayload = { 
			requesterFspId: msg.payload.requesterFspId ,
			destinationFspId: destinationFspIdToUse,
			partyType: msg.payload.partyType,
			partyId: msg.payload.partyId,
			partySubType: msg.payload.partySubType,
			currency: msg.payload.currency
		};

		const event = new PartyInfoRequestedEvt(payload);

		// carry over
		event.fspiopOpaqueState = msg.fspiopOpaqueState;

		return event;
		
	}

	private async handlePartyInfoAvailableEvt(msg:PartyInfoAvailableEvt):Promise<PartyQueryResponseEvt>{
		this._logger.debug(`Got getPartyInfoEvent msg for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId} - requesterFspId: ${msg.payload.requesterFspId} destinationFspId: ${msg.payload.destinationFspId}`);
		await this.validateParticipant(msg.payload.requesterFspId);

		await this.validateParticipant(msg.payload.destinationFspId);

		const payload:PartyQueryResponseEvtPayload = {
			requesterFspId: msg.payload.requesterFspId,
			destinationFspId: msg.payload.destinationFspId as string,
			partyDoB: msg.payload.partyDoB,
			partyName: msg.payload.partyName,
			ownerFspId: msg.payload.ownerFspId,
			partyType: msg.payload.partyType,
			partyId: msg.payload.partyId,
			partySubType: msg.payload.partySubType,
			currency: msg.payload.currency,
		};

		const event = new PartyQueryResponseEvt(payload);

		// carry over
		event.fspiopOpaqueState = msg.fspiopOpaqueState;

		return event;
	}

	private async handleParticipantQueryReceivedEvt(msg: ParticipantQueryReceivedEvt):Promise<ParticipantQueryReceivedEvt>{
		this._logger.debug(`Got getParticipantEvent msg for partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId} currency: ${msg.payload.currency} - requesterFspId: ${msg.payload.requesterFspId}`);
		await this.validateParticipant(msg.payload.requesterFspId);

		const participantId = await this.getParticipantIdFromOracle(msg.payload.partyId, msg.payload.partyType, msg.payload.partySubType, msg.payload.currency);

		await this.validateParticipant(participantId);

		const payload: ParticipantQueryResponseEvtPayload = { 
			requesterFspId: msg.payload.requesterFspId,
			ownerFspId: participantId,
			partyType: msg.payload.partyType,
			partyId: msg.payload.partyId,
			partySubType: msg.payload.partySubType,
			currency: msg.payload.currency
		}; 

		const event = new ParticipantQueryResponseEvt(payload);
		
		return event;
	}

	private async handleParticipantAssociationRequestReceivedEvt(msg: ParticipantAssociationRequestReceivedEvt):Promise<ParticipantAssociationCreatedEvt>{
		this._logger.debug(`Got participantAssociationEvent msg for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId}`);
		await this.validateParticipant(msg.payload.ownerFspId);

		const oracleProvider = await this.getOracleAdapter(msg.payload.partyType, msg.payload.partySubType);

		await oracleProvider.associateParticipant(msg.payload.ownerFspId, msg.payload.partyType, msg.payload.partyId, msg.payload.partySubType, msg.payload.currency).catch(error=>{
			this._logger.error(`Unable to associate party id: ${msg.payload.partyId} ` + error);
			throw new UnableToAssociateParticipantError();
		});


		const payload : ParticipantAssociationCreatedEvtPayload = {
			partyId: msg.payload.partyId,
			ownerFspId: msg.payload.ownerFspId,
			partyType: msg.payload.partyType,
			partySubType: msg.payload.partySubType
		};

		const event = new ParticipantAssociationCreatedEvt(payload);

		event.fspiopOpaqueState = msg.fspiopOpaqueState;

		return event;

	}

	private async handleParticipantDisassociateRequestReceivedEvt(msg: ParticipantDisassociateRequestReceivedEvt):Promise<ParticipantAssociationRemovedEvt>{
		this._logger.debug(`Got participantDisassociationEvent msg for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId}`);
		await this.validateParticipant(msg.payload.ownerFspId);
		
		const oracleProvider = await this.getOracleAdapter(msg.payload.partyType, msg.payload.partySubType);

		await oracleProvider.disassociateParticipant(msg.payload.ownerFspId, msg.payload.partyType, msg.payload.partyId, msg.payload.partySubType, msg.payload.currency).catch(error=>{
			this._logger.error(`Unable to disassociate party id: ${msg.payload.partyId} ` + error);
			throw new UnableToDisassociateParticipantError();
		});

		const payload:ParticipantAssociationRemovedEvtPayload = {
			partyId: msg.payload.partyId,
			ownerFspId: msg.payload.ownerFspId,
			partyType: msg.payload.partyType,
			partySubType: msg.payload.partySubType
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

	//#endregion
	
	//#region Oracles
	private async getOracleAdapter(partyType:string, partySubType:string | null): Promise<IOracleProviderAdapter> {
		const oracle = await this._oracleFinder.getOracle(partyType, partySubType); 
		if(!oracle) {
			this._logger.debug(`oracle for ${partyType} not found`);
			throw new NoSuchOracleError();
		}
		
		const oracleAdapter = this._oracleProvidersAdapters.find(provider=>provider.oracleId === oracle?.id);
		
		if(!oracleAdapter) {
			this._logger.debug(`oracle adapter for ${partyType} not found`);
			throw new NoSuchOracleAdapterError();
		}
		
		return oracleAdapter;
	}
	
	

	private async getParticipantIdFromOracle(partyId:string, partyType:string, partySubType:string | null, currency:string | null): Promise<string> {
		const oracleAdapter = await this.getOracleAdapter(partyType, partySubType);
		
		const fspId = await oracleAdapter.getParticipantFspId(partyType,partyId, partySubType, currency);

		if(!(fspId)) {
			this._logger.debug(`partyId:${partyId} has no existing fspId owner`);
			throw new NoSuchParticipantFspIdError();
		}

		return fspId;
	}
	// #endregion
	
	//#region Oracle Admin Routes
	public async addOracle(oracle: AddOracleDTO): Promise<string> {

		if(oracle.id && await this._oracleFinder.getOracleById(oracle.id)) {
			throw new DuplicateOracleError("Oracle with same id already exists");
		}

		if(!oracle.id){
			oracle.id = randomUUID();
		} 

		if(await this._oracleFinder.getOracleByName(oracle.name)) {
			throw new DuplicateOracleError("Oracle with same name already exists");
		}

		const newOracle: Oracle = oracle as Oracle; 

		const addedOracleProvider = this._oracleProvidersFactory.create(newOracle);

		await this._oracleFinder.addOracle(newOracle);

		await addedOracleProvider.init();

		this._oracleProvidersAdapters.push(addedOracleProvider);
		return oracle.id;
	}
	
	public async removeOracle(id: string): Promise<void> {
		const oracle = await this._oracleFinder.getOracleById(id);
		if(!oracle) {
			throw new NoSuchOracleError();
		}

		await this._oracleFinder.removeOracle(id);
		
		this._oracleProvidersAdapters = this._oracleProvidersAdapters.filter((o) => o.oracleId !== id);
	}
	
	public async getAllOracles(): Promise<Oracle[]> {
		const oracles = await this._oracleFinder.getAllOracles();
		return oracles;
	}

	public async getOracleById(id:string): Promise<Oracle|null> {
		const oracle = await this._oracleFinder.getOracleById(id);
		return oracle;
	}
	
	public async healthCheck(id:string): Promise<boolean> {
		const oracleFound =  this._oracleProvidersAdapters.find((o) => o.oracleId === id);
		if(!oracleFound) {
			throw new NoSuchOracleError();
		}
		return await oracleFound.healthCheck();
	}

	//#endregion

	//#region Account Lookup Routes
	public async getAccountLookUp(accountIdentifier: ParticipantLookup): Promise<string | null> {
		const {partyId, partyType, partySubType, currency} = accountIdentifier;

		const oracleAdapter = await this.getOracleAdapter(partyType, partySubType).catch((err) => {
			this._logger.debug(`getAccountLookup - oracle adapter for ${partyType}, ${partySubType} not found - ${err}`);
			return null;
		});

		if(!oracleAdapter) {
			return null;
		}
		
		const fspId = await oracleAdapter.getParticipantFspId(partyType,partyId, partySubType, currency).catch((err) => {
			this._logger.debug(`getAccountLookup - oracle adapter for ${partyType}, ${partySubType} not found - ${err}`);
			return null;
		});

		return fspId;
	}
		
	public async getBulkAccountLookup(identifiersList: { [id:string] : ParticipantLookup}): Promise<{[x: string]: string | null}> {
		
		const participantsList:{[x: string]: string | null} = {};

		for await (const [key, value] of Object.entries(identifiersList)) {
			const oracleAdapter = await this.getOracleAdapter(value.partyType, value.partySubType).catch((err) => {
				this._logger.debug(`getBulkAccountLookup - oracle adapter for ${value.partyType}, ${value.partySubType} not found`);
				return null;
			});
			if(!oracleAdapter){
				participantsList[key] = null;
				this._logger.debug(`getBulkAccountLookup - oracle adapter for ${value.partyType}, ${value.partySubType} not found`);
			}
			else{
				const fspId = await oracleAdapter.getParticipantFspId(value.partyType,value.partyId, value.partySubType, value.currency).catch((err) => {
					this._logger.debug(`getBulkAccountLookup - partyType:${value.partyType}, partyId:${value.partyId}, partySubType:${value.partySubType}, currency:${value.currency} has no existing fspId owner`);
					return null;
				});
				participantsList[key] = fspId;
			}
		}

		return participantsList;
	}

	//#endregion

}
