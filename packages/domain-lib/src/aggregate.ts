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
	InvalidMessagePayloadError,
	InvalidMessageTypeError,
	InvalidParticipantIdError,
	NoSuchOracleAdapterError,
	NoSuchOracleError,
	NoSuchParticipantError,
	RequiredParticipantIsNotActive,
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
import { ParticipantLookup, Oracle, AddOracleDTO, OracleType, Association } from "./types";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";

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
		let eventToPublish = null;
		try{
			this.validateMessage(message);
		}
		catch(error: any) {
			this._logger.error("Invalid message received: " + error.message);
			eventToPublish = this.createInvalidMessageErrorEvent(message, error);
			await this._messageProducer.send(eventToPublish);
			return;
		}

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
				const errorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
					partyId: message.payload?.partyId || null,
					partySubType: message.payload?.partySubType || null,
					partyType: message.payload?.partyType || null,
					requesterFspId: message.payload?.requesterFspId || null,
				};
				eventToPublish = new AccountLookupBCInvalidMessageTypeErrorEvent(errorPayload);
				this._logger.error(`message type has invalid format or value ${message.msgName}`);
			}
		}

		eventToPublish.fspiopOpaqueState = message.fspiopOpaqueState;

		await this._messageProducer.send(eventToPublish);
	}

	private async handlePartyQueryReceivedEvt(msg: PartyQueryReceivedEvt):Promise<PartyInfoRequestedEvt>{
		this._logger.debug(`Got PartyQueryReceivedEvt msg for partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId} - requesterFspId: ${msg.payload.requesterFspId} destinationFspId: ${msg.payload.destinationFspId}`);
		let destinationFspId = msg.payload?.destinationFspId;
		const requesterFspId = msg.payload?.requesterFspId;
		const partyType = msg.payload?.partyType;
		const partyId = msg.payload?.partyId;
		const currency = msg.payload?.currency;

		try{
			await this.validateParticipant(requesterFspId);
		}
		catch(error:any){
			this._logger.error(`Error validating requesterFspId: ${requesterFspId} - ${error.message}`);
			return this.createParticipantErrorEvent(msg, error) as any;
		}

		if(!destinationFspId){
			let oracleAdapter: IOracleProviderAdapter|null = null;

			try{
				oracleAdapter = await this.getOracleAdapter(partyType);
			}
			catch(error:any){
				this._logger.error(`Error getting oracle adapter for partyType: ${partyType} - ${error.message}`);
				return this.createOracleErrorEvent(msg, error) as any;
			}

			try{
				destinationFspId = await this.getParticipantIdFromOracle(oracleAdapter, partyId,partyType, currency);
			}
			catch(error:any){
				this._logger.error(`Error getting participantId from oracle for partyType: ${partyType} partyId: ${partyId} currency: ${currency} - ${error.message}`);
				return this.createParticipantErrorEvent(msg, error) as any;
			}
		}

		try{
			await this.validateParticipant(destinationFspId);
		}
		catch(error:any){
			this._logger.error(`Error validating destinationFspId: ${destinationFspId} - ${error.message}`);
			return this.createParticipantErrorEvent(msg, error) as any;
		}

		const payload:PartyInfoRequestedEvtPayload = {
			requesterFspId: msg.payload.requesterFspId ,
			destinationFspId: destinationFspId,
			partyType: msg.payload.partyType,
			partyId: msg.payload.partyId,
			partySubType: msg.payload.partySubType,
			currency: msg.payload.currency
		};

		const event = new PartyInfoRequestedEvt(payload);

		return event;

	}

	private async handlePartyInfoAvailableEvt(msg:PartyInfoAvailableEvt):Promise<PartyQueryResponseEvt>{
		this._logger.debug(`Got PartyInfoAvailableEvt msg for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId} - requesterFspId: ${msg.payload.requesterFspId} destinationFspId: ${msg.payload.destinationFspId}`);
		const requesterFspId = msg.payload?.requesterFspId;
		const destinationFspId = msg.payload?.destinationFspId;

		try{
			await this.validateParticipant(requesterFspId);
		}
		catch(error:any){
			this._logger.error(`Error validating requesterFspId: ${requesterFspId} - ${error.message}`);
			return this.createParticipantErrorEvent(msg, error) as any;
		}

		try{
			await this.validateParticipant(destinationFspId);
		}
		catch(error:any){
			this._logger.error(`Error validating destinationFspId: ${destinationFspId} - ${error.message}`);
			return this.createParticipantErrorEvent(msg, error) as any;
		}

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

		return event;
	}

	private async handleParticipantQueryReceivedEvt(msg: ParticipantQueryReceivedEvt):Promise<ParticipantQueryReceivedEvt>{
		this._logger.debug(`Got ParticipantQueryReceivedEvt for partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId} currency: ${msg.payload.currency} - requesterFspId: ${msg.payload.requesterFspId}`);
		const requesterFspId = msg.payload?.requesterFspId;
		const partyType = msg.payload?.partyType;
		const partyId = msg.payload?.partyId;
		const currency = msg.payload?.currency;
		let participantId = null;
		let oracleAdapter: IOracleProviderAdapter|null = null;

		try{
			await this.validateParticipant(requesterFspId);
		}
		catch(error:any){
			this._logger.error(`Error validating requesterFspId: ${requesterFspId} - ${error.message}`);
			return this.createParticipantErrorEvent(msg, error) as any;
		}

		try{
			oracleAdapter = await this.getOracleAdapter(partyType);
		}
		catch(error:any){
			this._logger.error(`Error getting oracle adapter for partyType: ${partyType} - ${error.message}`);
			return this.createOracleErrorEvent(msg, error) as any;
		}

		try{
			participantId = await this.getParticipantIdFromOracle(oracleAdapter, partyId, partyType, currency);
		}
		catch(error:any){
			this._logger.error(`Error getting participantId from oracle for partyType: ${partyType} partyId: ${partyId} currency: ${currency} - ${error.message}`);
			return this.createParticipantErrorEvent(msg, error) as any;
		}

		try{
			await this.validateParticipant(participantId);
		}
		catch(error:any){
			this._logger.error(`Error validating participantId: ${participantId} - ${error.message}`);
			return this.createParticipantErrorEvent(msg, error) as any;
		}

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

	private async handleParticipantAssociationRequestReceivedEvt(msg: ParticipantAssociationRequestReceivedEvt)
		:Promise<ParticipantAssociationCreatedEvt | AccountLookupBCUnableToAssociateParticipantErrorEvent>{
		this._logger.debug(`Got ParticipantAssociationRequestReceivedEvt for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId}`);
		const ownerFspId = msg.payload?.ownerFspId;
		const partyType = msg.payload?.partyType;
		const partyId = msg.payload?.partyId;
		const currency = msg.payload?.currency;
		let oracleProvider: IOracleProviderAdapter|null = null;

		try{
			await this.validateParticipant(ownerFspId);
		}
		catch(error:any){
			this._logger.error(`Error validating ownerFspId: ${ownerFspId} - ${error.message}`);
			return this.createParticipantErrorEvent(msg, error);
		}

		try{
			oracleProvider = await this.getOracleAdapter(msg.payload.partyType);
		}
		catch(error:any){
			this._logger.error(`Error getting oracle adapter for partyType: ${partyType} - ${error.message}`);
			return this.createOracleErrorEvent(msg, error);
		}

		try{
			await oracleProvider.associateParticipant(ownerFspId, partyType, partyId, currency);
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

	private async handleParticipantDisassociateRequestReceivedEvt(msg: ParticipantDisassociateRequestReceivedEvt) :Promise<ParticipantAssociationRemovedEvt | AccountLookupBCUnableToDisassociateParticipantErrorEvent>{
		this._logger.debug(`Got participantDisassociationEvent msg for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId}`);
		const ownerFspId = msg.payload?.ownerFspId;
		const partyType = msg.payload?.partyType;
		const partyId = msg.payload?.partyId;
		const currency = msg.payload?.currency;
		let oracleAdapter: IOracleProviderAdapter|null = null;

		try{
			await this.validateParticipant(ownerFspId);
		}
		catch(error:any){
			this._logger.error(`Error validating ownerFspId: ${ownerFspId} - ${error.message}`);
			return this.createParticipantErrorEvent(msg, error);
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

	private validateMessage(message:IMessage): void {
		if(!message.payload){
			const errorMessage = `Message payload is missing`;
			this._logger.error(errorMessage);
			throw new InvalidMessagePayloadError(errorMessage);
		}
		if(message.msgType !== MessageTypes.DOMAIN_EVENT){
			const errorMessage = `Message type is invalid`;
			this._logger.error(errorMessage);
			throw new InvalidMessageTypeError(errorMessage);
		}
	}

	private async validateParticipant(participantId: string | null):Promise<void>{
		if(participantId){
			let participant: IParticipant | null = null;

			try{
				participant = await this._participantService.getParticipantInfo(participantId);
			}
			catch(error){
				const errorMessage = `Unable to get participant info for participantId: ${participantId} ` + error;
				this._logger.error(errorMessage + error);
				throw new UnableToGetParticipantFspIdError(errorMessage);
			}

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
		}
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

	private async getParticipantIdFromOracle(oracleAdapter:IOracleProviderAdapter, partyId:string, partyType:string, currency:string | null): Promise<string> {

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
	// #endregion

	//#region Error Events

	public createInvalidMessageErrorEvent(message:IMessage, error:Error): AccountLookupBCInvalidMessagePayloadErrorEvent | AccountLookupBCInvalidMessageTypeErrorEvent | AccountLookUpUnknownErrorEvent{
		const partyId = message.payload?.partyId || null;
        const partyType = message.payload?.partyType || null;
        const partySubType = message.payload?.partySubType || null;
        const requesterFspId = message.payload?.requesterFspId || null;
		let errorEvent;

		switch(error.constructor.name){
            case InvalidMessagePayloadError.name:
			{
				const invalidMessageErrorPayload: AccountLookupBCInvalidMessageErrorPayload = {
					partyId,
					partySubType,
					partyType,
					requesterFspId,
				};
                errorEvent = new AccountLookupBCInvalidMessagePayloadErrorEvent(invalidMessageErrorPayload);
                return errorEvent;
			}
            case InvalidMessageTypeError.name:
			{
				const invalidMessageTypeErrorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
					partyId,
					partySubType,
					partyType,
					requesterFspId,
				};
                errorEvent = new AccountLookupBCInvalidMessageTypeErrorEvent(invalidMessageTypeErrorPayload);
                return errorEvent;
			}
			default:
				return this.createUnknownErrorEvent(message, error);
		}
	}

	public createParticipantErrorEvent(message:IMessage, error:Error): AccountLookupBCUnableToGetParticipantFspIdErrorEvent | AccountLookupBCNoSuchParticipantErrorEvent | AccountLookupBCInvalidParticipantIdErrorEvent | AccountLookUpUnknownErrorEvent {
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

	public createOracleErrorEvent(message:IMessage, error:Error): AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent | AccountLookupBCNoSuchOracleErrorEvent | AccountLookupBCNoSuchOracleAdapterErrorEvent | AccountLookUpUnknownErrorEvent  {
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

		const oracleAdapter = await this.getOracleAdapter(partyType).catch(error=>{
			const errorMessage = `Unable to get oracle adapter for partyType: ${partyType} ` + error?.message;
			this._logger.error(errorMessage);
			throw new NoSuchOracleAdapterError(errorMessage);
		});

		const fspId = await this.getParticipantIdFromOracle(oracleAdapter, partyId, partyType, currency).catch(error=>{
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

			const oracleAdapter = await this.getOracleAdapter(partyType).catch(error=>{
				this._logger.error(`Unable to get oracle adapter for partyType: ${partyType} ` + error?.message);
				return null;
			});

			if(oracleAdapter) {
				const fspId = await this.getParticipantIdFromOracle(oracleAdapter, partyId, partyType, currency).catch(error=>{
					this._logger.error(`getBulkAccountLookup - Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} ` + error);
					return null;
				});

				participantsList[key] = fspId;
			}

		}

		return participantsList;
	}

	//#endregion

}
