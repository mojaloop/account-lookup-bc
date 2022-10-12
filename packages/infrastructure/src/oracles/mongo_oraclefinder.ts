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
	Collection,
	Document,
	MongoClient,
	WithId
	} from 'mongodb';
import { ILogger } from '@mojaloop/logging-bc-public-types-lib';
import { UnableToCloseDatabaseConnectionError, UnableToGetOracleError, UnableToInitOracleFinderError } from '../errors';
import {
    IOracleFinder,
	Oracle,
	OracleCreationRequest,
} from "@mojaloop/account-lookup-bc-domain";
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
export class MongoOracleFinderRepo implements IOracleFinder{
	private readonly _logger: ILogger;
	private readonly _connectionString: string;
	private readonly _mongoServer: MongoMemoryServer;
	private readonly _mongoClient: MongoClient;
	private collectionName = "oracleProviders";
	private oracleProviders: Collection;

	constructor(
		logger: ILogger,
		connectionString: string,
	) {
		this._logger = logger;
		this._mongoServer = new MongoMemoryServer();
		this._connectionString = this._mongoServer.getUri();
		this._mongoClient = new MongoClient(this._connectionString);
		
	}

	async init(): Promise<void> {
		try {
			this._mongoClient.connect();
			this.oracleProviders = this._mongoClient.db().collection(this.collectionName);
		} catch (e: any) {
			this._logger.error(`Unable to connect to the database: ${e.message}`);
			throw new UnableToInitOracleFinderError();
		}
		
		this.oracleProviders = this._mongoClient.db(this._connectionString).collection(this.collectionName);
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

	async addOracle(oracle: OracleCreationRequest): Promise<Oracle> {
		try {
			const newOracle: Oracle = {
				id: crypto.randomUUID(),
				name: oracle.name,
				partyType: oracle.partyType,
				partySubType: oracle.partySubType,
				endpoint: oracle.endpoint,
				type: oracle.type,
			};
			const insertedOracle = await this.oracleProviders.insertOne(newOracle);
			return insertedOracle as unknown as Promise<Oracle>;
			
		} catch (e: any) {
			this._logger.error(`Unable to insert oracle: ${e.message}`);
			throw new UnableToGetOracleError();
		}
	}
	async removeOracle(id: string): Promise<void> {
		try {
			await this.oracleProviders.deleteOne({id});
			
			
		} catch (e: any) {
			this._logger.error(`Unable to remove oracle: ${e.message}`);
			throw new UnableToGetOracleError();
		}
	}
	
	async getAllOracles(): Promise<Oracle[]> {
		const oracles = await this.oracleProviders.find().toArray();
		return oracles as unknown as Promise<Oracle[]>;
	}
	
    async getOracle(partyType: string, partySubtype: string | null): Promise<Oracle | null>{
		try {
			const foundOracle: WithId<Document> | null = await this.oracleProviders.findOne(
				{
					partyType: partyType,
					partySubType: partySubtype
				},
			);

			if(!foundOracle) {
				throw new UnableToGetOracleError();
			}
			
			return foundOracle as unknown as Oracle;
		} catch (e: any) {
			this._logger.error(`Unable to get oracle provider: ${e.message}`);
			throw new UnableToGetOracleError();
		}
    }
}
