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

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { MongoClient, Collection, WithId, Document } from "mongodb";
import { IOracleProviderAdapter, Oracle, Association } from "@mojaloop/account-lookup-bc-domain-lib";
import { OracleType, AssociationsSearchResults } from "@mojaloop/account-lookup-bc-public-types-lib";
import {
  ParticipantAssociationAlreadyExistsError,
  UnableToCloseDatabaseConnectionError,
  UnableToGetParticipantError,
  UnableToInitOracleProvider,
  UnableToGetAssociationError,
  UnableToAssociateParticipantError,
  UnableToDisassociateParticipantError,
  UnableToGetAssociationsError,
} from "../../../errors";

const MAX_ENTRIES_PER_PAGE = 100;

export class MongoOracleProviderRepo implements IOracleProviderAdapter {
	private readonly _logger: ILogger;
	private readonly _connectionString: string;
	private readonly _dbName;
	private mongoClient: MongoClient;
	private collectionName = "builtinOracleParties";
	private parties: Collection;
	private readonly _oracle: Oracle;

	public readonly oracleId: string;
	public readonly type: OracleType;

	constructor(oracle: Oracle, logger: ILogger, connectionString: string, dbName: string) {
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
			await this.mongoClient.connect();
			this.parties = this.mongoClient.db(this._dbName).collection(this.collectionName);
		} catch (error: unknown) {
			const errorMessage = `Unable to connect to the database: ${(error as Error).message}`;
			this._logger.error(errorMessage + `  - ${error}`);
			throw new UnableToInitOracleProvider(errorMessage);
		}
	}

	async destroy(): Promise<void> {
		try {
			await this.mongoClient.close();
		} catch (error: unknown) {
			const errorMessage = `Unable to close database connection: ${(error as Error).message}`;
			this._logger.error(errorMessage + `  - ${error}`);
			throw new UnableToCloseDatabaseConnectionError(errorMessage);
		}
	}

	async getParticipantFspId(
		partyType: string,
		partyId: string,
		partySubType: string | null,
		currency: string | null
	): Promise<string | null> {
		const query: any = {
			partyId: partyId,
			partyType: partyType,
			partySubType: partySubType,
			currency: currency,
		};

		if (!currency) {
			delete query.currency;
		}

		if (!partySubType) {
			delete query.partySubType;
		}

		const data = await this.parties.findOne(query).catch(
		/* istanbul ignore next */ (error: unknown) => {
			const errorMessage = `Unable to get participant for partyType ${partyType} partyId ${partyId} and currency ${currency}: ${(error as Error).message}`;
			this._logger.error(errorMessage + `  - ${error}`);
			throw new UnableToGetParticipantError(errorMessage);
		}
		);

		if (!data) {
			const errorMessage = `Unable to find participant for partyType ${partyType} partyId ${partyId} and currency ${currency}`;
			this._logger.info(errorMessage);
			return null;
		}

		return data.fspId as unknown as string;
	}

	async associateParticipant(
		fspId: string,
		partyType: string,
		partyId: string,
		partySubType: string | null,
		currency: string | null
	): Promise<null> {
		const query: any = this.buildLookupQuery(partyId, fspId, partyType, partySubType, currency);

		const association = await this.parties.findOne(query);

		if (association) {
			const errorMessage = `Participant association already exists for partyType ${partyType} partyId ${partyId} and currency ${currency}`;
			this._logger.info(errorMessage);
			throw new ParticipantAssociationAlreadyExistsError(errorMessage);
		}

		await this.parties.insertOne(query).catch(
		/* istanbul ignore next */ (error: unknown) => {
			const errorMessage = `Unable to store participant association for partyType ${partyType} partyId ${partyId}, currency ${currency}: ${(error as Error).message}`;
			this._logger.error(errorMessage + `  - ${error}`);
			throw new UnableToAssociateParticipantError(errorMessage);
		}
		);

		this._logger.info(`Participant association stored for partyType ${partyType} partyId ${partyId} and currency ${currency}`);
		return null;
	}

	async disassociateParticipant(
		fspId: string,
		partyType: string,
		partyId: string,
		partySubType: string | null,
		currency: string | null
	): Promise<null> {
		const query: any = this.buildLookupQuery(partyId, fspId, partyType, partySubType, currency);

		await this.parties.deleteOne(query).catch(
		/* istanbul ignore next */ (error: unknown) => {
			const errorMessage = `Unable to delete participant association for partyType ${partyType} partyId ${partyId}, currency ${currency}: ${(error as Error).message}`;
			this._logger.error(errorMessage + `  - ${error}`);
			throw new UnableToDisassociateParticipantError(errorMessage);
		}
		);

		this._logger.info(`Participant association deleted for partyType ${partyType} partyId ${partyId} and currency ${currency}`);
		return null;
	}

	async healthCheck(): Promise<boolean> {
		await this.mongoClient
			.db()
			.command({ ping: 1 })
			.catch(
				/* istanbul ignore next */ (e: unknown) => {
				this._logger.error(`Unable to ping database: ${(e as Error).message}`);
				return false;
				}
			);
		return true;
	}

	async getAllAssociations(): Promise<Association[]> {
		const associations = await this.parties
			.find({})
			.toArray()
			.catch(
				/* istanbul ignore next */ (error: unknown) => {
				const errorMessage = `Unable to get associations: ${(error as Error).message}`;
				this._logger.error(errorMessage + ` - ${error}`);
				throw new UnableToGetAssociationError(errorMessage);
				}
			);

		const mappedAssociations = associations.map((association: WithId<Document>) => {
			return {
				partyId: association.partyId ?? null,
				fspId: association.fspId ?? null,
				partyType: association.partyType ?? null,
				currency: association.currency ?? null,
			} as Association;
		});

		return mappedAssociations;
	}

	private buildLookupQuery(
		partyId: string,
		fspId: string,
		partyType: string,
		partySubType: string | null,
		currency: string | null
	) {
		const query: any = {
			partyId: partyId,
			fspId: fspId,
			partyType: partyType,
			partySubType: partySubType,
			currency: currency,
		};

		if (!currency) {
			delete query.currency;
		}

		if (!partySubType) {
			delete query.partySubType;
		}
		return query;
	}

	async searchAssociations(
		fspId:string|null,
		partyId:string|null,
        partyType:string|null,
        partySubType:string|null,
        currency:string|null,
        pageIndex = 0,
        pageSize: number = MAX_ENTRIES_PER_PAGE
    ): Promise<AssociationsSearchResults> {
        // make sure we don't go over or below the limits
        pageSize = Math.min(pageSize, MAX_ENTRIES_PER_PAGE);
        pageIndex = Math.max(pageIndex, 0);

        const searchResults: AssociationsSearchResults = {
            pageSize: pageSize,
            pageIndex: pageIndex,
            totalPages: 0,
            items: []
        };

        let filter: any = { $and: [] }; // eslint-disable-line @typescript-eslint/no-explicit-any
        if(fspId){
            filter.$and.push({ "fspId": fspId });
        }
		if(partyId){
            filter.$and.push({ "partyId": {"$regex": partyId, "$options": "i"}});
        }
		if (partyType) {
            filter.$and.push({ "partyType": partyType });
        }
		if (partySubType) {
            filter.$and.push({ "partySubType": {"$regex": partySubType, "$options": "i"}});
        }
		if (currency) {
            filter.$and.push({ "currency": currency });
        }
        if(filter.$and.length === 0) {
            filter = {};
        }

        try {
            const skip = Math.floor(pageIndex * pageSize);
			const result = await this.parties.find(
				filter,
				{
					sort:["updatedAt", "desc"], 
					skip: skip,
                    limit: 20
				}
			).toArray().catch((e: unknown) => {
                this._logger.error(`Unable to get assocations: ${(e as Error).message}`);
                throw new UnableToGetAssociationsError("Unable to get assocations");
			});

			searchResults.items = result as unknown as Association[];

			const totalEntries = await this.parties.find(
				filter
            ).toArray().catch((e: unknown) => {
                this._logger.error(`Unable to get associations page size: ${(e as Error).message}`);
                throw new UnableToGetAssociationsError("Unable to get associations page size");
			});

			searchResults.totalPages = Math.ceil(totalEntries.length / pageSize);
			searchResults.pageSize = Math.max(pageSize, result.length);
            
        } catch (err) {
            this._logger.error(err);
        }

        return Promise.resolve(searchResults);
    }

	async getSearchKeywords():Promise<{fieldName:string, distinctTerms:string[]}[]>{
        const retObj:{fieldName:string, distinctTerms:string[]}[] = [];

        try {
            const result = this.parties
                .aggregate([
					{$group: { "_id": { partyType: "$partyType", currency: "$currency", fspId: "$fspId" } } }
				]);

			const partyType:{fieldName:string, distinctTerms:string[]} = {
				fieldName: "partyType",
				distinctTerms: []
			};

			const currency:{fieldName:string, distinctTerms:string[]} = {
				fieldName: "currency",
				distinctTerms: []
			};

			const fspId:{fieldName:string, distinctTerms:string[]} = {
				fieldName: "fspId",
				distinctTerms: []
			};

			for await (const term of result) {

				if(!partyType.distinctTerms.includes(term._id.partyType)) {
					partyType.distinctTerms.push(term._id.partyType);
				}
				retObj.push(partyType);

				if(!currency.distinctTerms.includes(term._id.currency)) {
					currency.distinctTerms.push(term._id.currency);
				}
				retObj.push(currency);

				if(!fspId.distinctTerms.includes(term._id.fspId)) {
					fspId.distinctTerms.push(term._id.fspId);
				}
				retObj.push(fspId);
			}
        } catch (err) {
            this._logger.error(err);
        }

        return Promise.resolve(retObj);
    }
}
