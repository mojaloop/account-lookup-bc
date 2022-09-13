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
import EventEmitter from "events";
import { GetParticipantError, GetPartyError, NoSuchParticipantError, NoSuchParticipantFspIdError, NoSuchPartyError, UnableToAssociateParticipantError, UnableToAssociatePartyError, UnableToDisassociateParticipantError, UnableToDisassociatePartyError, UnableToGetOracleError, UnableToGetOracleProviderError } from "./errors";
import { IOracleFinder, IOracleProvider, IParticipantService} from "./interfaces/infrastructure";
import { AccountLookUpEventsType, IAccountLookUpMessage, IParticipant, IParty } from "./types";

export class AccountLookupAggregate  {
	private readonly _logger: ILogger;
    private readonly _oracleFinder: IOracleFinder;
	private readonly _oracleProviders: IOracleProvider[];
    private readonly _messageProducer: IMessageProducer;
    private readonly _participantService: IParticipantService;
    private readonly _accountLookUpEventEmitter: EventEmitter;
    

	constructor(
		logger: ILogger,
        oracleFinder:IOracleFinder,
        oracleProviders:IOracleProvider[],
        messagePublisher:IMessageProducer,
        participantService: IParticipantService
	) {
        this._logger = logger;
		this._oracleFinder = oracleFinder;
		this._oracleProviders = oracleProviders;
        this._messageProducer = messagePublisher;
        this._participantService = participantService;
        this._accountLookUpEventEmitter = new EventEmitter();
    }

    async init(): Promise<void> {
		try {
            this._oracleFinder.init();
            this._logger.debug("Oracle finder initialized");
            for await (const oracle of this._oracleProviders) {
                await oracle.init();
                this._logger.debug("Oracle provider initialized with id" + oracle.id);
            }
            this.setAccountLookUpEvents();
            // this.messagePublisher.init()
		} catch (error: unknown) {
			this._logger.fatal("Unable to intialize account lookup aggregate" + error);
			throw error;
		}
	}


    publishAccountLookUpEvent(message:IAccountLookUpMessage): void {
        
        if(!message.value){
            this._logger.error(`AccountLookUpEventHandler: publishAccountLookUpEvent: message as an invalid format or value`);
            return;
        }


        if(! Object.values(AccountLookUpEventsType).some(event => event === message?.value?.type)){
            this._logger.error(`AccountLookUpEventHandler: publishAccountLookUpEvent: message type ${message.value.type} is not a valid event type`);
            return;
        }
        
        this._accountLookUpEventEmitter.emit(message.value.type,message.value.payload);
    }

    async destroy(): Promise<void> {
        try{
		await this._oracleFinder.destroy();
        for await (const oracle of this._oracleProviders) {
            oracle.destroy();
        }
        this._accountLookUpEventEmitter.removeAllListeners();
        }
        catch(error){
            this._logger.fatal("Unable to destroy account lookup aggregate" + error);
            throw error;
        }
	}


    //Private methods.

    private setAccountLookUpEvents():void {
        this._accountLookUpEventEmitter.on(AccountLookUpEventsType.GetPartyById, async (payload: { requesterParticipantId:string, partyId:string, partyType:string, partySubType?:string }) => {
            await this.getPartyById(payload.requesterParticipantId, payload.partyId, payload.partyType, payload.partySubType)
            .catch(err => {
                this._logger.error(`${AccountLookUpEventsType.GetPartyById}: ${err}`);
            });
        });

        this._accountLookUpEventEmitter.on(AccountLookUpEventsType.GetParticipantByPartyType, async (payload: { sourceFspId: string, partyIdType: string, partyId: string, partySubType:string, destinationFspId?:string, currency?:string}) => {
            await this.getParticipantByPartyType(payload.sourceFspId, payload.partyIdType, payload.partyId, payload.partySubType, payload.destinationFspId, payload.currency)
            .catch(err => {
                this._logger.error(`${AccountLookUpEventsType.GetParticipantByPartyType}: ${err}`);
            });
        });
        this._accountLookUpEventEmitter.on(AccountLookUpEventsType.AssociateParty, async (payload: { requesterParticipantId:string, partyId:string, partyType:string, partySubType?:string }) => {
            await this.associateParty(payload.partyType, payload.partyId, payload.partyType, payload.partySubType)
            .catch(err => {
                this._logger.error(`${AccountLookUpEventsType.AssociateParty}: ${err}`);
            });
        });
        this._accountLookUpEventEmitter.on(AccountLookUpEventsType.DisassociateParty, async (payload: { requesterParticipantId:string, partyId:string, partyType:string, partySubType?:string }) => {
            await this.disassociateParty(payload.partyType, payload.partyId, payload.partyType, payload.partySubType)
            .catch(err => {
                this._logger.error(`${AccountLookUpEventsType.DisassociateParty}: ${err}`);
            });
        });
    }

    private async getPartyById(requesterParticipantId:string, partyId:string, partyType:string, partySubType?:string):Promise<void>{
        throw new Error("Not implemented");
    }


    private async getParticipantByPartyType(sourceFspId: string, partyIdType: string, partyId: string, partySubType:string, destinationFspId?:string, currency?:string): Promise<void>
    {
        throw new Error("Not implemented");
    }

    private async associateParty(requesterParticipantId:string, partyId:string, partyType:string, partySubType?:string): Promise<void> {
        throw new Error("Not implemented");
    }

    private async disassociateParty(requesterParticipantId:string, partyId:string, partyType:string, partySubType?:string): Promise<void> {
        throw new Error("Not implemented");
    }

    private async getOracleProvider(partyType:string): Promise<IOracleProvider> {
        const oracleId = await this._oracleFinder.getOracleForType(partyType).catch(error=>{
            this._logger.error(`Unable to get oracle for type: ${partyType} ` + error);
            throw new UnableToGetOracleError(error);
        });

        if(!oracleId) {
            this._logger.debug(`No oracle found for type: ${partyType}`);
            throw new UnableToGetOracleError(`Oracle not found for partyType: ${partyType}`);
        }

        const oracleProvider = this._oracleProviders.find(oracleProvider => oracleProvider.id === oracleId);

        if(!oracleProvider) {
            this._logger.debug(`No oracle provider found for id: ${oracleId}`);
            throw new UnableToGetOracleProviderError(`Oracle provider not found for oracleId: ${oracleId}`);
        }

		return oracleProvider;
	}
    
}
