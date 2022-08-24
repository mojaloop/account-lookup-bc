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
import {MongoClient, Collection, UpdateResult} from "mongodb";
import {
	IParty,
	IPartyAccount,
	PartyAssociationAlreadyExistsError,
	UnableToGetPartyError,
	UnableToStorePartyAssociationError,
	UnableToInitRepoError,
} from "@mojaloop/account-lookup-bc-domain";
import { IOracleProvider } from "@mojaloop/account-lookup-bc-domain";

export class MongoOracleProviderRepo implements IOracleProvider{
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly DB_URL: string;
	private readonly DB_NAME: string;
	private readonly COLLECTION_NAME: string;
	// Other properties.
	private readonly mongoClient: MongoClient;
	private partyAssociations: Collection;

	id: String;

	constructor(
		logger: ILogger,
		DB_URL: string,
		DB_NAME: string,
		COLLECTION_NAME: string
	) {
		this.logger = logger;
		this.DB_URL = DB_URL;
		this.DB_NAME = DB_NAME;
		this.COLLECTION_NAME = COLLECTION_NAME;

		this.mongoClient = new MongoClient(this.DB_URL);
	}

	async init(): Promise<void> {
		try {
			await this.mongoClient.connect(); // Throws if the repo is unreachable.
		} catch (e: unknown) {
			throw new UnableToInitRepoError((e as any)?.message);
		}
		// The following doesn't throw if the repo is unreachable, nor if the db or collection don't exist.
		this.partyAssociations = this.mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
	}

	async destroy(): Promise<void> {
		await this.mongoClient.close(); // Doesn't throw if the repo is unreachable.
	}

	
    async getPartyByTypeAndId(partyType: String, partyId: String): Promise<IParty | null> {
        try {
			// This will throw if not found
			const foundParty: any = await this.partyAssociations.findOne(
				{
					id: partyId,
					type: partyType
				},
			);

			return foundParty as IParty;
		} catch (e: unknown) {
			throw new UnableToGetPartyError();
		}
    }

    async getPartyByTypeAndIdAndSubId(partyType: String, partyId: String, partySubId: String): Promise<IParty | null> {
        try {
			const foundParty: any = await this.partyAssociations.findOne(
				{
					id: partyId,
					type: partyType,
					subId: partySubId
				},
			);

			return foundParty as IParty;
		} catch (e: unknown) {
			throw new UnableToGetPartyError();
		}
    }
    async associatePartyByTypeAndId(partyType: String, partyId: String): Promise<IPartyAccount | null> {
		let partyAssociationExists: boolean;
		try {
			partyAssociationExists = await this.associatedPartyExistsByTypeAndId(partyType, partyId);
		} catch (e: unknown) {
			throw new UnableToStorePartyAssociationError((e as any)?.message);
		}
		if (partyAssociationExists) {
			throw new PartyAssociationAlreadyExistsError();
		}
		try {
			return await this.partyAssociations.insertOne({
				id: partyId,
				type: partyType,
			}) as unknown as IPartyAccount;
		} catch (e: unknown) {
			throw new Error((e as any)?.message);
		}
    }

    async associatePartyByTypeAndIdAndSubId(partyType: String, partyId: String, partySubId: String): Promise<IPartyAccount | null> {
		let partyAssociationExists: boolean;
		try {
			partyAssociationExists = await this.associatedPartyExistsByTypeAndIdAndSubId(partyType, partyId, partySubId);
		} catch (e: unknown) {
			throw new UnableToStorePartyAssociationError((e as any)?.message);
		}
		if (partyAssociationExists) {
			throw new PartyAssociationAlreadyExistsError();
		}
		try {
			return await this.partyAssociations.insertOne({
				id: partyId,
				type: partyType,
				subId: partySubId
			}) as unknown as IPartyAccount;
		} catch (e: unknown) {
			throw new Error((e as any)?.message);
		}
    }

    async disassociatePartyByTypeAndId(partyType: String, partyId: String): Promise<IPartyAccount | null> {
		let partyAssociationExists: boolean;
		try {
			partyAssociationExists = await this.associatedPartyExistsByTypeAndId(partyType, partyId);
		} catch (e: unknown) {
			throw new UnableToStorePartyAssociationError((e as any)?.message);
		}
		try {
			return await this.partyAssociations.deleteOne({
				id: partyId,
				type: partyType,
			}) as unknown as IPartyAccount;
		} catch (e: unknown) {
			throw new Error((e as any)?.message);
		}
    }

    async disassociatePartyByTypeAndIdAndSubId(partyType: String, partyId: String, partySubId: String): Promise<IPartyAccount | null> {
		let partyAssociationExists: boolean;
		try {
			partyAssociationExists = await this.associatedPartyExistsByTypeAndIdAndSubId(partyType, partyId, partySubId);
		} catch (e: unknown) {
			throw new UnableToStorePartyAssociationError((e as any)?.message);
		}

		try {
			return await this.partyAssociations.deleteOne({
				id: partyId,
				type: partyType,
				subId: partySubId
			}) as unknown as IPartyAccount;
		} catch (e: unknown) {
			throw new Error((e as any)?.message);
		}
    }

    async createParty(type: String, id: String): Promise<IPartyAccount | null> {
        throw new Error("Method not implemented.");
    }

    async deleteParty(type: String, id: String): Promise<void> {
        throw new Error("Method not implemented.");
    }

	private async associatedPartyExistsByTypeAndId(partyType: String, partyId: String): Promise<boolean> {
		try {
			const partyAssociation: any = await this.partyAssociations.findOne({
				id: partyId,
				type: partyType
			}); 
			return partyAssociation !== null;
		} catch (e: unknown) {
			throw new UnableToGetPartyError((e as any)?.message);
		}
	}

	private async associatedPartyExistsByTypeAndIdAndSubId(partyType: String, partyId: String, partySubId: String): Promise<boolean> {
		try {
			const partyAssociation: any = await this.partyAssociations.findOne({
				id: partyId,
				type: partyType,
				subId: partySubId
			}); 
			return partyAssociation !== null;
		} catch (e: unknown) {
			throw new UnableToGetPartyError((e as any)?.message);
		}
	}
}

