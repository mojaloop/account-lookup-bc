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
import { UnableToGetOracleProviderError } from "./errors";
import {IOracleFinder, IOracleProvider} from "./infrastructure_interfaces";
import { IParty, IPartyAccount } from "./types";

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
	
		} catch (e: unknown) {
			this.logger.fatal(e);
			throw e;
		}
	}

	// DONE.
	async destroy(): Promise<void> {

	}

    async getParty(partyType:String, partyId:String, partySubId?:String):Promise<IParty|null|undefined>{
        const oracleProvider = await this.getOracleProvider(partyType)

        const party = await oracleProvider?.getParty(partyType, partyId);

        return party;
    }
    
    async createParty(partyType:String, partyId:String, partySubId?:String):Promise<IPartyAccount|null|undefined>{
        const oracleProvider = await this.getOracleProvider(partyType)

        const party = await oracleProvider?.createParty(partyType, partyId);

        return party;
    }

    async deleteParty(partyType:String, partyId:String, partySubId?:String):Promise<boolean>{
        const oracleProvider = await this.getOracleProvider(partyType)

        await oracleProvider?.deleteParty(partyType, partyId);

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
