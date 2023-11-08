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

import {
  AccountLookUpUnableToGetParticipantFromOracleErrorEvent,
  AccountLookUpUnableToGetParticipantFromOracleErrorPayload,
  AccountLookUpUnknownErrorEvent,
  AccountLookUpUnknownErrorPayload,
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
  AccountLookupBCRequiredDestinationParticipantIsNotActiveErrorEvent,
  AccountLookupBCRequiredRequesterParticipantIsNotActiveErrorEvent,
  AccountLookupBCUnableToAssociateParticipantErrorEvent,
  AccountLookupBCUnableToAssociateParticipantErrorPayload,
  AccountLookupBCUnableToDisassociateParticipantErrorEvent,
  AccountLookupBCUnableToDisassociateParticipantErrorPayload,
  AccountLookupBCUnableToGetOracleAdapterErrorEvent,
  AccountLookupBCUnableToGetOracleAdapterErrorPayload,
  GetPartyQueryRejectedEvt,
  GetPartyQueryRejectedResponseEvt,
  GetPartyQueryRejectedResponseEvtPayload,
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
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { AddOracleDTO, Association, AssociationsSearchResults, Oracle, OracleType, ParticipantLookup } from "./types";
import {
  DomainEventMsg,
  IMessage,
  IMessageProducer,
  MessageTypes,
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
  DuplicateOracleError,
  NoSuchOracleAdapterError,
  OracleNotFoundError,
  ParticipantNotFoundError,
  UnableToGetOracleAssociationsError,
  UnableToGetOracleFromOracleFinderError,
  UnableToGetParticipantFspIdError,
  UnableToRemoveOracleError,
} from "./errors";
import { IHistogram, IMetrics } from "@mojaloop/platform-shared-lib-observability-types-lib";
import {
  IOracleFinder,
  IOracleProviderAdapter,
  IOracleProviderFactory,
  IParticipantServiceAdapter,
} from "./interfaces/infrastructure";

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import { randomUUID } from "crypto";

export class AccountLookupAggregate {
	private readonly _logger: ILogger;
	private readonly _oracleFinder: IOracleFinder;
	private readonly _oracleProvidersFactory: IOracleProviderFactory;
	private readonly _messageProducer: IMessageProducer;
	private readonly _participantService: IParticipantServiceAdapter;
	private _oracleProvidersAdapters: IOracleProviderAdapter[];
	private readonly _metrics: IMetrics;
	private readonly _histogram: IHistogram;

	//#region Initialization
	constructor(
		logger: ILogger,
		oracleFinder: IOracleFinder,
		oracleProvidersFactory: IOracleProviderFactory,
		messageProducer: IMessageProducer,
		participantService: IParticipantServiceAdapter,
		metrics: IMetrics
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._oracleFinder = oracleFinder;
		this._oracleProvidersFactory = oracleProvidersFactory;
		this._messageProducer = messageProducer;
		this._participantService = participantService;
		this._oracleProvidersAdapters = [];
		this._metrics = metrics;

		this._histogram = metrics.getHistogram("AccountLookupAggregate", "AccountLookupAggregate calls", [
			"callName",
			"success",
		]);
		// this._histo = metrics.getHistogram("AccountLookupAggregate", "AccountLookupAggregate calls", ["callName", "success"], [0.01, 0.05, 0.1, 0.5, 0.75, 1, 1.5, 2]);
	}

	public get oracleProvidersAdapters(): IOracleProviderAdapter[] {
		return this._oracleProvidersAdapters.map((oracle) => {
			return { ...oracle };
		});
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
		} catch (error) {
			this._logger.fatal("Unable to initialize account lookup aggregate" + error);
			throw error;
		}
	}

	async destroy(): Promise<void> {
		try {
			await this._oracleFinder.destroy();
			for (const oracle of this._oracleProvidersAdapters) {
				await oracle.destroy();
			}
		} catch (error) {
			this._logger.fatal("Unable to destroy account lookup aggregate" + error);
			throw error;
		}
	}
	//#endregion

	//#region Event Handler

	async handleAccountLookUpEvent(message: IMessage): Promise<void> {
		/* istanbul ignore next */
		if (this._logger.isDebugEnabled()) {
			this._logger.debug(`Got message in Account Lookup Handler - msgName: ${message.msgName}`);
		}
		/* istanbul ignore next */
		const handlerTimerEndFn = this._histogram.startTimer({
			callName: "handleAccountLookUpEvent",
		});

		let eventToPublish = null;
		const partyId = message.payload?.partyId ?? null;
		const partySubType = message.payload?.partySubType ?? null;
		const partyType = message.payload?.partyType ?? null;
		const currency = message.payload?.currency ?? null;
		const requesterFspId = message.payload?.requesterFspId ?? null;
		const fspiopOpaqueState = message.fspiopOpaqueState;
		const errorMessage = this.validateMessageOrGetErrorEvent(message);

		if (errorMessage) {
			errorMessage.fspiopOpaqueState = message.fspiopOpaqueState;
			await this._messageProducer.send(errorMessage);
			/* istanbul ignore next */
			handlerTimerEndFn({ success: "false" });
			return;
		}

		try {
			switch (message.msgName) {
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
				eventToPublish = await this.handleParticipantAssociationRequestReceivedEvt(
					message as ParticipantAssociationRequestReceivedEvt
				);
				break;
				case ParticipantDisassociateRequestReceivedEvt.name:
				eventToPublish = await this.handleParticipantDisassociateRequestReceivedEvt(
					message as ParticipantDisassociateRequestReceivedEvt
				);
				break;
				case GetPartyQueryRejectedEvt.name:
				eventToPublish = await this.getPartyQueryRejected(message as GetPartyQueryRejectedEvt);
				break;
				default: {
				const errorMessage = `Message type has invalid format or value ${message.msgName}`;
				this._logger.error(errorMessage);
				const invalidMessageTypeErrorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
					partyId: partyId,
					partyType: partyType,
					partySubType: partySubType,
					requesterFspId: requesterFspId,
					errorDescription: errorMessage,
				};
				eventToPublish = new AccountLookupBCInvalidMessageTypeErrorEvent(invalidMessageTypeErrorPayload);
				}
			}
		} catch (error) {
			const errorMessage = `Unknown error while handling message ${message.msgName}`;
			this._logger.error(errorMessage, error);
			const errorPayload: AccountLookUpUnknownErrorPayload = {
				partyId,
				partyType,
				currency,
				requesterFspId,
				errorDescription: errorMessage,
			};
			eventToPublish = new AccountLookUpUnknownErrorEvent(errorPayload);
		}

		eventToPublish.fspiopOpaqueState = fspiopOpaqueState;
		await this._messageProducer.send(eventToPublish);
		handlerTimerEndFn({ success: "true" });
	}

	//#endregion

	//#region Get Participant - Where a Participant DFSP requests Participant association information based on a Party identifier, this UC is used by the switch to validate the request and provide the requested association data to the requesting DFSP.
	//#region PartyQueryReceivedEvt
	private async handlePartyQueryReceivedEvt(message: PartyQueryReceivedEvt): Promise<DomainEventMsg> {
		/* istanbul ignore next */
		const timerEndFn = this._histogram.startTimer({
			callName: "handlePartyQueryReceivedEvt",
		});

		/* istanbul ignore if */
		if (this._logger.isDebugEnabled()) {
			this._logger.debug(
				`Got PartyQueryReceivedEvt msg for partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId} - requesterFspId: ${message.payload.requesterFspId} destinationFspId: ${message.payload.destinationFspId}`
			);
		}

		let destinationFspId = message.payload?.destinationFspId ?? null;
		const requesterFspId = message.payload?.requesterFspId ?? null;
		const partyType = message.payload?.partyType ?? null;
		const partyId = message.payload?.partyId ?? null;
		const partySubType = message.payload?.partySubType ?? null;
		const currency = message.payload?.currency ?? null;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(
			partyId,
			partyType,
			partySubType,
			requesterFspId
		);

		if (requesterParticipantError) {
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			timerEndFn({ success: "false" });
			return requesterParticipantError;
		}

		if (!destinationFspId) {
			try {
				destinationFspId = await this._getParticipantIdFromOracle(partyId, partyType, partySubType, currency);
			} catch (error: any) {
				const errorMessage = error?.message;
				this._logger.error(errorMessage, error);
				const errorPayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
					partyId: partyId,
					partySubType: partySubType,
					partyType: partyType,
					currency: currency,
					errorDescription: errorMessage,
				};
				/* istanbul ignore next */
				timerEndFn({ success: "false" });
				return new AccountLookUpUnableToGetParticipantFromOracleErrorEvent(errorPayload);
			}
		}

		const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(
			partyId,
			partyType,
			partySubType,
			destinationFspId
		);

		if (destinationParticipantError) {
			this._logger.error(`Invalid participant info for destinationFspId: ${destinationFspId}`);
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return destinationParticipantError;
		}

		const payload: PartyInfoRequestedEvtPayload = {
			requesterFspId: message.payload.requesterFspId,
			destinationFspId: destinationFspId,
			partyType: message.payload.partyType,
			partyId: message.payload.partyId,
			partySubType: message.payload.partySubType,
			currency: message.payload.currency,
		};

		const event = new PartyInfoRequestedEvt(payload);
		/* istanbul ignore next */
		timerEndFn({ success: "true" });
		return event;
	}
	//#endregion
	//#endregion

	//#region Get Party - Where a participant DFSP queries another participant DFSP for the details of a Party which the second DFSP holds, this UC is used to validate the request and provide the requested Party data to the requesting DFSP.

	//#region PartyInfoAvailableEvt - 1st phase
	private async handlePartyInfoAvailableEvt(message: PartyInfoAvailableEvt): Promise<DomainEventMsg> {
		/* istanbul ignore next */
		const timerEndFn = this._histogram.startTimer({
			callName: "handlePartyInfoAvailableEvt",
		});
		/* istanbul ignore if */
		if (this._logger.isDebugEnabled()) {
			this._logger.debug(
				`Got PartyInfoAvailableEvt msg for ownerFspId: ${message.payload.ownerFspId} partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId} - requesterFspId: ${message.payload.requesterFspId} destinationFspId: ${message.payload.destinationFspId}`
			);
		}

		const partyId = message.payload.partyId ?? null;
		const partyType = message.payload.partyType ?? null;
		const partySubType = message.payload.partySubType ?? null;
		const requesterFspId = message.payload.requesterFspId ?? null;
		const destinationFspId = message.payload.destinationFspId ?? null;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(
			partyId,
			partyType,
			partySubType,
			requesterFspId
		);

		if (requesterParticipantError) {
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return requesterParticipantError;
		}

		const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(
			partyId,
			partyType,
			partySubType,
			destinationFspId
		);
		if (destinationParticipantError) {
			this._logger.error(`Invalid participant info for destinationFspId: ${destinationFspId}`);
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return destinationParticipantError;
		}

		const payload: PartyQueryResponseEvtPayload = {
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
		/* istanbul ignore next */
		timerEndFn({ success: "true" });
		return event;
	}
	//#endregion

	//#region ParticipantQueryReceivedEvt - 2nd phase
	private async handleParticipantQueryReceivedEvt(message: ParticipantQueryReceivedEvt): Promise<DomainEventMsg> {
		/* istanbul ignore next */
		const timerEndFn = this._histogram.startTimer({
			callName: "handleParticipantQueryReceivedEvt",
		});
		/* istanbul ignore if */
		if (this._logger.isDebugEnabled()) {
			this._logger.debug(
				`Got ParticipantQueryReceivedEvt for partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId} currency: ${message.payload.currency} - requesterFspId: ${message.payload.requesterFspId}`
			);
		}

		const requesterFspId = message.payload.requesterFspId;
		const partyType = message.payload.partyType;
		const partyId = message.payload.partyId;
		const partySubType = message.payload.partySubType;
		const currency = message.payload.currency;
		let ownerFspId = null;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(
			partyId,
			partyType,
			partySubType,
			requesterFspId
		);

		if (requesterParticipantError) {
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return requesterParticipantError;
		}

		try {
			ownerFspId = await this._getParticipantIdFromOracle(partyId, partyType, partySubType, currency);
		} catch (error: any) {
			const errorMessage = error?.message;
			this._logger.error(errorMessage, error);
			//TODO:Replace by owner error
			const errorPayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
				partyId: partyId,
				partySubType: partySubType,
				partyType: partyType,
				currency: currency,
				errorDescription: errorMessage,
			};
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return new AccountLookUpUnableToGetParticipantFromOracleErrorEvent(errorPayload);
		}

		const validateDestinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(
			partyId,
			partyType,
			partySubType,
			ownerFspId
		);

		if (validateDestinationParticipantError) {
			this._logger.error(`Invalid participant info for participantId: ${ownerFspId}`);
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return validateDestinationParticipantError;
		}

		const payload: ParticipantQueryResponseEvtPayload = {
			requesterFspId: message.payload.requesterFspId,
			ownerFspId: ownerFspId,
			partyType: message.payload.partyType,
			partyId: message.payload.partyId,
			partySubType: message.payload.partySubType,
			currency: message.payload.currency,
		};

		const event = new ParticipantQueryResponseEvt(payload);
		/* istanbul ignore next */
		timerEndFn({ success: "true" });
		return event;
	}
	//#endregion
	//#endregion

	//#region Get Party Error
	private async getPartyQueryRejected(message: GetPartyQueryRejectedEvt): Promise<DomainEventMsg> {
		/* istanbul ignore next */
		const timerEndFn = this._histogram.startTimer({
			callName: "handlePartyQueryReceivedEvt",
		});

		/* istanbul ignore if */
		if (this._logger.isDebugEnabled()) {
			this._logger.debug(
				`Got getPartyQueryRejected msg for partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId}`
			);
		}

		const partyId = message.payload.partyId ?? null;
		const partyType = message.payload.partyType ?? null;
		const partySubType = message.payload.partySubType ?? null;
		const requesterFspId = message.payload.requesterFspId ?? null;
		const destinationFspId = message.payload.destinationFspId ?? null;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(
			partyId,
			partyType,
			partySubType,
			requesterFspId
		);
		if (requesterParticipantError) {
			this._logger.error(`Invalid participant info for requesterFspId: ${requesterFspId}`);
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return requesterParticipantError;
		}

		const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(
			partyId,
			partyType,
			partySubType,
			destinationFspId
		);
		if (destinationParticipantError) {
			this._logger.error(`Invalid participant info for destinationFspId: ${destinationFspId}`);
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return destinationParticipantError;
		}

		const payload: GetPartyQueryRejectedResponseEvtPayload = {
			partyId: message.payload.partyId,
			partyType: message.payload.partyType,
			partySubType: message.payload.partySubType,
			currency: message.payload.currency,
			errorInformation: message.payload.errorInformation,
		};

		const event = new GetPartyQueryRejectedResponseEvt(payload);
		/* istanbul ignore next */
		timerEndFn({ success: "true" });

		return event;
	}
	//#endregion

	//#region ParticipantAssociationRequestReceivedEvt
	private async handleParticipantAssociationRequestReceivedEvt(message: ParticipantAssociationRequestReceivedEvt): Promise<DomainEventMsg> {
		/* istanbul ignore next */
		const timerEndFn = this._histogram.startTimer({
			callName: "handleParticipantAssociationRequestReceivedEvt",
		});
		/* istanbul ignore if */
		if (this._logger.isDebugEnabled()) {
			this._logger.debug(
				`Got ParticipantAssociationRequestReceivedEvt for ownerFspId: ${message.payload.ownerFspId} partyType: ${message.payload.partyType} partySubType: ${message.payload.partySubType} and partyId: ${message.payload.partyId}`
			);
		}

		const ownerFspId = message.payload.ownerFspId;
		const partyId = message.payload.partyId;
		const partySubType = message.payload.partySubType;
		const partyType = message.payload.partyType;
		const currency = message.payload.currency;
		let oracleAdapter: IOracleProviderAdapter | null = null;

		const ownerParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(
			partyId,
			partyType,
			partySubType,
			ownerFspId
		);

		if (ownerParticipantError) {
			this._logger.error(`Invalid participant info for requester fsp id: ${ownerFspId}`);
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return ownerParticipantError;
		}

		try {
			oracleAdapter = await this.getOracleAdapter(partyType, currency);
		} catch (error: any) {
			const errorMessage = error?.message;
			this._logger.error(errorMessage, error);
			const unableToGetOracleFromOracleFinderErrorPayload: AccountLookupBCUnableToGetOracleAdapterErrorPayload = {
				partyId,
				partyType,
				currency,
				errorDescription: errorMessage,
			};
			const errorEvent = new AccountLookupBCUnableToGetOracleAdapterErrorEvent(
				unableToGetOracleFromOracleFinderErrorPayload
			);
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return errorEvent;
		}

		try {
			await oracleAdapter.associateParticipant(ownerFspId, partyType, partyId, partySubType, currency);
		} catch (error: any) {
			const errorMessage = `Error associating fspId: ${ownerFspId} with party ${partyId} ${partyType}`;
			this._logger.error(errorMessage, error);
			const errorPayload: AccountLookupBCUnableToAssociateParticipantErrorPayload = {
				fspIdToAssociate: ownerFspId,
				partyType,
				partyId,
				currency,
				errorDescription: errorMessage,
			};
			const errorEvent = new AccountLookupBCUnableToAssociateParticipantErrorEvent(errorPayload);
			timerEndFn({ success: "false" });
			return errorEvent;
		}

		const payload: ParticipantAssociationCreatedEvtPayload = {
			partyId: message.payload.partyId,
			ownerFspId: message.payload.ownerFspId,
			partyType: message.payload.partyType,
			partySubType: message.payload.partySubType
		};

		const event = new ParticipantAssociationCreatedEvt(payload);
		/* istanbul ignore next */
		timerEndFn({ success: "true" });
		return event;
	}
	//#endregion

	//#region ParticipantDisassociateRequestReceivedEvt
	private async handleParticipantDisassociateRequestReceivedEvt(
		msg: ParticipantDisassociateRequestReceivedEvt
	): Promise<DomainEventMsg> {
		/* istanbul ignore next */
		const timerEndFn = this._histogram.startTimer({
			callName: "handleParticipantDisassociateRequestReceivedEvt",
		});
		/* istanbul ignore if */
		if (this._logger.isDebugEnabled()) {
			this._logger.debug(
				`Got participantDisassociationEvent msg for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId}`
			);
		}

		const ownerFspId = msg.payload?.ownerFspId ?? null;
		const partyId = msg.payload?.partyId ?? null;
		const partyType = msg.payload?.partyType ?? null;
		const partySubType = msg.payload?.partySubType ?? null;
		const currency = msg.payload?.currency ?? null;
		let oracleAdapter: IOracleProviderAdapter | null = null;

		const ownerParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(
			partyId,
			partyType,
			partySubType,
			ownerFspId
		);

		if (ownerParticipantError) {
			this._logger.error(`Invalid participant info for ownerFspId: ${ownerFspId}`);
			timerEndFn({ success: "false" });
			return ownerParticipantError;
		}

		try {
			oracleAdapter = await this.getOracleAdapter(partyType, currency);
		} catch (error: any) {
			const errorMessage = error?.message;
			this._logger.error(errorMessage, error.message);
			const unableToGetOracleFromOracleFinderErrorPayload: AccountLookupBCUnableToGetOracleAdapterErrorPayload = {
				partyId,
				partyType,
				currency,
				errorDescription: errorMessage,
			};
			const errorEvent = new AccountLookupBCUnableToGetOracleAdapterErrorEvent(
				unableToGetOracleFromOracleFinderErrorPayload
			);
			/* istanbul ignore next */
			timerEndFn({ success: "false" });
			return errorEvent;
		}

		try {
			await oracleAdapter.disassociateParticipant(ownerFspId, partyType, partyId, partySubType, currency);
		} catch (error: any) {
			const errorMessage = `Error disassociating fspId: ${ownerFspId} with party ${partyId} ${partyType}`;
			this._logger.error(errorMessage, error);
			const errorPayload: AccountLookupBCUnableToDisassociateParticipantErrorPayload = {
				fspIdToDisassociate: ownerFspId,
				partyId,
				partyType,
				currency,
				errorDescription: errorMessage,
			};
			const errorEvent = new AccountLookupBCUnableToDisassociateParticipantErrorEvent(errorPayload);
			timerEndFn({ success: "false" });
			return errorEvent;
		}

		const payload: ParticipantAssociationRemovedEvtPayload = {
			partyId: msg.payload.partyId,
			ownerFspId: msg.payload.ownerFspId,
			partyType: msg.payload.partyType,
			partySubType: msg.payload.partySubType,
		};

		const event = new ParticipantAssociationRemovedEvt(payload);
		/* istanbul ignore next */
		timerEndFn({ success: "true" });
		return event;
	}

	//#endregion
	//#endregion

	//#region Validations

	private validateMessageOrGetErrorEvent(message: IMessage): DomainEventMsg | null {
		const partyId = message.payload?.partyId ?? null;
		const partyType = message.payload?.partyType ?? null;
		const partySubType = message.payload?.partySubType ?? null;
		const requesterFspId = message.payload?.requesterFspId ?? null;

		if (!message.payload) {
			const errorMessage = "Message payload is null or undefined";
			this._logger.error(errorMessage);
			const invalidMessageErrorPayload: AccountLookupBCInvalidMessageErrorPayload = {
				requesterFspId: requesterFspId,
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				errorDescription: errorMessage,
			};
			return new AccountLookupBCInvalidMessagePayloadErrorEvent(invalidMessageErrorPayload);
		}

		if (message.msgType !== MessageTypes.DOMAIN_EVENT) {
			const errorMessage = `Message type is invalid ${message.msgType}`;
			this._logger.error(errorMessage);
			const invalidMessageTypeErrorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
				requesterFspId: requesterFspId,
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				errorDescription: errorMessage,
			};
			return new AccountLookupBCInvalidMessageTypeErrorEvent(invalidMessageTypeErrorPayload);
		}
		return null;
	}

	private async validateDestinationParticipantInfoOrGetErrorEvent(
		partyId: string,
		partyType: string,
		partySubType: string | null,
		participantId: string | null
	): Promise<DomainEventMsg | null> {
		let participant: IParticipant | null = null;

		if (!participantId) {
			const errorMessage = "Destination FspId is null or undefined";
			this._logger.error(errorMessage);
			const invalidParticipantIdErrorPayload: AccountLookupBCInvalidDestinationParticipantErrorPayload = {
				partyId: partyId,
				partySubType: partySubType,
				partyType: partyType,
				destinationFspId: participantId,
				errorDescription: errorMessage,
			};
			return new AccountLookupBCInvalidDestinationParticipantErrorEvent(invalidParticipantIdErrorPayload);
		}

		try {
			participant = await this._participantService.getParticipantInfo(participantId);
		} catch (error: any) {
			const errorMessage = `Error getting destination participant info for participantId: ${participantId}`;
			this._logger.error(errorMessage, error?.message);
			const invalidParticipantIdErrorPayload: AccountLookupBCInvalidDestinationParticipantErrorPayload = {
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				destinationFspId: participantId,
				errorDescription: errorMessage,
			};

			return new AccountLookupBCInvalidDestinationParticipantErrorEvent(invalidParticipantIdErrorPayload);
		}

		if (!participant) {
			const errorMessage = `No destination participant found for fspId: ${participantId}`;
			this._logger.error(errorMessage);
			const noSuchParticipantErrorPayload: AccountLookupBCDestinationParticipantNotFoundErrorPayload = {
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				destinationFspId: participantId,
				errorDescription: errorMessage,
			};
			return new AccountLookupBCDestinationParticipantNotFoundErrorEvent(noSuchParticipantErrorPayload);
		}

		if (participant.id !== participantId) {
			const errorMessage = `Participant id mismatch ${participant.id} ${participantId}`;
			this._logger.error(errorMessage);
			const invalidParticipantIdErrorPayload: AccountLookupBCInvalidDestinationParticipantErrorPayload = {
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				destinationFspId: participantId,
				errorDescription: errorMessage,
			};
			return new AccountLookupBCInvalidDestinationParticipantErrorEvent(invalidParticipantIdErrorPayload);
		}

		if (!participant.isActive) {
			const errorMessage = `${participant.id} is not active`;
			this._logger.error(errorMessage);

			return new AccountLookupBCRequiredDestinationParticipantIsNotActiveErrorEvent({
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				destinationFspId: participantId,
				errorDescription: errorMessage,
			});
		}
		return null;
	}

	private async validateRequesterParticipantInfoOrGetErrorEvent(
		partyId: string,
		partyType: string,
		partySubType: string | null,
		participantId: string | null
	): Promise<DomainEventMsg | null> {
		let participant: IParticipant | null = null;

		if (!participantId) {
			const errorMessage = "Requester FspId is null or undefined";
			this._logger.error(errorMessage);
			return new AccountLookupBCInvalidRequesterParticipantErrorEvent({
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				requesterFspId: participantId,
				errorDescription: errorMessage,
			});
		}

		try {
			participant = await this._participantService.getParticipantInfo(participantId);
		} catch (error: any) {
			const errorMessage = `Error getting requester participant info for participantId: ${participantId}`;
			this._logger.error(errorMessage, error?.message);
			return new AccountLookupBCInvalidRequesterParticipantErrorEvent({
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				requesterFspId: participantId,
				errorDescription: errorMessage,
			});
		}

		if (!participant) {
			const errorMessage = `No requester participant found for fspId: ${participantId}`;
			this._logger.error(errorMessage);
			return new AccountLookupBCRequesterParticipantNotFoundErrorEvent({
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				requesterFspId: participantId,
				errorDescription: errorMessage,
			});
		}

		if (participant.id !== participantId) {
			const errorMessage = `Requester Participant id mismatch ${participant.id} ${participantId}`;
			this._logger.error(errorMessage);
			return new AccountLookupBCInvalidRequesterParticipantErrorEvent({
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				requesterFspId: participantId,
				errorDescription: errorMessage,
			});
		}

		if (!participant.isActive) {
			const errorMessage = `${participant.id} is not active`;
			this._logger.error(errorMessage);
			
			return new AccountLookupBCRequiredRequesterParticipantIsNotActiveErrorEvent({
				partyId: partyId,
				partyType: partyType,
				partySubType: partySubType,
				requesterFspId: participantId,
				errorDescription: errorMessage,
			});
		}
		return null;
	}

	//#endregion

	//#region Oracles
	private async getOracleAdapter(partyType: string, currency: string | null): Promise<IOracleProviderAdapter> {
		let oracle: Oracle | null = null;

		try {
			oracle = await this._oracleFinder.getOracle(partyType, currency);
		} catch (error: any) {
			const errorMessage = `Unable to get oracle for partyType: ${partyType} and currency: ${
				currency ?? "Not Provided"
			}`;
			this._logger.error(errorMessage, error?.message);
			throw new UnableToGetOracleFromOracleFinderError(errorMessage);
		}

		if (!oracle) {
			const errorMessage = `Oracle for partyType: ${partyType} and currency: ${currency ?? "Not Provided"} not found`;
			this._logger.debug(errorMessage);
			throw new OracleNotFoundError(errorMessage);
		}

		const oracleAdapter = this._oracleProvidersAdapters.find((adapter) => adapter.oracleId === oracle?.id);

		if (!oracleAdapter) {
			const errorMessage = `Oracle adapter for ${partyType} and id: ${oracle.id} not present in oracle list`;
			this._logger.debug(errorMessage);
			throw new NoSuchOracleAdapterError(errorMessage);
		}

		return oracleAdapter;
	}

	private async _getParticipantIdFromOracle(
		partyId: string,
		partyType: string,
		partySubType: string | null,
		currency: string | null
	): Promise<string> {
		/* istanbul ignore next */
		const timerEndFn = this._histogram.startTimer({
			callName: "getParticipantIdFromOracle",
		});
		const oracleAdapter = await this.getOracleAdapter(partyType, currency);
		let fspId: string | null = null;

		try {
			fspId = await oracleAdapter.getParticipantFspId(partyType, partyId, partySubType, currency);
		} catch (error: any) {
			const errorMessage = `Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} from oracle`;
			this._logger.error(errorMessage, error?.message);
			timerEndFn({ success: "false" });
			throw new UnableToGetParticipantFspIdError(errorMessage);
		}

		if (!fspId) {
			const errorMessage = `PartyId:${partyId} has no fspId associated in oracle`;
			this._logger.error(errorMessage);
			timerEndFn({ success: "false" });
			throw new ParticipantNotFoundError(errorMessage);
		}
		/* istanbul ignore next */
		timerEndFn({ success: "true" });
		return fspId;
	}

	//#endregion

	//#region Oracle Admin Routes
	public async addOracle(oracle: AddOracleDTO): Promise<string> {
		if (oracle.id && (await this._oracleFinder.getOracleById(oracle.id))) {
			const errorMessage = `Oracle with id ${oracle.id} already exists`;
			this._logger.error(errorMessage);
			throw new DuplicateOracleError(errorMessage);
		}

		if (!oracle.id) {
			oracle.id = randomUUID();
		}

		if (await this._oracleFinder.getOracleByName(oracle.name)) {
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
		if (!oracle) {
			const errorMessage = `Oracle does not exist for given id ${id}`;
			this._logger.error(errorMessage);
			throw new OracleNotFoundError(errorMessage);
		}

		await this._oracleFinder.removeOracle(id).catch((error) => {
			const errorMessage = `Unable to remove oracle with id ${id} ` + error?.message;
			this._logger.error(errorMessage);
			throw new UnableToRemoveOracleError(errorMessage);
		});

		this._oracleProvidersAdapters = this._oracleProvidersAdapters.filter((o) => o.oracleId !== id);
	}

	public async getBuiltInOracleAssociations(): Promise<Association[]> {
		const oracles = await this._oracleFinder.getAllOracles();
		const oracleType: OracleType = "builtin";
		const builtinOracles = oracles.filter((o) => o.type === oracleType);

		let associations: Association[] = [];
		for (const oracle of builtinOracles) {
			const oracleProvider = await this.getOracleAdapter(oracle.partyType, oracle.currency).catch((error) => {
				const errorMessage = `Unable to get oracle provider for oracle: ${oracle.id} ` + error?.message;
				this._logger.error(errorMessage);
				throw new OracleNotFoundError(errorMessage);
			});

			associations = await oracleProvider.getAllAssociations().catch((error) => {
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

	public async getOracleById(id: string): Promise<Oracle | null> {
		return this._oracleFinder.getOracleById(id);
	}

	public async healthCheck(id: string): Promise<boolean> {
		const oracleFound = this._oracleProvidersAdapters.find((o) => o.oracleId === id);
		if (!oracleFound) {
			const errorMessage = `Oracle does not exist for given id ${id}`;
			this._logger.error(errorMessage);
			throw new OracleNotFoundError(errorMessage);
		}
		return await oracleFound.healthCheck();
	}

	public async getAllOracleAssociations(
		fspId:string|null,
		partyId:string|null,
        partyType:string|null,
        partySubType:string|null,
        currency:string|null,
		pageIndex?:number,
		pageSize?: number
	): Promise<AssociationsSearchResults> {
		const oracles = await this._oracleFinder.getAllOracles();

		let associations:any = [];
		for (const oracle of oracles) {
			const oracleProvider = await this.getOracleAdapter(oracle.partyType, oracle.currency).catch((error) => {
				const errorMessage = `Unable to get oracle provider for oracle: ${oracle.id} ` + error?.message;
				this._logger.error(errorMessage);
				throw new OracleNotFoundError(errorMessage);
			});

			associations = await oracleProvider.searchAssociations(
				fspId,
				partyId,
                partyType,
                partySubType,
                currency,
				pageIndex,
				pageSize
			).catch((error) => {
				const errorMessage = `Unable to get oracle associations for oracle: ${oracle.id} ` + error?.message;
				this._logger.error(errorMessage);
				throw new UnableToGetOracleAssociationsError(errorMessage);
			});
		}

		return associations;
	}

	async getSearchKeywords():Promise<{fieldName:string, distinctTerms:string[]}[]>{
		const oracles = await this._oracleFinder.getAllOracles();

		let part:{fieldName:string, distinctTerms:string[]}[] = [];
		for (const oracle of oracles) {
			const oracleProvider = await this.getOracleAdapter(oracle.partyType, oracle.currency).catch((error) => {
				const errorMessage = `Unable to get oracle provider for oracle: ${oracle.id} ` + error?.message;
				this._logger.error(errorMessage);
				throw new OracleNotFoundError(errorMessage);
			});

			part = await oracleProvider.getSearchKeywords().catch((error) => {
				const errorMessage = `Unable to get oracle search keywords for oracle: ${oracle.id} ` + error?.message;
				this._logger.error(errorMessage);
				throw new UnableToGetOracleAssociationsError(errorMessage);
			});
		}

		return part.flat();
	}
	//#endregion

	//#region Account Lookup Routes
	public async getAccountLookUp(accountIdentifier: ParticipantLookup): Promise<string | null> {
		const { partyId, partyType, partySubType, currency } = accountIdentifier;

		return await this._getParticipantIdFromOracle(partyId, partyType, partySubType, currency).catch((error) => {
			const errorMessage = `Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency}`;
			this._logger.error(errorMessage, error?.message);

			if (error instanceof ParticipantNotFoundError) {
				throw error;
			}

			throw new UnableToGetParticipantFspIdError(errorMessage);
		});
	}
	//#endregion
}
