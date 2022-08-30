/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 ******/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { GetPartyError, NoSuchPartyError, UnableToAssociatePartyError, UnableToDisassociatePartyError, UnableToGetOracleError, UnableToGetOracleProviderError } from "./errors";
import {IOracleFinder, IOracleProvider} from "./interfaces/infrastructure";
import { IParty } from "./types";

export class AccountLookupAggregate {
	private readonly logger: ILogger;
	private readonly oracleFinder: IOracleFinder;
	private readonly oracleProviders: IOracleProvider[];

	constructor(
		logger: ILogger,
        oracleFinder:IOracleFinder,
        oracleProviders:IOracleProvider[]
	) {
		this.logger = logger;
		this.oracleFinder = oracleFinder;
		this.oracleProviders = oracleProviders;
    }

    async init(): Promise<void> {
		try {
            this.oracleFinder.init();
            for await (const oracle of this.oracleProviders) {
                await oracle.init();
            }
		} catch (error: unknown) {
			this.logger.fatal("Unable to intialize account lookup aggregate" + error);
			throw error
		}
	}

	async destroy(): Promise<void> {
        try{
		await this.oracleFinder.destroy();
        for await (const oracle of this.oracleProviders) {
            oracle.destroy();
        }
        }
        catch(error){
            this.logger.fatal("Unable to destroy account lookup aggregate" + error);
            throw error;
        }
	}

    async getPartyByTypeAndId(partyType:String, partyId:String):Promise<IParty|null|undefined>{
            const oracleProvider = await this.getOracleProvider(partyType);

            const party = await oracleProvider.getPartyByTypeAndId(partyType, partyId)
            .catch(error=>{
                this.logger.error(`Unable to get party by type: ${partyType} and id: ${partyId} ` + error);
                throw new GetPartyError(error);
            });

            if (!party) {
                this.logger.debug(`No party by type: ${partyType} and id: ${partyId} found`);
                throw new NoSuchPartyError();
            }
            
            return party;
	
    }

    async getPartyByTypeAndIdAndSubId(partyType:String, partyId:String, partySubId:String):Promise<IParty|null|undefined>{
        const oracleProvider = await this.getOracleProvider(partyType)

        const party = await oracleProvider.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId)
            .catch(error=>{
                this.logger.error(`Unable to get party by type: ${partyType} and id: ${partyId} and subid:${partySubId} ` + error);
                throw new GetPartyError(error);
            });

        if (!party) {
            this.logger.debug(`No party by type: ${partyType} and id: ${partyId}  and subId:${partySubId} found`);
            throw new NoSuchPartyError();
        }

        return party;
    }
    
    async associatePartyByTypeAndId(partyType:String, partyId:String):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.associatePartyByTypeAndId(partyType, partyId).catch(error=>{
            this.logger.error(`Unable to associate party by type: ${partyType} and id: ${partyId} ` + error);
            throw new UnableToAssociatePartyError(error);
        });
    }

    async associatePartyByTypeAndIdAndSubId(partyType:String, partyId:String, partySubId:String):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId).catch(error=>{
            this.logger.error(`Unable to associate party by type: ${partyType} and id: ${partyId} and subid:${partySubId} ` + error);
            throw new UnableToAssociatePartyError(error);
        });
    }

    async disassociatePartyByTypeAndId(partyType:String, partyId:String):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.disassociatePartyByTypeAndId(partyType, partyId).catch(error=>{
            this.logger.error(`Unable to disassociate party by type: ${partyType} and id: ${partyId} ` + error);
            throw new UnableToDisassociatePartyError(error);
        });
    }

    async disassociatePartyByTypeAndIdAndSubId(partyType:String, partyId:String, partySubId:String):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType)

        await oracleProvider.disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId).catch(error=>{
            this.logger.error(`Unable to disassociate party by type: ${partyType} and id: ${partyId} and subid:${partySubId} ` + error);
            throw new UnableToDisassociatePartyError(error);
        });
    }

    private async getOracleProvider(partyType:String): Promise<IOracleProvider> {
        const oracleId = await this.oracleFinder.getOracleForType(partyType).catch(error=>{
            this.logger.error(`Unable to get oracle for type: ${partyType} ` + error);
            throw new UnableToGetOracleError(error);
        });

        if(!oracleId) {
            this.logger.debug(`No oracle found for type: ${partyType}`);
            throw new UnableToGetOracleError(`Oracle not found for partyType: ${partyType}`);
        }

        const oracleProvider = this.oracleProviders.find(oracleProvider => oracleProvider.id === oracleId);

        if(!oracleProvider) {
            this.logger.debug(`No oracle provider found for id: ${oracleId}`);
            throw new UnableToGetOracleProviderError(`Oracle provider not found for oracleId: ${oracleId}`);
        }

		return oracleProvider;
	}
}
