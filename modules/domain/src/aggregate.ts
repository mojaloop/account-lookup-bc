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

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Coil
 - Jason Bruwer <jason.bruwer@coil.com>

 --------------
 ******/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { NoSuchPartyError, UnableToGetOracleError, UnableToGetOracleProviderError } from "./errors";
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
            for(let i=0; i<this.oracleProviders.length ; i+=1){
                await this.oracleProviders[i].init();
            }
		} catch (e: unknown) {
			this.logger.fatal(e);
			throw e;
		}
	}

	async destroy(): Promise<void> {
		await this.oracleFinder.destroy();
        for(let i=0; i<this.oracleProviders.length ; i+=1){
            await this.oracleProviders[i].destroy();
        }
	}

    async getPartyByTypeAndId(partyType:String, partyId:String):Promise<IParty|null|undefined>{
            const oracleProvider = await this.getOracleProvider(partyType)

            const party = await oracleProvider?.getPartyByTypeAndId(partyType, partyId);

            if (!party || party?.result === null) {
                throw new NoSuchPartyError();
            }
            
            return party.result as IParty;
	
    }

    async getPartyByTypeAndIdAndSubId(partyType:String, partyId:String, partySubId:String):Promise<IParty|null|undefined>{
        const oracleProvider = await this.getOracleProvider(partyType)

        const party = await oracleProvider?.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        return party;
    }
    
    async associatePartyByTypeAndId(partyType:String, partyId:String):Promise<boolean>{
        const oracleProvider = await this.getOracleProvider(partyType)

        await oracleProvider?.associatePartyByTypeAndId(partyType, partyId);

        return true;
    }

    async associatePartyByTypeAndIdAndSubId(partyType:String, partyId:String, partySubId:String):Promise<boolean>{
        const oracleProvider = await this.getOracleProvider(partyType)

        await oracleProvider?.associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        return true;
    }

    async disassociatePartyByTypeAndId(partyType:String, partyId:String):Promise<boolean>{
        const oracleProvider = await this.getOracleProvider(partyType)

        await oracleProvider?.disassociatePartyByTypeAndId(partyType, partyId);

        return true;
    }

    async disassociatePartyByTypeAndIdAndSubId(partyType:String, partyId:String, partySubId:String):Promise<boolean>{
        const oracleProvider = await this.getOracleProvider(partyType)

        await oracleProvider?.disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        return true;
    }

    private async getOracleProvider(partyType:String): Promise<IOracleProvider|null|undefined> {
        const oracleId = await this.oracleFinder.getOracleForType(partyType);

        if(!oracleId) {
            throw new UnableToGetOracleError(`oracle not found for partyType: ${partyType}`);
        }

        const oracleProvider = this.oracleProviders.find(oracleProvider => oracleProvider.id === oracleId);

        if(!oracleProvider) {
            throw new UnableToGetOracleProviderError(`oracle provider not found for oracleId: ${oracleId}`);
        }

		return oracleProvider;
	}
}
