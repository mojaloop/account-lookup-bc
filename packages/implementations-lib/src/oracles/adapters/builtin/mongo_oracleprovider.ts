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
import {MongoClient, Collection, WithId, Document} from "mongodb";
import { IOracleProviderAdapter, OracleType, Oracle, Association } from "@mojaloop/account-lookup-bc-domain-lib";
import { NoSuchParticipantError, ParticipantAssociationAlreadyExistsError, UnableToCloseDatabaseConnectionError, UnableToDeleteParticipantAssociationError, UnableToGetParticipantError, UnableToInitOracleProvider, UnableToGetAssociationError, UnableToStoreParticipantAssociationError } from "../../../errors";

export class MongoOracleProviderRepo implements IOracleProviderAdapter{
	private readonly _logger: ILogger;
	private readonly _connectionString: string;
	private readonly _dbName;
	private mongoClient: MongoClient;
	private collectionName = "builtinOracleParties";
	private parties: Collection;
	private readonly _oracle: Oracle;


	public readonly oracleId: string;
	public readonly type: OracleType;

	constructor(
			oracle:Oracle,
			logger:ILogger,
			connectionString: string,
			dbName:string
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._oracle = oracle;
		this.oracleId = this._oracle.id;
		this._connectionString = connectionString;
		this._dbName = dbName;
		this.type = "builtin";
	}

	async init(): Promise<void> {
		try {
			this.mongoClient = new MongoClient(this._connectionString);
			this.mongoClient.connect();
			this.parties = this.mongoClient.db(this._dbName).collection(this.collectionName);
		} catch (e: unknown) {
			this._logger.error(`Unable to connect to the database: ${(e as Error).message}`);
			throw new UnableToInitOracleProvider();
		}
	}

	async destroy(): Promise<void> {
		try{
			await this.mongoClient.close();
		}
		catch(e: unknown){
			this._logger.error(`Unable to close database connection: ${(e as Error).message}`);
			throw new UnableToCloseDatabaseConnectionError();
		}

	}

	async getParticipantFspId(partyType:string, partyId: string, currency:string| null ):Promise<string|null> {
		try {
			const data = await this.parties.findOne({
				partyId: partyId,
				partyType: partyType,
				currency: currency,

			});

			if(!data) {
				this._logger.debug(`Unable to find participant for partyType ${partyType} partyId ${partyId} and currency ${currency}`);
                throw new NoSuchParticipantError();
            }

			return data.fspId as unknown as string;

		} catch (e: unknown) {
			this._logger.error(`Unable to get participant for partyType ${partyType} partyId ${partyId}, currency ${currency}: ${(e as Error).message}`);
			throw new UnableToGetParticipantError();
		}
	}


	async associateParticipant(fspId:string, partyType:string, partyId: string, currency:string| null):Promise<null> {
	{
		const participant = await this.parties.findOne({
			partyId: partyId,
			fspId: fspId,
			partyType: partyType,
			currency: currency,
		});

		if(participant) {
			this._logger.debug(`Participant association already exists for partyType ${partyType} partyId ${partyId} and currency ${currency}`);
			throw new ParticipantAssociationAlreadyExistsError();
		}

		await this.parties.insertOne({
			partyId: partyId,
			fspId: fspId,
			partyType: partyType,
			currency: currency,
		}).catch((e: unknown) => {
			this._logger.error(`Unable to store participant association for partyType ${partyType} partyId ${partyId}, currency ${currency}: ${(e as Error).message}`);
			throw new UnableToStoreParticipantAssociationError();
		}
		);
			this._logger.debug(`Participant association stored for partyType ${partyType} partyId ${partyId} and currency ${currency}`);
			return null;
		}
	}

	async disassociateParticipant(fspId:string, partyType:string, partyId: string, currency:string| null):Promise<null> {
		await this.parties.deleteOne({
			partyId: partyId,
			fspId: fspId,
			partyType: partyType,
			currency: currency,
		}).catch((e: unknown) => {
			this._logger.error(`Unable to delete participant association for partyType ${partyType} partyId ${partyId}, currency ${currency}: ${(e as Error).message}`);
			throw new UnableToDeleteParticipantAssociationError();
		});

		this._logger.debug(`Participant association deleted for partyType ${partyType} partyId ${partyId} and currency ${currency}`);
		return null;
	}

	async healthCheck(): Promise<boolean> {
		await this.mongoClient.db().command({ping: 1}).catch((e: unknown) => {
			this._logger.debug(`Unable to ping database: ${(e as Error).message}`);
			return false;
		});
		return true;
	}

	async getAllAssociations():Promise<Association[]> {
		const associations = await this.parties.find({}).toArray().catch((e: unknown) => {
			this._logger.error(`Unable to get associations: ${(e as Error).message}`);
			throw new UnableToGetAssociationError();
		});

		const mappedAssociations = associations.map((association: WithId<Document>) => {
			return {
				partyId: association.partyId ?? null,
				fspId: association.fspId ?? null,
				partyType: association.partyType ?? null,
				currency: association.currency ?? null
			} as Association;
		});

		return mappedAssociations;
	}
}

