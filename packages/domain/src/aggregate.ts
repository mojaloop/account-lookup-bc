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
import { GetParticipantError, GetPartyError, NoSuchParticipantError, NoSuchPartyError, UnableToAssociateParticipantError, UnableToAssociatePartyError, UnableToDisassociateParticipantError, UnableToDisassociatePartyError, UnableToGetOracleError, UnableToGetOracleProviderError } from "./errors";
import { ILocalCache, IOracleFinder, IOracleProvider} from "./interfaces/infrastructure";
import { IParticipant, IParty, LocalCacheKeyPrefix } from "./types";

export class AccountLookupAggregate {
	private readonly _logger: ILogger;
	private readonly _oracleFinder: IOracleFinder;
	private readonly _oracleProviders: IOracleProvider[];
    private readonly _messagePublisher: IMessageProducer;
    private readonly _localCache: ILocalCache;
    private participanyCacheKeyPrefix: LocalCacheKeyPrefix = "participant";  

	constructor(
		logger: ILogger,
        oracleFinder:IOracleFinder,
        oracleProviders:IOracleProvider[],
        messagePublisher:IMessageProducer,
        localCache:ILocalCache
	) {
		this._logger = logger;
		this._oracleFinder = oracleFinder;
		this._oracleProviders = oracleProviders;
        this._messagePublisher = messagePublisher;
        this._localCache = localCache;
    }

    async init(): Promise<void> {
		try {
            this._oracleFinder.init();
            this._logger.debug("Oracle finder initialized");
            for await (const oracle of this._oracleProviders) {
                await oracle.init();
                this._logger.debug("Oracle provider initialized with id" + oracle.id);
            }
            // this.messagePublisher.init()
		} catch (error: unknown) {
			this._logger.fatal("Unable to intialize account lookup aggregate" + error);
			throw error;
		}
	}

	async destroy(): Promise<void> {
        try{
		await this._oracleFinder.destroy();
        for await (const oracle of this._oracleProviders) {
            oracle.destroy();
        }
        }
        catch(error){
            this._logger.fatal("Unable to destroy account lookup aggregate" + error);
            throw error;
        }
	}

    //Party.
    async getPartyByTypeAndIdRequest(partyType:string, partyId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        const party = await oracleProvider.getPartyByTypeAndId(partyType, partyId)
        .catch(error=>{
            this._logger.error(`Unable to get party by type: ${partyType} and id: ${partyId} ` + error);
            throw new GetPartyError(error);
        });

        if (!party) {
            this._logger.debug(`No party by type: ${partyType} and id: ${partyId} found`);
            throw new NoSuchPartyError();
        }

        this._messagePublisher.send({ 
            id: partyId,
            type: partyType,
        });
    }
    
    async getPartyByTypeAndIdResponse(partyType:string, partyId:string):Promise<IParty|null|undefined>{
        const oracleProvider = await this.getOracleProvider(partyType);

        const party = await oracleProvider.getPartyByTypeAndId(partyType, partyId)
        .catch(error=>{
            this._logger.error(`Unable to get party by type: ${partyType} and id: ${partyId} ` + error);
            throw new GetPartyError(error);
        });

        if (!party) {
            this._logger.debug(`No party by type: ${partyType} and id: ${partyId} found`);
            throw new NoSuchPartyError();
        }
        
        return party;
    }

    async getPartyByTypeAndIdAndSubIdRequest(partyType:string, partyId:string, partySubId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        const party = await oracleProvider.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId)
        .catch(error=>{
            this._logger.error(`Unable to get party by type: ${partyType} and id: ${partyId}  and subId: ${partySubId} ` + error);
            throw new GetPartyError(error);
        });

        if (!party) {
            this._logger.debug(`No party by type: ${partyType} and id: ${partyId} and subId: ${partySubId} found`);
            throw new NoSuchPartyError();
        }

        this._messagePublisher.send({ 
            id: partyId,
            type: partyType,
            subId: partySubId
        });
    }

    async getPartyByTypeAndIdAndSubIdResponse(partyType:string, partyId:string, partySubId:string):Promise<IParty|null|undefined>{
        const oracleProvider = await this.getOracleProvider(partyType);

        const party = await oracleProvider.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId)
        .catch(error=>{
            this._logger.error(`Unable to get party by type: ${partyType} and id: ${partySubId} and subId: ${partySubId} ` + error);
            throw new GetPartyError(error);
        });

        if (!party) {
            this._logger.debug(`No party by type: ${partyType} and id: ${partyId} and subId: ${partySubId} found`);
            throw new NoSuchPartyError();
        }
        
        return party;
    }

    async associatePartyByTypeAndId(partyType:string, partyId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.associatePartyByTypeAndId(partyType, partyId).catch(error=>{
            this._logger.error(`Unable to associate party by type: ${partyType} and id: ${partyId} ` + error);
            throw new UnableToAssociatePartyError(error);
        });
    }

    async associatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId).catch(error=>{
            this._logger.error(`Unable to associate party by type: ${partyType} and id: ${partyId} and subId:${partySubId} ` + error);
            throw new UnableToAssociatePartyError(error);
        });
    }

    async disassociatePartyByTypeAndId(partyType:string, partyId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.disassociatePartyByTypeAndId(partyType, partyId).catch(error=>{
            this._logger.error(`Unable to disassociate party by type: ${partyType} and id: ${partyId} ` + error);
            throw new UnableToDisassociatePartyError(error);
        });
    }

    async disassociatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId).catch(error=>{
            this._logger.error(`Unable to disassociate party by type: ${partyType} and id: ${partyId} and subId:${partySubId} ` + error);
            throw new UnableToDisassociatePartyError(error);
        });
    }

    //Participant.
    async getParticipantByTypeAndId(participantType:string, participantId:string):Promise<IParticipant|null|undefined>{
        const cachedParticipant = this.extractParticipantFromCache(participantType, participantId);
        
        if(cachedParticipant) {
            return cachedParticipant;
        }

        const oracleProvider = await this.getOracleProvider(participantType);

        const participant = await oracleProvider.getParticipantByTypeAndId(participantType, participantId)
        .catch(error=>{
            this._logger.error(`Unable to get participant by type: ${participantType} and id: ${participantId} ` + error);
            throw new GetParticipantError(error);
        });

        if (!participant) {
            this._logger.debug(`No participant by type: ${participantType} and id: ${participantId} found`);
            throw new NoSuchParticipantError();
        }

        this.storeParticipantInCache(participant)
        
        return participant;

    }

    async getParticipantByTypeAndIdAndSubId(participantType:string, participantId:string, participantSubId:string):Promise<IParticipant|null|undefined>{
        const cachedParticipant = this.extractParticipantFromCache(participantType, participantId);
        
        if(cachedParticipant) {
            return cachedParticipant;
        }

        const oracleProvider = await this.getOracleProvider(participantType);

        const participant = await oracleProvider.getParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId)
            .catch(error=>{
                this._logger.error(`Unable to get participant by type: ${participantType} and id: ${participantId} and subId:${participantSubId} ` + error);
                throw new GetParticipantError(error);
            });

        if (!participant) {
            this._logger.debug(`No participant by type: ${participantType} and id: ${participantId}  and subId:${participantSubId} found`);
            throw new NoSuchParticipantError();
        }

        this.storeParticipantInCache(participant)

        return participant;
    }

    private extractParticipantFromCache(participantType: string, participantId: string, participantSubId?:string):IParticipant|null {
        const cachedParticipant = this._localCache.get(this.participanyCacheKeyPrefix, participantType, participantId, participantSubId ?? "") as IParticipant;
        return cachedParticipant;
    }

    private storeParticipantInCache(participant:IParticipant):void {
        try{
            this._localCache.set(participant, this.participanyCacheKeyPrefix, participant.type, participant.id, participant.subId ?? "");
        }
        catch(error){
            this._logger.error("Unable to store participant in cache " + error);
        }
    }

    async associateParticipantByTypeAndId(participantType:string, participantId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(participantType);

        await oracleProvider.associateParticipantByTypeAndId(participantType, participantId).catch(error=>{
            this._logger.error(`Unable to associate party by type: ${participantType} and id: ${participantId} ` + error);
            throw new UnableToAssociateParticipantError(error);
        });
    }

    async associateParticipantByTypeAndIdAndSubId(participantType:string, participantId:string, participantSubId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(participantType);

        await oracleProvider.associateParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId).catch(error=>{
            this._logger.error(`Unable to associate party by type: ${participantType} and id: ${participantId} and subId:${participantSubId} ` + error);
            throw new UnableToAssociateParticipantError(error);
        });
    }

    async disassociateParticipantByTypeAndId(participantType:string, participantId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(participantType);

        await oracleProvider.disassociateParticipantByTypeAndId(participantType, participantId).catch(error=>{
            this._logger.error(`Unable to disassociate party by type: ${participantType} and id: ${participantId} ` + error);
            throw new UnableToDisassociateParticipantError(error);
        });
    }

    async disassociateParticipantByTypeAndIdAndSubId(participantType:string, participantId:string, participantSubId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(participantType);

        await oracleProvider.disassociateParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId).catch(error=>{
            this._logger.error(`Unable to disassociate party by type: ${participantType} and id: ${participantId} and subId:${participantSubId} ` + error);
            throw new UnableToDisassociateParticipantError(error);
        });
    }

    //Private.
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
