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
import { DomainEventMsg, IMessage, IMessageProducer, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
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
	UnableToGetOracleAssociationsError,
	UnableToGetOracleFromOracleFinderError,
	UnableToGetParticipantFspIdError,
	UnableToProcessMessageError
} from "./errors";
import { IOracleFinder, IOracleProviderAdapter, IOracleProviderFactory, IParticipantService} from "./interfaces/infrastructure";
import { AccountLookUpUnknownErrorEvent, AccountLookupBCInvalidMessagePayloadErrorEvent, AccountLookupBCInvalidMessageTypeErrorEvent, AccountLookupBCInvalidMessageTypeErrorPayload, AccountLookupBCInvalidParticipantIdErrorEvent, AccountLookupBCNoSuchOracleAdapterErrorEvent, AccountLookupBCNoSuchOracleErrorEvent, AccountLookupBCNoSuchParticipantErrorEvent, AccountLookupBCNoSuchParticipantFspIdErrorEvent, AccountLookupBCUnableToAssociateParticipantErrorEvent, AccountLookupBCUnableToDisassociateParticipantErrorEvent, AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent, AccountLookupBCUnableToGetParticipantFspIdErrorEvent, AccountLookupErrorPayload } from "@mojaloop/platform-shared-lib-public-messages-lib";
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
				this.validateMessage(message)
			}
			catch(error: any) {
				this._logger.error("Invalid message received: " + error.message);
				eventToPublish = this.createErrorEvent(message, error);
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
				default:
					const errorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
						partyId: message.payload?.partyId || null,
						partySubType: message.payload?.partySubType || null,
						partyType: message.payload?.partyType || null,
						requesterFspId: message.payload?.requesterFspId || null,
					};
					eventToPublish = new AccountLookupBCInvalidMessageTypeErrorEvent(errorPayload);
					eventToPublish.fspiopOpaqueState = message.fspiopOpaqueState;
					this._logger.error(`message type has invalid format or value ${message.msgName}`);
			}

			await this._messageProducer.send(eventToPublish);
	}

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

	private async handlePartyQueryReceivedEvt(msg: PartyQueryReceivedEvt):Promise<PartyInfoRequestedEvt>{
		this._logger.debug(`Got getPartyEvent msg for partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId} - requesterFspId: ${msg.payload.requesterFspId} destinationFspId: ${msg.payload.destinationFspId}`);
		let destinationFspIdToUse = msg.payload.destinationFspId;

		try{
			await this.validateParticipant(msg.payload.requesterFspId);
		}
		catch(error:any){
			return this.createErrorEvent(msg, error) as any;
		};

		if(!destinationFspIdToUse){
			try{
				destinationFspIdToUse = await this.getParticipantIdFromOracle(msg.payload.partyId, msg.payload.partyType, msg.payload.currency)
			}
			catch(error:any){
				return this.createErrorEvent(msg, error) as any;
			};
		}

		try{
			await this.validateParticipant(destinationFspIdToUse);
		}
		catch(error:any){
			return this.createErrorEvent(msg, error) as any;
		};

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

		const participantId = await this.getParticipantIdFromOracle(msg.payload.partyId, msg.payload.partyType, msg.payload.currency);

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

		event.fspiopOpaqueState = msg.fspiopOpaqueState;

		return event;
	}

	private async handleParticipantAssociationRequestReceivedEvt(msg: ParticipantAssociationRequestReceivedEvt):Promise<ParticipantAssociationCreatedEvt>{
		this._logger.debug(`Got participantAssociationEvent msg for ownerFspId: ${msg.payload.ownerFspId} partyType: ${msg.payload.partyType} partySubType: ${msg.payload.partySubType} and partyId: ${msg.payload.partyId}`);
		await this.validateParticipant(msg.payload.ownerFspId);

		const oracleProvider = await this.getOracleAdapter(msg.payload.partyType);

		await oracleProvider.associateParticipant(msg.payload.ownerFspId, msg.payload.partyType, msg.payload.partyId, msg.payload.currency).catch(error=>{
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

		const oracleProvider = await this.getOracleAdapter(msg.payload.partyType);

		await oracleProvider.disassociateParticipant(msg.payload.ownerFspId, msg.payload.partyType, msg.payload.partyId, msg.payload.currency).catch(error=>{
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

		event.fspiopOpaqueState = msg.fspiopOpaqueState;

		return event;

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
				this._logger.error(`Unable to get oracle for partyType: ${partyType} ` + error);
				throw new UnableToGetOracleFromOracleFinderError();
		});

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



	private async getParticipantIdFromOracle(partyId:string, partyType:string, currency:string | null): Promise<string> {
		const oracleAdapter = await this.getOracleAdapter(partyType);

		const fspId = await oracleAdapter.getParticipantFspId(partyType,partyId, currency)
			.catch(error=>{
				this._logger.error(`getParticipantFspId - Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} ` + error);
				throw new UnableToGetParticipantFspIdError();
			});

		if(!(fspId)) {
			this._logger.debug(`partyId:${partyId} has no existing fspId owner`);
			throw new NoSuchParticipantFspIdError();
		}

		return fspId;
	}
	// #endregion

	//#region Error Events

	public createErrorEvent(message:IMessage, error: Error): IMessage {
        const errorMessage = error.message;
        const partyId = message.payload?.partyId || null;
        const partyType = message.payload?.partyType || null;
        const partySubType = message.payload?.partySubType || null;
        const requesterFspId = message.payload?.requesterFspId || null;
        const sourceEvent = message.msgName;

        let errorEvent: DomainEventMsg;

        switch(error.constructor.name){
            case InvalidMessagePayloadError.name:
                errorEvent = new AccountLookupBCInvalidMessagePayloadErrorEvent(errorPayload);
                return errorEvent;
            case InvalidMessageTypeError.name:
                errorEvent = new AccountLookupBCInvalidMessageTypeErrorEvent(errorPayload);
                return errorEvent;
            case UnableToAssociateParticipantError.name:
                errorEvent = new AccountLookupBCUnableToAssociateParticipantErrorEvent(errorPayload);
                return errorEvent;
            case UnableToDisassociateParticipantError.name:
                errorEvent = new AccountLookupBCUnableToDisassociateParticipantErrorEvent(errorPayload);
                return errorEvent;
            case NoSuchParticipantError.name:
                errorEvent = new AccountLookupBCNoSuchParticipantErrorEvent(errorPayload);
                return errorEvent;
            case InvalidParticipantIdError.name:
                errorEvent = new AccountLookupBCInvalidParticipantIdErrorEvent(errorPayload);
                return errorEvent;
            case UnableToGetOracleFromOracleFinderError.name:
                errorEvent = new AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent(errorPayload);
                return errorEvent;
            case NoSuchOracleError.name:
                errorEvent = new  AccountLookupBCNoSuchOracleErrorEvent(errorPayload);
                return errorEvent;
            case NoSuchOracleAdapterError.name:
                errorEvent = new AccountLookupBCNoSuchOracleAdapterErrorEvent(errorPayload);
                return errorEvent;
            case UnableToGetParticipantFspIdError.name:
                errorEvent = new AccountLookupBCUnableToGetParticipantFspIdErrorEvent(errorPayload);
                return errorEvent;
            case NoSuchParticipantFspIdError.name:
                errorEvent = new AccountLookupBCNoSuchParticipantFspIdErrorEvent(errorPayload);
                return errorEvent;
            default:
                errorEvent = new AccountLookUpUnknownErrorEvent(errorPayload);
                return errorEvent;
        }
    }

	//#endregion

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

	public async getBuiltInOracleAssociations(): Promise<Association[]> {
		const oracles = await this._oracleFinder.getAllOracles();
		const builtInOracleType: OracleType = "builtin";
		const builtinOracles = oracles.filter((o) => o.type === builtInOracleType);

		let associations: Association[] = [];
		for await (const oracle of builtinOracles) {
			const oracleProvider = await this.getOracleAdapter(oracle.partyType);
			associations = await oracleProvider.getAllAssociations().catch(error=>{
				this._logger.error(`Unable to get oracle associations for oracle: ${oracle.id} ` + error);
				throw new UnableToGetOracleAssociationsError();
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
			throw new NoSuchOracleError();
		}
		return await oracleFound.healthCheck();
	}

	//#endregion

	//#region Account Lookup Routes
	public async getAccountLookUp(accountIdentifier: ParticipantLookup): Promise<string | null> {
		const {partyId, partyType, currency} = accountIdentifier;

		const fspId = await this.getParticipantIdFromOracle(partyId, partyType, currency).catch(error=>{
			this._logger.error(`getAccountLookUp - Unable to get participant fspId for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} ` + error);
			throw new UnableToGetParticipantFspIdError();
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
