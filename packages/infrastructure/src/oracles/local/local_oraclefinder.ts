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
import {MongoClient, Collection, Document, WithId} from "mongodb";
import {
    IOracleFinder,
	UnableToInitOracleFinderError,
	UnableToGetOracleError,
	IOracleProvider
} from "@mojaloop/account-lookup-bc-domain";
import { UnableToCloseDatabaseConnectionError } from "../../errors";

export class MongoOracleFinderRepo implements IOracleFinder{
	// Properties received through the constructor.
	private readonly _logger: ILogger;
	private readonly DB_URL: string;
	private readonly DB_NAME: string;
	private readonly COLLECTION_NAME: string;
	// Other properties.
	private readonly _mongoClient: MongoClient;
	private oracleProviders: Collection;

	constructor(
		logger: ILogger,
		DB_URL: string,
		DB_NAME: string,
		COLLECTION_NAME: string
	) {
		this._logger = logger;
		this.DB_URL = DB_URL;
		this.DB_NAME = DB_NAME;
		this.COLLECTION_NAME = COLLECTION_NAME;

		this._mongoClient = new MongoClient(this.DB_URL);
	}
	addOracleProvider(type: string, subType: string | null): Promise<void> {
		throw new Error("Method not implemented.");
	}
	removeOracleProvider(type: string, subType: string | null): Promise<void> {
		throw new Error("Method not implemented.");
	}

	async init(): Promise<void> {
		try {
			await this._mongoClient.connect();
		} catch (e: any) {
			this._logger.error(`Unable to connect to the database: ${e.message}`);
			throw new UnableToInitOracleFinderError();
		}
		
		this.oracleProviders = this._mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
	}

	async destroy(): Promise<void> {
		try{
			await this._mongoClient.close();
		}
		catch(e: any){
			this._logger.error(`Unable to close the database connection: ${e.message}`);
			throw new UnableToCloseDatabaseConnectionError();
		}
	}

    async getOracleProvider(partyType: string, subType: string | null): Promise<IOracleProvider | null> {
		try {
			const foundOracle: WithId<Document> | null = await this.oracleProviders.findOne(
				{
					partyType: partyType,
					partySubType: subType
				},
			);

			if(!foundOracle) {
				throw new UnableToGetOracleError();
			}
			
			return foundOracle as unknown as IOracleProvider;
		} catch (e: any) {
			this._logger.error(`Unable to get oracle provider: ${e.message}`);
			throw new UnableToGetOracleError();
		}
    }
}
