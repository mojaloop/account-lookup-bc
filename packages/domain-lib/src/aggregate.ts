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
import {
	DomainEventMsg,
	IMessage,
	IMessageProducer,
	MessageTypes
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
	DuplicateOracleError,
	NoSuchOracleAdapterError,
	OracleNotFoundError,
	ParticipantNotFoundError,
	UnableToGetOracleAssociationsError,
	UnableToGetOracleFromOracleFinderError,
	UnableToGetParticipantFspIdError,
	UnableToRemoveOracleError
} from "./errors";
import {
	IOracleFinder,
	IOracleProviderAdapter,
	IOracleProviderFactory,
	IParticipantServiceAdapter
} from "./interfaces/infrastructure";
import {
	AccountLookupBCDestinationParticipantNotFoundErrorEvent,
	AccountLookupBCDestinationParticipantNotFoundErrorPayload,
	AccountLookupBCInvalidDestinationParticipantErrorEvent,
	AccountLookupBCInvalidDestinationParticipantErrorPayload,
	AccountLookupBCInvalidMessageErrorPayload,
	AccountLookupBCInvalidMessagePayloadErrorEvent,
	AccountLookupBCInvalidMessageTypeErrorEvent,
	AccountLookupBCInvalidMessageTypeErrorPayload,
	AccountLookupBCInvalidRequesterParticipantErrorEvent,
	AccountLookupBCRequesterParticipantNotFoundErrorEvent,
	AccountLookupBCUnableToAssociateParticipantErrorEvent,
	AccountLookupBCUnableToAssociateParticipantErrorPayload,
	AccountLookupBCUnableToDisassociateParticipantErrorEvent,
	AccountLookupBCUnableToDisassociateParticipantErrorPayload,
	AccountLookupBCUnableToGetOracleAdapterErrorEvent,
	AccountLookupBCUnableToGetOracleAdapterErrorPayload,
	AccountLookUpUnableToGetParticipantFromOracleErrorEvent,
	AccountLookUpUnableToGetParticipantFromOracleErrorPayload,
	AccountLookUpUnknownErrorEvent,
	AccountLookUpUnknownErrorPayload,
	ParticipantAssociationCreatedEvt,
	ParticipantAssociationCreatedEvtPayload,
	ParticipantAssociationRemovedEvt,
	ParticipantAssociationRemovedEvtPayload,
	ParticipantAssociationRequestReceivedEvt,
	ParticipantDisassociateRequestReceivedEvt,
	ParticipantQueryReceivedEvt,
	ParticipantQueryResponseEvt,
	ParticipantQueryResponseEvtPayload,
	PartyInfoAvailableEvt,
	PartyInfoRequestedEvt,
	PartyInfoRequestedEvtPayload,
	PartyQueryReceivedEvt,
	PartyQueryResponseEvt,
	PartyQueryResponseEvtPayload,
	GetPartyQueryRejectedEvt,
	GetPartyQueryRejectedResponseEvt,
	GetPartyQueryRejectedResponseEvtPayload
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {randomUUID} from "crypto";
import {AddOracleDTO, Association, Oracle, OracleType, ParticipantLookup} from "./types";
import {IParticipant} from "@mojaloop/participant-bc-public-types-lib";
import {IHistogram, IMetrics} from "@mojaloop/platform-shared-lib-observability-types-lib";

export class AccountLookupAggregate  {
	private readonly _logger: ILogger;
	private readonly _oracleFinder: IOracleFinder;
	private readonly _oracleProvidersFactory: IOracleProviderFactory;
	private readonly _messageProducer: IMessageProducer;
	private readonly _participantService: IParticipantServiceAdapter;
	private _oracleProvidersAdapters: IOracleProviderAdapter[];
	private readonly _metrics:IMetrics;
	private readonly _histo: IHistogram;

	//#region Initialization
	constructor(
		logger: ILogger,
		oracleFinder:IOracleFinder,
		oracleProvidersFactory:IOracleProviderFactory,
		messageProducer:IMessageProducer,
		participantService: IParticipantServiceAdapter,
		metrics:IMetrics
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._oracleFinder = oracleFinder;
		this._oracleProvidersFactory = oracleProvidersFactory;
		this._messageProducer = messageProducer;
		this._participantService = participantService;
		this._oracleProvidersAdapters = [];
		this._metrics = metrics;

		this._histo = metrics.getHistogram("AccountLookupAggregate", "AccountLookupAggregate calls", ["callName", "success"]);
		// this._histo = metrics.getHistogram("AccountLookupAggregate", "AccountLookupAggregate calls", ["callName", "success"], [0.01, 0.05, 0.1, 0.5, 0.75, 1, 1.5, 2]);
	}

	public get oracleProvidersAdapters(): IOracleProviderAdapter[] {
		return this._oracleProvidersAdapters.map(a => {return {...a};});
	}

	async init(): Promise<void> {
		try {
			await this._oracleFinder.init();
			const oracles = await this._oracleFinder.getAllOracles();
			this._logger.debug("Oracle finder initialized");
			for await (const oracle of oracles) {
				const oracleAdapter = this._oracleProvidersFactory.create(oracle);
				await oracleAdapter.init();
				this._oracleProvidersAdapters.push(oracleAdapter);
				this._logger.debug("Oracle provider initialized " + oracle.name);
			}
		} catch(error) {
			this._logger.fatal("Unable to initialize account lookup aggregate" + error);
			throw error;
		}
	}

	async destroy(): Promise<void> {
		try{
			await this._oracleFinder.destroy();
			for (const oracle of this._oracleProvidersAdapters) {
				await oracle.destroy();
			}
		} catch(error) {
			this._logger.fatal("Unable to destroy account lookup aggregate" + error);
			throw error;
		}
	}
	//#endregion

	//#region Event Handlers
	async handleAccountLookUpEvent(message: IMessage): Promise<void> {
		if(this._logger.isDebugEnabled()) this._logger.debug(`Got message in Account Lookup Handler - msgName: ${message.msgName}`);
		const handlerTimerEndFn = this._histo.startTimer({ callName: "handleAccountLookUpEvent"});

		let eventToPublish = null;
		const partyId = message.payload?.partyId ?? null;
		const partyType = message.payload?.partyType ?? null;
		const currency = message.payload?.currency ?? null;
		const requesterFspId = message.payload?.requesterFspId ?? null;
		const fspiopOpaqueState = message.fspiopOpaqueState;
		const errorMessage = this.validateMessageOrGetErrorEvent(message);

		if(errorMessage){
			errorMessage.fspiopOpaqueState = message.fspiopOpaqueState;
			await this._messageProducer.send(errorMessage);
			handlerTimerEndFn({success:"false"});
			return;
		}

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
				case GetPartyQueryRejectedEvt.name:
					eventToPublish = await this.getPartyQueryRejected(message as GetPartyQueryRejectedEvt);
					break;
				default: {
					const errorMessage = `Message type has invalid format or value ${message.msgName}`;
					this._logger.error(errorMessage);
					const invalidMessageTypeErrorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
						partyId: partyId,
						requesterFspId: requesterFspId,
						errorDescription: errorMessage,
					};
					eventToPublish = new AccountLookupBCInvalidMessageTypeErrorEvent(invalidMessageTypeErrorPayload);
				}
			}
		} catch(error) {
			const errorMessage = `Error while handling message ${message.msgName}`;
			this._logger.error(errorMessage + `- ${error}`);
			const errorPayload: AccountLookUpUnknownErrorPayload = {
				partyId,
				partyType,
				currency,
				requesterFspId,
				errorDescription: errorMessage
			};
			eventToPublish = new AccountLookUpUnknownErrorEvent(errorPayload);
		}

		eventToPublish.fspiopOpaqueState = fspiopOpaqueState;
		await this._messageProducer.send(eventToPublish);
		handlerTimerEndFn({success:"true"});
	}

	//#endregion

	//#region handlePartyQueryReceivedEvt
	private async handlePartyQueryReceivedEvt(message: PartyQueryReceivedEvt):Promise<DomainEventMsg>{
		const timerEndFn = this._histo.startTimer({ callName: "handlePartyQueryReceivedEvt"});
		if(this._logger.isDebugEnabled())
			this._logger.debug(`Got PartyQueryReceivedEvt msg for partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId} - requesterFspId: ${message.payload.requesterFspId} destinationFspId: ${message.payload.destinationFspId}`);

		let destinationFspId = message.payload?.destinationFspId ?? null;
		const requesterFspId = message.payload?.requesterFspId ?? null;
		const partyType = message.payload?.partyType ?? null;
		const partyId = message.payload?.partyId ?? null;
		const currency = message.payload?.currency ?? null;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(partyId, requesterFspId);

		if(requesterParticipantError){
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			timerEndFn({success: "false"});
			return requesterParticipantError;
		}

		if(!destinationFspId){
			try{
				destinationFspId = await this.getParticipantIdFromOracle(partyId, partyType,currency);
			} catch(error:any){
				//TODO: Create error event for this
				const errorMessage = `Error while getting participantId from oracle for partyType: ${partyType} currency: ${currency} and partyId: ${partyId} - requesterFspId: ${requesterFspId}`;
				this._logger.error(errorMessage + `- ${error.message}`);
				const errorPayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
					partyId,
					partyType,
					currency,
					errorDescription: errorMessage
				};
				timerEndFn({success: "false"});
				return new AccountLookUpUnableToGetParticipantFromOracleErrorEvent(errorPayload);
			}
		}

		const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(partyId, destinationFspId);
		if(destinationParticipantError){
			this._logger.error(`Invalid participant info for destinationFspId: ${destinationFspId}`);
			timerEndFn({success: "false"});
			return destinationParticipantError;
		}

		const payload:PartyInfoRequestedEvtPayload = {
			requesterFspId: message.payload.requesterFspId,
			destinationFspId: destinationFspId,
			partyType: message.payload.partyType,
			partyId: message.payload.partyId,
			partySubType: message.payload.partySubType,
			currency: message.payload.currency
		};

		const event = new PartyInfoRequestedEvt(payload);

		timerEndFn({success: "true"});
		return event;

	}
	//#endregion

	//#region handlePartyInfoAvailableEvt
	private async handlePartyInfoAvailableEvt(message:PartyInfoAvailableEvt):Promise<DomainEventMsg>{
		const timerEndFn = this._histo.startTimer({ callName: "handlePartyInfoAvailableEvt"});
		if(this._logger.isDebugEnabled())
			this._logger.debug(`Got PartyInfoAvailableEvt msg for ownerFspId: ${message.payload.ownerFspId} partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId} - requesterFspId: ${message.payload.requesterFspId} destinationFspId: ${message.payload.destinationFspId}`);

		const partyId = message.payload.partyId ?? null;

		const requesterFspId = message.payload.requesterFspId ?? null;
		const destinationFspId = message.payload.destinationFspId ?? null;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(partyId, requesterFspId);
		if(requesterParticipantError){
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			timerEndFn({success: "false"});
			return requesterParticipantError;
		}

		const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(partyId, destinationFspId);
		if(destinationParticipantError){
			this._logger.error(`Invalid participant info for destinationFspId: ${destinationFspId}`);
			timerEndFn({success: "false"});
			return destinationParticipantError;
		}

		const payload:PartyQueryResponseEvtPayload = {
			requesterFspId: message.payload.requesterFspId,
			destinationFspId: message.payload.destinationFspId as string,
			partyDoB: message.payload.partyDoB,
			merchantClassificationCode: message.payload.merchantClassificationCode,
			name: message.payload.name,
			firstName: message.payload.firstName,
            middleName: message.payload.middleName,
            lastName: message.payload.lastName,
			ownerFspId: message.payload.ownerFspId,
			partyType: message.payload.partyType,
			partyId: message.payload.partyId,
			partySubType: message.payload.partySubType,
			currency: message.payload.currency,
		};

		const event = new PartyQueryResponseEvt(payload);

		timerEndFn({success: "true"});
		return event;
	}
	//#endregion

	//#region handleParticipantQueryReceivedEvt
	private async handleParticipantQueryReceivedEvt(message: ParticipantQueryReceivedEvt):Promise<DomainEventMsg>{
		const timerEndFn = this._histo.startTimer({ callName: "handleParticipantQueryReceivedEvt"});
		if(this._logger.isDebugEnabled())
			this._logger.debug(`Got ParticipantQueryReceivedEvt for partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId} currency: ${message.payload.currency} - requesterFspId: ${message.payload.requesterFspId}`);


		const requesterFspId = message.payload.requesterFspId;
		const partyType = message.payload.partyType;
		const partyId = message.payload.partyId;
		const partySubType = message.payload.partySubType;
		const currency = message.payload.currency;
		let ownerFspId = null;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(partyId, requesterFspId);

		if(requesterParticipantError){
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			timerEndFn({success:"false"});
			return requesterParticipantError;
		}

		try{
			ownerFspId = await this.getParticipantIdFromOracle(partyId,partyType, currency);
		}catch(error){
			//TODO: Create event for Unable to get requester Participant from oracle error
			const errorMessage = `Error while getting participantId from oracle for partyType: ${partyType} partySubType: ${partySubType} and partyId: ${partyId} - requesterFspId: ${requesterFspId}`;
			this._logger.error(errorMessage + `- ${error}`);
			//TODO: Create a new error event for this
			const errorPayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
				partyId,
				partyType,
				currency,
				errorDescription: errorMessage
			};
			timerEndFn({success:"false"});
			return new AccountLookUpUnableToGetParticipantFromOracleErrorEvent(errorPayload);
		}

		const validateDestinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(partyId, ownerFspId);

		if(validateDestinationParticipantError){
			this._logger.error(`Invalid participant info for participantId: ${ownerFspId}`);
			timerEndFn({success:"false"});
			return validateDestinationParticipantError;
		}

		const payload: ParticipantQueryResponseEvtPayload = {
			requesterFspId: message.payload.requesterFspId,
			ownerFspId: ownerFspId,
			partyType: message.payload.partyType,
			partyId: message.payload.partyId,
			partySubType: message.payload.partySubType,
			currency: message.payload.currency
		};

		const event = new ParticipantQueryResponseEvt(payload);

		timerEndFn({success:"true"});
		return event;
	}
	//#endregion

	//#region handleParticipantAssociationRequestReceivedEvt
	private async handleParticipantAssociationRequestReceivedEvt(message: ParticipantAssociationRequestReceivedEvt) :Promise<DomainEventMsg>{
		const timerEndFn = this._histo.startTimer({ callName: "handleParticipantAssociationRequestReceivedEvt"});
		if(this._logger.isDebugEnabled())
			this._logger.debug(`Got ParticipantAssociationRequestReceivedEvt for ownerFspId: ${message.payload.ownerFspId} partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId}`);

		const ownerFspId = message.payload.ownerFspId;
		const partyId = message.payload.partyId;
		const partyType = message.payload.partyType;
		const currency = message.payload.currency;
		let oracleAdapter: IOracleProviderAdapter|null = null;

		const ownerParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(partyId,ownerFspId);

		if(ownerParticipantError){
			this._logger.error(`Invalid participant info for requester fsp id: ${ownerFspId}`);
			timerEndFn({success: "false"});
			return ownerParticipantError;
		}

		try{
			oracleAdapter = await this.getOracleAdapter(partyType,currency);
		}catch(error: any){
			const errorMessage = `Error getting oracle adapter for partyType: ${partyType} and currency: ${currency}`;
			this._logger.error(errorMessage + ":" + error.message);
			const unableToGetOracleFromOracleFinderErrorPayload: AccountLookupBCUnableToGetOracleAdapterErrorPayload = {
                partyId,
                partyType,
				currency,
                errorDescription: errorMessage
            };
            const errorEvent = new AccountLookupBCUnableToGetOracleAdapterErrorEvent(unableToGetOracleFromOracleFinderErrorPayload);
			timerEndFn({success: "false"});
            return errorEvent;
		}

		try{
			await oracleAdapter.associateParticipant(ownerFspId, partyType, partyId, currency);
		}catch(error: any){
			const errorMessage = `Error associating fspId: ${ownerFspId} with party ${partyId} ${partyType}`;
			this._logger.error(errorMessage + `- ${error.message}`);
			const errorPayload: AccountLookupBCUnableToAssociateParticipantErrorPayload = {
				fspIdToAssociate: ownerFspId,
				partyType,
				partyId,
				currency,
				errorDescription: errorMessage
			};
			const errorEvent = new AccountLookupBCUnableToAssociateParticipantErrorEvent(errorPayload);
			timerEndFn({success: "false"});
			return errorEvent;
		}

		const payload : ParticipantAssociationCreatedEvtPayload = {
			partyId: message.payload.partyId,
			ownerFspId: message.payload.ownerFspId,
			partyType: message.payload.partyType,
			partySubType: message.payload.partySubType
		};

		const event = new ParticipantAssociationCreatedEvt(payload);
		timerEndFn({success: "true"});
		return event;
	}
	//#endregion

	//#region handleParticipantDisassociateRequestReceivedEvt
	private async handleParticipantDisassociateRequestReceivedEvt(msg: ParticipantDisassociateRequestReceivedEvt) :Promise<DomainEventMsg>{
		const timerEndFn = this._histo.startTimer({ callName: "handleParticipantDisassociateRequestReceivedEvt"});
		if(this._logger.isDebugEnabled())
			this._logger.debug(`Got participantDisassociationEvent msg for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId}`);

		const ownerFspId = msg.payload?.ownerFspId ?? null;
		const partyId = msg.payload?.partyId ?? null;
		const partyType = msg.payload?.partyType ?? null;
		const currency = msg.payload?.currency ?? null;
		let oracleAdapter: IOracleProviderAdapter|null = null;

		const ownerParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(partyId, ownerFspId);

		if(ownerParticipantError){
			this._logger.error(`Invalid participant info for ownerFspId: ${ownerFspId}`);
			timerEndFn({success: "false"});
			return ownerParticipantError;
		}

		try{
			oracleAdapter = await this.getOracleAdapter(partyType, currency);
		}catch(error: any){
			const errorMessage = `Error getting oracle adapter for partyType: ${partyType} and currency: ${currency}`;
			this._logger.error(errorMessage + ":" + error.message);
			const unableToGetOracleFromOracleFinderErrorPayload: AccountLookupBCUnableToGetOracleAdapterErrorPayload = {
                partyId,
                partyType,
				currency,
                errorDescription: errorMessage
            };
            const errorEvent = new AccountLookupBCUnableToGetOracleAdapterErrorEvent(unableToGetOracleFromOracleFinderErrorPayload);
			timerEndFn({success: "false"});
			return errorEvent;
		}

		try{
			await oracleAdapter.disassociateParticipant(ownerFspId,partyType,partyId,currency);
		}catch(err: unknown){
			const error = (err as Error);
			const errorMessage = `Error disassociating fspId: ${ownerFspId} with party ${partyId} ${partyType}`;
			this._logger.error(errorMessage + ` - ${error.message}`);
			const errorPayload: AccountLookupBCUnableToDisassociateParticipantErrorPayload = {
				fspIdToDisassociate: ownerFspId,
				partyId,
				partyType,
				currency,
				errorDescription: errorMessage
			};
			const errorEvent = new AccountLookupBCUnableToDisassociateParticipantErrorEvent(errorPayload);
			timerEndFn({success: "false"});
			return errorEvent;
		}

		const payload:ParticipantAssociationRemovedEvtPayload = {
			partyId: msg.payload.partyId,
			ownerFspId: msg.payload.ownerFspId,
			partyType: msg.payload.partyType,
			partySubType: msg.payload.partySubType
		};

		const event = new ParticipantAssociationRemovedEvt(payload);
		timerEndFn({success: "true"});
		return event;
	}

	//#endregion

	//#region GetPartyQueryRejectedEvt
	private async getPartyQueryRejected(message: GetPartyQueryRejectedEvt):Promise<DomainEventMsg> {
		this._logger.debug(`Got getPartyQueryRejected msg for partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId}`);

		const partyId = message.payload.partyId ?? null;

		const requesterFspId = message.payload.requesterFspId ?? null;
		const destinationFspId = message.payload.destinationFspId ?? null;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(partyId, requesterFspId);
		if(requesterParticipantError){
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			return requesterParticipantError;
		}

		const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(partyId, destinationFspId);
		if(destinationParticipantError){
			this._logger.error(`Invalid participant info for destinationFspId: ${destinationFspId}`);
			return destinationParticipantError;
		}

		const payload:GetPartyQueryRejectedResponseEvtPayload = {
			partyId: message.payload.partyId,
			partyType: message.payload.partyType,
			partySubType: message.payload.partySubType,
			currency: message.payload.currency,
			errorInformation: message.payload.errorInformation
		};

		const event = new GetPartyQueryRejectedResponseEvt(payload);

		return event;
	}
	//#endregion
	
	//#region Validations

	private validateMessageOrGetErrorEvent(message:IMessage): DomainEventMsg | null {
		const partyId = message.payload?.partyId;
		const requesterFspId = message.payload?.requesterFspId;

		if(!message.payload){
			const errorMessage = "Message payload is null or undefined";
			this._logger.error(errorMessage);
			const invalidMessageErrorPayload: AccountLookupBCInvalidMessageErrorPayload = {
				requesterFspId: requesterFspId,
				partyId: partyId,
				errorDescription: errorMessage
			};
			return new AccountLookupBCInvalidMessagePayloadErrorEvent(invalidMessageErrorPayload);
		}

		if(message.msgType !== MessageTypes.DOMAIN_EVENT){
			const errorMessage = `Message type is invalid ${message.msgType}`;
			this._logger.error(errorMessage);
			const invalidMessageTypeErrorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
				requesterFspId: requesterFspId,
				partyId: partyId,
				errorDescription: errorMessage,
			};
			return new AccountLookupBCInvalidMessageTypeErrorEvent(invalidMessageTypeErrorPayload);
		}
		return null;
	}

	private async validateDestinationParticipantInfoOrGetErrorEvent(partyId:string, participantId: string | null):Promise<DomainEventMsg | null>{
		let participant: IParticipant | null = null;

		if(!participantId){
			const errorMessage = "Fsp Id is null or undefined";
			this._logger.error(errorMessage);
			const invalidParticipantIdErrorPayload: AccountLookupBCInvalidDestinationParticipantErrorPayload = {
				partyId,
				destinationFspId:participantId,
				errorDescription: errorMessage
			};
			return new AccountLookupBCInvalidDestinationParticipantErrorEvent(invalidParticipantIdErrorPayload);
		}

		participant = await this._participantService.getParticipantInfo(participantId).catch((err: unknown) => {
			const error = (err as Error);
			this._logger.error(`Error getting participant info for participantId: ${participantId} - ${error?.message}`);
			return null;
		});

		if(!participant) {
			const errorMessage = `No participant found for fspId: ${participantId}`;
			this._logger.error(errorMessage);
			const noSuchParticipantErrorPayload: AccountLookupBCDestinationParticipantNotFoundErrorPayload = {
				partyId,
				destinationFspId: participantId,
				errorDescription: errorMessage
			};
			return new AccountLookupBCDestinationParticipantNotFoundErrorEvent(noSuchParticipantErrorPayload);
		}

		if(participant.id !== participantId){
			const errorMessage = `Participant id mismatch ${participant.id} ${participantId}`;
			this._logger.error(errorMessage);
			const invalidParticipantIdErrorPayload: AccountLookupBCInvalidDestinationParticipantErrorPayload = {
				partyId,
				destinationFspId: participantId,
				errorDescription: errorMessage
			};
			return new AccountLookupBCInvalidDestinationParticipantErrorEvent(invalidParticipantIdErrorPayload);
		}

		// TODO enable participant.isActive check once this is implemented over the participants side
		// if(!participant.isActive) {
			// 	this._logger.debug(`${participant.id} is not active`);
			// 	throw new RequiredParticipantIsNotActive();
		// }
		return null;
	}

	private async validateRequesterParticipantInfoOrGetErrorEvent(partyId:string, participantId: string | null):Promise<DomainEventMsg | null>{
		let participant: IParticipant | null = null;

		if(!participantId){
			const errorMessage = "Fsp Id is null or undefined";
			this._logger.error(errorMessage);
			return new AccountLookupBCInvalidRequesterParticipantErrorEvent({
				partyId,
				requesterFspId:participantId,
				errorDescription: errorMessage
			});
		}

		participant = await this._participantService.getParticipantInfo(participantId)
			.catch((err: unknown) => {
				const error = (err as Error);
				this._logger.error(`Error getting participant info for participantId: ${participantId} - ${error?.message}`);
				return null;
			});

		if(!participant) {
			const errorMessage = `No participant found for fspId: ${participantId}`;
			this._logger.error(errorMessage);
			return new AccountLookupBCRequesterParticipantNotFoundErrorEvent({
				requesterFspId: participantId,
				partyId,
				errorDescription: errorMessage
			});
		}

		if(participant.id !== participantId){
			const errorMessage = `Participant id mismatch ${participant.id} ${participantId}`;
			this._logger.error(errorMessage);
			return new AccountLookupBCInvalidRequesterParticipantErrorEvent({
				partyId,
				requesterFspId: participantId,
				errorDescription: errorMessage
			});
		}

		// TODO enable participant.isActive check once this is implemented over the participants side
		// if(!participant.isActive) {
			// 	this._logger.debug(`${participant.id} is not active`);
			// 	throw new RequiredParticipantIsNotActive();
		// }
		return null;
	}

	//#endregion

	//#region Oracles
	private async getOracleAdapter(partyType:string, currency:string | null): Promise<IOracleProviderAdapter> {
		const oracle = await this._oracleFinder.getOracle(partyType, currency)
			.catch(error=>{
				const errorMessage = `Unable to get oracle for partyType: ${partyType} `;
				this._logger.error(errorMessage + ` - ${error.message}`);
				throw new UnableToGetOracleFromOracleFinderError(errorMessage);
		});

		if(!oracle) {
			const errorMessage = `Oracle for ${partyType} not found`;
			this._logger.debug(errorMessage);
			throw new OracleNotFoundError(errorMessage);
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
		const timerEndFn = this._histo.startTimer({ callName: "getParticipantIdFromOracle"});

		const oracleAdapter = await this.getOracleAdapter(partyType, currency);

		const fspId = await oracleAdapter.getParticipantFspId(partyType,partyId, currency)
			.catch(error=>{
				const errorMessage = `Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} from oracle` + error?.message;
				this._logger.error(errorMessage);
				timerEndFn({success: "false"});
				throw new UnableToGetParticipantFspIdError(errorMessage);
			});

		if(!(fspId)) {
			const errorMessage = `partyId:${partyId} has no existing fspId owner in oracle`;
			this._logger.debug(errorMessage);
			timerEndFn({success: "false"});
			throw new ParticipantNotFoundError(errorMessage);
		}

		timerEndFn({success: "true"});
		return fspId;
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
			throw new OracleNotFoundError(errorMessage);
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
		for (const oracle of builtinOracles) {

			const oracleProvider = await this.getOracleAdapter(oracle.partyType, null).catch(error=>{
				const errorMessage = `Unable to get oracle provider for oracle: ${oracle.id} ` + error?.message;
				this._logger.error(errorMessage);
				throw new OracleNotFoundError(errorMessage);
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
		return await this._oracleFinder.getAllOracles();
	}

	public async getOracleById(id:string): Promise<Oracle|null> {
		return this._oracleFinder.getOracleById(id);
	}

	public async healthCheck(id:string): Promise<boolean> {
		const oracleFound =  this._oracleProvidersAdapters.find((o) => o.oracleId === id);
		if(!oracleFound) {
			const errorMessage = `Oracle does not exist for given id ${id}`;
			this._logger.error(errorMessage);
			throw new OracleNotFoundError(errorMessage);
		}
		return await oracleFound.healthCheck();
	}

	//#endregion

	//#region Account Lookup Routes
	public async getAccountLookUp(accountIdentifier: ParticipantLookup): Promise<string | null> {
		const {partyId, partyType, currency} = accountIdentifier;

		return await this.getParticipantIdFromOracle(partyId, partyType, currency).catch(error=>{
			const errorMessage = `Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} ` + error?.message;
			this._logger.error(errorMessage);

			if(error instanceof ParticipantNotFoundError){
				throw error;
			}

			throw new UnableToGetParticipantFspIdError(errorMessage);
		});
	}

	//#endregion

}
