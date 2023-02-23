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
	} from "mongodb";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { OracleAlreadyRegisteredError, UnableToCloseDatabaseConnectionError, UnableToDeleteOracleError, UnableToGetOracleError, UnableToInitOracleFinderError, UnableToRegisterOracleError } from "../errors";
import {IOracleFinder, NoSuchOracleError, Oracle} from "@mojaloop/account-lookup-bc-domain-lib";

export class MongoOracleFinderRepo implements IOracleFinder{
	private readonly _logger: ILogger;
	private readonly _connectionString: string;
	private readonly _dbName;
	private readonly _collectionName = "oracles";
	private mongoClient: MongoClient;
	private oracleProviders: Collection;

	constructor(
		logger: ILogger,
        connectionString: string,
		dbName:string
	) {
		this._logger = logger.createChild(this.constructor.name);
        this._connectionString = connectionString;
		this._dbName = dbName;
	}

	async init(): Promise<void> {
		try {
			this.mongoClient = new MongoClient(this._connectionString);
			this.mongoClient.connect();
			this.oracleProviders = this.mongoClient.db(this._dbName).collection(this._collectionName);
		} catch (e: unknown) {
			this._logger.error(`Unable to connect to the database: ${(e as Error).message}`);
			throw new UnableToInitOracleFinderError();
		}
	}

	async destroy(): Promise<void> {
		try{
			await this.mongoClient.close();
		}
		catch(e: unknown){
			this._logger.error(`Unable to close the database connection: ${(e as Error).message}`);
			throw new UnableToCloseDatabaseConnectionError();
		}
	}

	async addOracle(oracle: Oracle): Promise<void> {
		const oracleAlreadyPresent : Document | null = await this.oracleProviders.findOne(
			{
				partyType: oracle.partyType,
				partySubType: oracle.partySubType,
				type: oracle.type,
				id: oracle.id,
				name: oracle.name,
				endpoint: oracle.endpoint,
			},
		).catch((e: unknown) => {
			this._logger.error(`Unable to add oracle: ${(e as Error).message}`);
			throw new UnableToGetOracleError();
		});

		if(oracleAlreadyPresent){
			throw new OracleAlreadyRegisteredError();
		}

		try {
			await this.oracleProviders.insertOne(oracle);

		} catch (e: unknown) {
			this._logger.error(`Unable to insert oracle: ${(e as Error).message}`);
			throw new UnableToRegisterOracleError();
		}
	}
	async removeOracle(id: string): Promise<void> {
		const deleteResult = await this.oracleProviders.deleteOne({id}).catch((e: unknown) => {
			this._logger.error(`Unable to delete oracle: ${(e as Error).message}`);
			throw new UnableToDeleteOracleError();
		});

		if(deleteResult.deletedCount == 1){
			return;
		}
		else{
			throw new NoSuchOracleError();
		}
	}

	async getAllOracles(): Promise<Oracle[]> {
		const oracles = await this.oracleProviders.find().toArray().catch((e: unknown) => {
			this._logger.error(`Unable to get all oracles: ${(e as Error).message}`);
			throw new UnableToGetOracleError();
		});

		const mappedOracles: Oracle[] = [];

		oracles.map((oracle: WithId<Document>) => {
			mappedOracles.push(this.mapToOracle(oracle));
		});

		return mappedOracles;
	}

	async getOracleById(id:string):Promise<Oracle|null>{
		const oracle = await this.oracleProviders.findOne({id: id }).catch((e: unknown) => {
			this._logger.error(`Unable to get oracle by id: ${(e as Error).message}`);
			throw new UnableToGetOracleError();
		});
		if(!oracle){
			return null;
		}
		return this.mapToOracle(oracle);
	}

	async getOracleByName(name:string):Promise<Oracle|null>{
		const oracle = await this.oracleProviders.findOne({name: name }).catch((e: unknown) => {
			this._logger.error(`Unable to get oracle by name: ${(e as Error).message}`);
			throw new UnableToGetOracleError();
		});
		if(!oracle) return null;
		return this.mapToOracle(oracle);
	}

    async getOracle(partyType: string, partySubtype: string | null): Promise<Oracle | null>{
		const foundOracle: Document | null = await this.oracleProviders.findOne(
			{
				partyType: partyType,
				partySubType: partySubtype
			}
		).catch((e: unknown) => {
			this._logger.error(`Unable to get oracle: ${(e as Error).message}`);
			throw new UnableToGetOracleError();
		});

		if(!foundOracle) {
			throw new NoSuchOracleError();
		}

		const mappedOracle: Oracle = this.mapToOracle(foundOracle);

		return mappedOracle;

    }

	private mapToOracle(oracle: Document): Oracle {
		return {
			id: oracle.id,
			name: oracle.name,
			partyType: oracle.partyType,
			partySubType: oracle.partySubType,
			endpoint: oracle.endpoint,
			type: oracle.type,
		};
	}
}
