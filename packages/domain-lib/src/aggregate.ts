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
import { IMessage, IMessageProducer, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
	DuplicateOracleError,
	InvalidParticipantIdError,
	NoSuchOracleAdapterError,
	NoSuchOracleError,
	NoSuchParticipantError,
	UnableToGetOracleAssociationsError,
	UnableToGetOracleFromOracleFinderError,
	UnableToGetParticipantFspIdError,
	UnableToRemoveOracleError
} from "./errors";
import { IOracleFinder, IOracleProviderAdapter, IOracleProviderFactory, IParticipantService} from "./interfaces/infrastructure";
import { AccountLookUpUnknownErrorEvent, AccountLookUpUnknownErrorPayload, AccountLookupBCInvalidMessageErrorPayload, AccountLookupBCInvalidMessagePayloadErrorEvent,
	AccountLookupBCInvalidMessageTypeErrorEvent, AccountLookupBCInvalidMessageTypeErrorPayload, AccountLookupBCInvalidParticipantIdErrorEvent,
	AccountLookupBCInvalidParticipantIdErrorPayload, AccountLookupBCNoSuchOracleAdapterErrorEvent, AccountLookupBCNoSuchOracleAdapterErrorPayload, AccountLookupBCNoSuchOracleErrorEvent,
	AccountLookupBCNoSuchOracleErrorPayload,
	AccountLookupBCNoSuchParticipantErrorEvent, AccountLookupBCNoSuchParticipantErrorPayload, AccountLookupBCNoSuchParticipantFspIdErrorEvent,
	AccountLookupBCUnableToAssociateParticipantErrorEvent, AccountLookupBCUnableToAssociateParticipantErrorPayload, AccountLookupBCUnableToDisassociateParticipantErrorEvent,
	AccountLookupBCUnableToDisassociateParticipantErrorPayload,
	AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent, AccountLookupBCUnableToGetOracleFromOracleFinderErrorPayload, AccountLookupBCUnableToGetParticipantFspIdErrorEvent,
	AccountLookupBCUnableToGetParticipantFspIdErrorPayload } from "@mojaloop/platform-shared-lib-public-messages-lib";
import {
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
import { randomUUID } from "crypto";
import { ParticipantLookup, Oracle, AddOracleDTO, OracleType, Association, AccountLookupErrorEvent } from "./types";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";

export class AccountLookupAggregate  {
	private readonly _logger: ILogger;
	private readonly _oracleFinder: IOracleFinder;
	private readonly _oracleProvidersFactory: IOracleProviderFactory;
	private readonly _messageProducer: IMessageProducer;
	private readonly _participantService: IParticipantService;
	private _oracleProvidersAdapters: IOracleProviderAdapter[];

	//#region Initialization
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
	//#endregion

	//#region Event Handlers
	async handleAccountLookUpEvent(message: IMessage): Promise<void> {
		let eventToPublish = null;
		eventToPublish = this.validateMessageOrGetErrorEvent(message);
		try{
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
				default: {
					this._logger.error(`message type has invalid format or value ${message.msgName}`);
					const errorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
						partyId: message.payload?.partyId || null,
						partySubType: message.payload?.partySubType || null,
						partyType: message.payload?.partyType || null,
						requesterFspId: message.payload?.requesterFspId || null,
					};
					eventToPublish = new AccountLookupBCInvalidMessageTypeErrorEvent(errorPayload);
				}
			}
		}
		catch(error) {
			this._logger.error(`Error while handling message ${message.msgName} - ${error}`);
			eventToPublish = this.createUnknownErrorEvent(message,error);
		}

		eventToPublish.fspiopOpaqueState = message.fspiopOpaqueState;
		await this._messageProducer.send(eventToPublish);
	}

	private async handlePartyQueryReceivedEvt(message: PartyQueryReceivedEvt):Promise<PartyInfoRequestedEvt | AccountLookupErrorEvent>{
		this._logger.debug(`Got PartyQueryReceivedEvt msg for partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId} - requesterFspId: ${message.payload.requesterFspId} destinationFspId: ${message.payload.destinationFspId}`);
		let destinationFspId = message.payload?.destinationFspId;
		const requesterFspId = message.payload?.requesterFspId;
		const partyType = message.payload?.partyType;
		const partyId = message.payload?.partyId;
		const currency = message.payload?.currency;

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(message, requesterFspId);
		if(!requesterParticipant.valid){
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			return requesterParticipant.errorEvent as AccountLookupErrorEvent;
		}

		if(!destinationFspId){
			const participantFromOracle = await this.getParticipantIdFromOracleOrGetErrorEvent(message, partyType, partyId, currency);
			if(participantFromOracle.errorEvent){
				this._logger.error(`Unable to get participant Id from Oracle for partyType: ${partyType}, partyId: ${partyId}, currency: ${currency}`);
				return participantFromOracle.errorEvent as AccountLookupErrorEvent;
			}
			destinationFspId = participantFromOracle.participantId;
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(message, destinationFspId);
		if(!destinationParticipant.valid){
			this._logger.error(`Invalid participant info for destinationFspId: ${destinationFspId}`);
			return destinationParticipant.errorEvent as AccountLookupErrorEvent;
		}

		const payload:PartyInfoRequestedEvtPayload = {
			requesterFspId: message.payload.requesterFspId ,
			destinationFspId: destinationFspId,
			partyType: message.payload.partyType,
			partyId: message.payload.partyId,
			partySubType: message.payload.partySubType,
			currency: message.payload.currency
		};

		const event = new PartyInfoRequestedEvt(payload);

		return event;

	}

	private async handlePartyInfoAvailableEvt(message:PartyInfoAvailableEvt):Promise<PartyQueryResponseEvt | AccountLookupErrorEvent>{
		this._logger.debug(`Got PartyInfoAvailableEvt msg for ownerFspId: ${message.payload.ownerFspId} partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId} - requesterFspId: ${message.payload.requesterFspId} destinationFspId: ${message.payload.destinationFspId}`);
		const requesterFspId = message.payload?.requesterFspId;
		const destinationFspId = message.payload?.destinationFspId;

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(message, requesterFspId);
		if(!requesterParticipant.valid){
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			return requesterParticipant.errorEvent as AccountLookupErrorEvent;
		}

		const destinationParticipant = await this.validateParticipantInfoOrGetErrorEvent(message, destinationFspId);
		if(!destinationParticipant.valid){
			this._logger.error(`Invalid participant info for destinationFspId: ${destinationFspId}`);
			return destinationParticipant.errorEvent as AccountLookupErrorEvent;
		}

		const payload:PartyQueryResponseEvtPayload = {
			requesterFspId: message.payload.requesterFspId,
			destinationFspId: message.payload.destinationFspId as string,
			partyDoB: message.payload.partyDoB,
			partyName: message.payload.partyName,
			ownerFspId: message.payload.ownerFspId,
			partyType: message.payload.partyType,
			partyId: message.payload.partyId,
			partySubType: message.payload.partySubType,
			currency: message.payload.currency,
		};

		const event = new PartyQueryResponseEvt(payload);

		return event;
	}

	private async handleParticipantQueryReceivedEvt(message: ParticipantQueryReceivedEvt):Promise<ParticipantQueryResponseEvt | AccountLookupErrorEvent>{
		this._logger.debug(`Got ParticipantQueryReceivedEvt for partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId} currency: ${message.payload.currency} - requesterFspId: ${message.payload.requesterFspId}`);
		const requesterFspId = message.payload?.requesterFspId;
		const partyType = message.payload?.partyType;
		const partyId = message.payload?.partyId;
		const currency = message.payload?.currency;
		let participantId = null;

		const requesterParticipant = await this.validateParticipantInfoOrGetErrorEvent(message, requesterFspId);

		if(!requesterParticipant.valid){
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			return requesterParticipant.errorEvent as AccountLookupErrorEvent;
		}

		const participantFromOracle = await this.getParticipantIdFromOracleOrGetErrorEvent(message, partyType, partyId, currency);
		if(participantFromOracle.errorEvent){
			this._logger.error(`Unable to get participant Id from Oracle for partyType: ${partyType}, partyId: ${partyId}, currency: ${currency}`);
			return participantFromOracle.errorEvent as AccountLookupErrorEvent;
		}

		participantId = participantFromOracle.participantId as string;

		const validateParticipantFromOracle = await this.validateParticipantInfoOrGetErrorEvent(message, participantId);

		if(!validateParticipantFromOracle.valid){
			this._logger.error(`Invalid participant info for participantId: ${participantId}`);
			return validateParticipantFromOracle.errorEvent as AccountLookupErrorEvent;
		}

		const payload: ParticipantQueryResponseEvtPayload = {
			requesterFspId: message.payload.requesterFspId,
			ownerFspId: participantId,
			partyType: message.payload.partyType,
			partyId: message.payload.partyId,
			partySubType: message.payload.partySubType,
			currency: message.payload.currency
		};

		const event = new ParticipantQueryResponseEvt(payload);

		return event;
	}

	private async handleParticipantAssociationRequestReceivedEvt(msg: ParticipantAssociationRequestReceivedEvt) :Promise<ParticipantAssociationCreatedEvt | AccountLookupErrorEvent>{
		this._logger.debug(`Got ParticipantAssociationRequestReceivedEvt for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId}`);
		const ownerFspId = msg.payload?.ownerFspId;
		const partyType = msg.payload?.partyType;
		const partyId = msg.payload?.partyId;
		const currency = msg.payload?.currency;
		let oracleAdapter: IOracleProviderAdapter|null = null;

		const ownerParticipant = await this.validateParticipantInfoOrGetErrorEvent(msg, ownerFspId);

		if(!ownerParticipant.valid){
			this._logger.error(`Invalid participant info for ownerFspId: ${ownerFspId}`);
			return ownerParticipant.errorEvent as AccountLookupErrorEvent;
		}

		try{
			oracleAdapter = await this.getOracleAdapter(msg.payload.partyType);
		}
		catch(error:any){
			this._logger.error(`Error getting oracle adapter for partyType: ${partyType} - ${error.message}`);
			return this.createOracleErrorEvent(msg, error);
		}

		try{
			await oracleAdapter.associateParticipant(ownerFspId, partyType, partyId, currency);
		}
		catch(error:any){
			this._logger.error(`Error associating partyId: ${partyId} - ${error.message}`);
			return this.createUnableToAssociateErrorEvent(msg);
		}

		const payload : ParticipantAssociationCreatedEvtPayload = {
			partyId: msg.payload.partyId,
			ownerFspId: msg.payload.ownerFspId,
			partyType: msg.payload.partyType,
			partySubType: msg.payload.partySubType
		};

		const event = new ParticipantAssociationCreatedEvt(payload);

		return event;

	}

	private async handleParticipantDisassociateRequestReceivedEvt(msg: ParticipantDisassociateRequestReceivedEvt) :Promise<ParticipantAssociationRemovedEvt | AccountLookupErrorEvent>{
		this._logger.debug(`Got participantDisassociationEvent msg for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId}`);
		const ownerFspId = msg.payload?.ownerFspId;
		const partyType = msg.payload?.partyType;
		const partyId = msg.payload?.partyId;
		const currency = msg.payload?.currency;
		let oracleAdapter: IOracleProviderAdapter|null = null;

		const ownerParticipant = await this.validateParticipantInfoOrGetErrorEvent(msg, ownerFspId);

		if(!ownerParticipant.valid){
			this._logger.error(`Invalid participant info for ownerFspId: ${ownerFspId}`);
			return ownerParticipant.errorEvent as AccountLookupErrorEvent;
		}

		try{
			oracleAdapter = await this.getOracleAdapter(partyType);
		}
		catch(error:any){
			this._logger.error(`Error getting oracle adapter for partyType: ${partyType} - ${error.message}`);
			return this.createOracleErrorEvent(msg, error);
		}

		try{
			await oracleAdapter.disassociateParticipant(ownerFspId,partyType,partyId,currency);
		}
		catch(error:any){
			this._logger.error(`Error disassociating partyId: ${partyId} - ${error.message}`);
			return this.createUnableToDisassociateErrorEvent(msg);
		}

		const payload:ParticipantAssociationRemovedEvtPayload = {
			partyId: msg.payload.partyId,
			ownerFspId: msg.payload.ownerFspId,
			partyType: msg.payload.partyType,
			partySubType: msg.payload.partySubType
		};

		const event = new ParticipantAssociationRemovedEvt(payload);
		return event;
	}

	//#endregion

	//#region Validations

	private validateMessageOrGetErrorEvent(message:IMessage): {errorEvent:AccountLookupErrorEvent | null, valid: boolean} {
		let errorEvent!: AccountLookupErrorEvent | null;
		const result = {errorEvent, valid: false};

		if(!message.payload){
			this._logger.error(`Message payload is invalid or missing`);
			const invalidMessageErrorPayload: AccountLookupBCInvalidMessageErrorPayload = {
				partyId: message.payload?.partyId,
				partySubType: message.payload?.partySubType,
				partyType: message.payload?.partyType,
				requesterFspId: message.payload?.requesterFspId,
			};
			const errorEvent = new AccountLookupBCInvalidMessagePayloadErrorEvent(invalidMessageErrorPayload);
			result.errorEvent = errorEvent;
		}

		if(message.msgType !== MessageTypes.DOMAIN_EVENT){
			this._logger.error(`Message type is invalid ` + message.msgType);
			const invalidMessageTypeErrorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
				partyId: message.payload?.partyId,
				partySubType: message.payload?.partySubType,
				partyType: message.payload?.partyType,
				requesterFspId: message.payload?.requesterFspId,
			};
			const errorEvent = new AccountLookupBCInvalidMessageTypeErrorEvent(invalidMessageTypeErrorPayload);
			result.errorEvent = errorEvent;
		}
		else{
			result.valid = true;
		}

		return result;
	}

	private async validateParticipantInfoOrGetErrorEvent(message:IMessage, participantId: string | null):Promise<{errorEvent:AccountLookupErrorEvent | null, valid: boolean}>{
		let participant: IParticipant | null = null;
		let errorEvent!: AccountLookupErrorEvent | null;
		const result = { errorEvent, valid: false };

		try{
			if(!participantId){
				const errorMessage = `ParticipantId is null or undefined`;
				this._logger.error(errorMessage);
				throw new InvalidParticipantIdError(errorMessage);
			}

			participant = await this._participantService.getParticipantInfo(participantId);

			if(!participant) {
				const errorMessage = `No participant found for participantId: ${participantId}`;
				this._logger.error(errorMessage);
				throw new NoSuchParticipantError(errorMessage);
			}

			if(participant.id !== participantId){
				const errorMessage = `Participant id mismatch ${participant.id} ${participantId}`;
				this._logger.error(errorMessage);
				throw new InvalidParticipantIdError(errorMessage);
			}

			// TODO enable participant.isActive check once this is implemented over the participants side
			// if(!participant.isActive) {
				// 	this._logger.debug(`${participant.id} is not active`);
				// 	throw new RequiredParticipantIsNotActive();
			// }
			result.valid = true;
		}
		catch(error:any){
			const errorMessage = `Unable to get participant info for participantId: ${participantId} ` + error;
			this._logger.error(errorMessage + error);
			result.errorEvent = this.createParticipantErrorEvent(message, error);
		}

		return result;


	}

	//#endregion

	//#region Oracles
	private async getOracleAdapter(partyType:string): Promise<IOracleProviderAdapter> {
		const oracle = await this._oracleFinder.getOracle(partyType)
			.catch(error=>{
				const errorMessage = `Unable to get oracle for partyType: ${partyType} ` + error.message;
				this._logger.error(errorMessage);
				throw new UnableToGetOracleFromOracleFinderError(errorMessage);
		});

		if(!oracle) {
			const errorMessage = `Oracle for ${partyType} not found`;
			this._logger.debug(errorMessage);
			throw new NoSuchOracleError(errorMessage);
		}

		const oracleAdapter = this._oracleProvidersAdapters.find(provider=>provider.oracleId === oracle?.id);

		if(!oracleAdapter) {
			const errorMessage = `Oracle adapter for ${partyType} and id: ${oracle.id} not found`;
			this._logger.debug(errorMessage);
			throw new NoSuchOracleAdapterError(errorMessage);
		}

		return oracleAdapter;
	}

	private async getParticipantIdFromOracle(partyId:string, partyType:string, currency:string | null): Promise<string> {

		const oracleAdapter = await this.getOracleAdapter(partyType).catch(error=>{
			this._logger.error(`Error getting oracle adapter for partyType: ${partyType} - ${error.message}`);
			throw error;
		});

		const fspId = await oracleAdapter.getParticipantFspId(partyType,partyId, currency)
			.catch(error=>{
				const errorMessage = `Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} from oracle` + error?.message;
				this._logger.error(errorMessage);
				throw new UnableToGetParticipantFspIdError(errorMessage);
			});

		if(!(fspId)) {
			const errorMessage = `partyId:${partyId} has no existing fspId owner in oracle`;
			this._logger.debug(errorMessage);
			throw new NoSuchParticipantError(errorMessage);
		}

		return fspId;
	}

	private async getParticipantIdFromOracleOrGetErrorEvent(message:IMessage, partyId:string, partyType:string, currency:string | null): Promise<{errorEvent:AccountLookupErrorEvent, participantId:string | null}> {
		let oracleAdapter: IOracleProviderAdapter | null = null;
		let participantId!: string | null;
		let errorEvent!: AccountLookupErrorEvent;
		const result = { errorEvent, participantId };

		try{
			oracleAdapter = await this.getOracleAdapter(partyType);
		}
		catch(error:any){
			const errorMessage = `Unable to get oracle adapter for partyType: ${partyType} ` + error.message;
			this._logger.error(errorMessage);
			result.errorEvent = this.createParticipantErrorEvent(message, error);
			return result;
		}

		try{
			participantId = await oracleAdapter.getParticipantFspId(partyId, partyType, currency);
			if(!participantId){
				const errorMessage = `partyId:${partyId} has no existing fspId owner in oracle`;
				this._logger.debug(errorMessage);
				throw new NoSuchParticipantError(errorMessage);
			}
		}
		catch(error:any){
			const errorMessage = `Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} from oracle` + error?.message;
			this._logger.error(errorMessage);
			result.errorEvent = this.createParticipantErrorEvent(message, error);
			return result;
		}

		result.participantId = participantId;
		return result;

	}
	// #endregion

	//#region Error Events


	private createParticipantErrorEvent(message:IMessage, error:Error): AccountLookupBCUnableToGetParticipantFspIdErrorEvent | AccountLookupBCNoSuchParticipantErrorEvent | AccountLookupBCInvalidParticipantIdErrorEvent | AccountLookUpUnknownErrorEvent {
		const partyId = message.payload?.partyId || null;
        const partyType = message.payload?.partyType || null;
        const partySubType = message.payload?.partySubType || null;
        const requesterFspId = message.payload?.requesterFspId || null;
		let errorEvent = null;

		switch(error.constructor.name){
            case UnableToGetParticipantFspIdError.name:
			{
				const unableToGetParticipantFspIdErrorPayload: AccountLookupBCUnableToGetParticipantFspIdErrorPayload = {
					partyId,
					partySubType,
					partyType,
					requesterFspId,
				};
                errorEvent = new AccountLookupBCUnableToGetParticipantFspIdErrorEvent(unableToGetParticipantFspIdErrorPayload);
                return errorEvent;
			}
            case NoSuchParticipantError.name:
			{
				const noSuchParticipantErrorPayload: AccountLookupBCNoSuchParticipantErrorPayload = {
					partyId,
					partySubType,
					partyType,
					requesterFspId,
				};
                errorEvent = new AccountLookupBCNoSuchParticipantErrorEvent(noSuchParticipantErrorPayload);
                return errorEvent;
			}
			case InvalidParticipantIdError.name:
			{
				const invalidParticipantIdErrorPayload: AccountLookupBCInvalidParticipantIdErrorPayload = {
					partyId,
					partySubType,
					partyType,
					requesterFspId,
				};
				errorEvent = new AccountLookupBCInvalidParticipantIdErrorEvent(invalidParticipantIdErrorPayload);
                return errorEvent;
			}
			default:
				return this.createUnknownErrorEvent(message, error);
		}
	}

	private createOracleErrorEvent(message:IMessage, error:Error): AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent | AccountLookupBCNoSuchOracleErrorEvent | AccountLookupBCNoSuchOracleAdapterErrorEvent | AccountLookUpUnknownErrorEvent  {
		const partyId = message.payload?.partyId || null;
        const partyType = message.payload?.partyType || null;
        const partySubType = message.payload?.partySubType || null;
        const requesterFspId = message.payload?.requesterFspId || null;
		let errorEvent = null;

		switch(error.constructor.name){
            case UnableToGetOracleFromOracleFinderError.name:
			{
				const unableToGetOracleFromOracleFinderErrorPayload: AccountLookupBCUnableToGetOracleFromOracleFinderErrorPayload = {
					partyId,
					partySubType,
					partyType,
					requesterFspId,
				};
                errorEvent = new AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent(unableToGetOracleFromOracleFinderErrorPayload);
                return errorEvent;
			}
            case NoSuchOracleError.name:
			{
				const noSuchOracleErrorPayload: AccountLookupBCNoSuchOracleErrorPayload = {
					partyId,
					partySubType,
					partyType,
					requesterFspId,
				};
                errorEvent = new AccountLookupBCNoSuchOracleErrorEvent(noSuchOracleErrorPayload);
                return errorEvent;
			}
			case NoSuchOracleAdapterError.name:
			{
				const noSuchOracleAdapterErrorPayload: AccountLookupBCNoSuchOracleAdapterErrorPayload = {
					partyId,
					partySubType,
					partyType,
					requesterFspId,
				};
				errorEvent = new AccountLookupBCNoSuchOracleAdapterErrorEvent(noSuchOracleAdapterErrorPayload);
                return errorEvent;
			}
			default:
				return this.createUnknownErrorEvent(message, error);
		}
	}

	private createUnableToAssociateErrorEvent(msg: ParticipantAssociationRequestReceivedEvt): AccountLookupBCUnableToAssociateParticipantErrorEvent  {
		const errorPayload: AccountLookupBCUnableToAssociateParticipantErrorPayload = {
			requesterFspId: msg.payload?.ownerFspId,
			partyType: msg.payload?.partyType,
			partyId: msg.payload?.partyId,
			partySubType: msg.payload?.partySubType,
		};
		const errorEvent = new AccountLookupBCUnableToAssociateParticipantErrorEvent(errorPayload);
		return errorEvent;
	}

	private createUnableToDisassociateErrorEvent(msg: ParticipantAssociationRequestReceivedEvt): AccountLookupBCUnableToDisassociateParticipantErrorEvent {

		const errorPayload: AccountLookupBCUnableToDisassociateParticipantErrorPayload = {
			requesterFspId: msg.payload?.ownerFspId,
			partyType: msg.payload?.partyType,
			partyId: msg.payload?.partyId,
			partySubType: msg.payload?.partySubType,
		};
		const errorEvent = new AccountLookupBCUnableToDisassociateParticipantErrorEvent(errorPayload);
		return errorEvent;
	}

	private createUnknownErrorEvent(msg: IMessage, error:any) : AccountLookUpUnknownErrorEvent {

		const errorPayload: AccountLookUpUnknownErrorPayload = {
			partyId: msg.payload?.partyId || null,
			partySubType: msg.payload?.partySubType || null,
			partyType: msg.payload?.partyType || null,
			requesterFspId: msg.payload?.requesterFspId || null,
			errorDescription: error?.message,
		};
		const errorEvent = new AccountLookUpUnknownErrorEvent(errorPayload);
		return errorEvent;
	}

	//#endregion

	//#region Oracle Admin Routes
	public async addOracle(oracle: AddOracleDTO): Promise<string> {

		if(oracle.id && await this._oracleFinder.getOracleById(oracle.id)) {
			const errorMessage = `Oracle with id ${oracle.id} already exists`;
			this._logger.error(errorMessage);
			throw new DuplicateOracleError(errorMessage);
		}

		if(!oracle.id){
			oracle.id = randomUUID();
		}

		if(await this._oracleFinder.getOracleByName(oracle.name)) {
			const errorMessage = `Oracle with name ${oracle.name} already exists`;
			this._logger.error(errorMessage);
			throw new DuplicateOracleError(errorMessage);
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
			const errorMessage = `Oracle does not exist for given id ${id}`;
			this._logger.error(errorMessage);
			throw new NoSuchOracleError(errorMessage);
		}

		await this._oracleFinder.removeOracle(id).catch(error=>{
			const errorMessage = `Unable to remove oracle with id ${id} ` + error?.message;
			this._logger.error(errorMessage);
			throw new UnableToRemoveOracleError(errorMessage);
		});

		this._oracleProvidersAdapters = this._oracleProvidersAdapters.filter((o) => o.oracleId !== id);
	}

	public async getBuiltInOracleAssociations(): Promise<Association[]> {
		const oracles = await this._oracleFinder.getAllOracles();
		const builtInOracleType: OracleType = "builtin";
		const builtinOracles = oracles.filter((o) => o.type === builtInOracleType);

		let associations: Association[] = [];
		for await (const oracle of builtinOracles) {

			const oracleProvider = await this.getOracleAdapter(oracle.partyType).catch(error=>{
				const errorMessage = `Unable to get oracle provider for oracle: ${oracle.id} ` + error?.message;
				this._logger.error(errorMessage);
				throw new NoSuchOracleError(errorMessage);
			});

			associations = await oracleProvider.getAllAssociations().catch(error=>{
				const errorMessage = `Unable to get oracle associations for oracle: ${oracle.id} ` + error?.message;
				this._logger.error(errorMessage);
				throw new UnableToGetOracleAssociationsError(errorMessage);
			});
		}

		return associations.flat();
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
			const errorMessage = `Oracle does not exist for given id ${id}`;
			this._logger.error(errorMessage);
			throw new NoSuchOracleError(errorMessage);
		}
		return await oracleFound.healthCheck();
	}

	//#endregion

	//#region Account Lookup Routes
	public async getAccountLookUp(accountIdentifier: ParticipantLookup): Promise<string | null> {
		const {partyId, partyType, currency} = accountIdentifier;

		const fspId = await this.getParticipantIdFromOracle(partyId, partyType, currency).catch(error=>{
			const errorMessage = `Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} ` + error?.message;
			this._logger.error(errorMessage);
			throw new UnableToGetParticipantFspIdError(errorMessage);
		});

		return fspId;
	}

	public async getBulkAccountLookup(identifiersList: { [id:string] : ParticipantLookup}): Promise<{[x: string]: string | null}> {

		const participantsList:{[x: string]: string | null} = {};

		for await (const [key, value] of Object.entries(identifiersList)) {
			const {partyId, partyType, currency} = value;

				const fspId = await this.getParticipantIdFromOracle(partyId, partyType, currency).catch(error=>{
					this._logger.error(`getBulkAccountLookup - Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} ` + error);
					return null;
				});

				participantsList[key] = fspId;
		}

		return participantsList;
	}

	//#endregion

}
