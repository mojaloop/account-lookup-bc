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
	PartyAssociationDoesntExistsError,
	UnableToGetPartyError,
	UnableToStorePartyAssociationError,
	UnableToInitRepoError,
	UnableToDisassociatePartyError,
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
	parties: Map<{partyId:string, partyType:string, partySubId?:string}, IParty|Error | undefined>;
	// private readonly partyAssociations: Map<{partyType:string,partyId:string,partySubId?:string}, null| undefined>;
	private partyAssociations: Collection;

	id: String;
	private _type: String;

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


	
	async getPartyByTypeAndId(partyType:string, partyId:string):Promise<IParty|null> {
		
		let party:IParty|Error | undefined;

		this.parties.forEach((partyFound:any, key) => {
			if(key.partyId === partyId && key.partyType === partyType){
				party=partyFound;
			}
		});

		if(party instanceof Error){
			throw party;
		}
		
		if (!party) {
			return null;
		}
		return party;
	}
    // async getPartyByTypeAndId(partyType: String, partyId: String): Promise<IParty | null> {
    //     try {
	// 		// This will throw if not found
	// 		const foundParty: any = await this.partyAssociations.findOne(
	// 			{
	// 				id: partyId,
	// 				type: partyType
	// 			},
	// 		);

	// 		return foundParty as IParty;
	// 	} catch (e: unknown) {
	// 		throw new UnableToGetPartyError();
	// 	}
    // }

    // async getPartyByTypeAndIdAndSubId(partyType: String, partyId: String, partySubId: String): Promise<IParty | null> {
    //     try {
	// 		const foundParty: any = await this.parties.findOne(
	// 			{
	// 				id: partyId,
	// 				type: partyType,
	// 				subId: partySubId
	// 			},
	// 		);

	// 		return foundParty as IParty;
	// 	} catch (e: unknown) {
	// 		throw new UnableToGetPartyError();
	// 	}
    // }

	async getPartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<IParty|null> {
		let party:IParty| Error | undefined;

		this.parties.forEach((partyFound:IParty|Error | undefined, key) => {
			if(key.partyId === partyId && key.partyType === partyType && key.partySubId === partySubId){
				party=partyFound;
			}
		});

		if(party instanceof Error){
			throw party;
		}

		if (!party) {
			return null;
		}


		return party;
	}
	
    async associatePartyByTypeAndId(partyType: String, partyId: String): Promise<null> {
		let association: boolean;

		association = await this.associatedPartyExistsByTypeAndId(partyType, partyId);

		if (association) {
			throw new PartyAssociationAlreadyExistsError();
		}
		try {
			await this.partyAssociations.insertOne({
				id: partyId,
				type: partyType,
			}) as unknown as IPartyAccount;

			return null;
		} catch (e: unknown) {
			throw new UnableToStorePartyAssociationError();
		}
    }

    async associatePartyByTypeAndIdAndSubId(partyType: String, partyId: String, partySubId: String): Promise<null> {
		let association: boolean;

		association = await this.associatedPartyExistsByTypeAndIdAndSubId(partyType, partyId, partySubId);

		if (association) {
			throw new PartyAssociationAlreadyExistsError();
		}
		try {
			await this.partyAssociations.insertOne({
				id: partyId,
				type: partyType,
			}) as unknown as IPartyAccount;

			return null;
		} catch (e: unknown) {
			throw new UnableToStorePartyAssociationError();
		}
    }

    async disassociatePartyByTypeAndId(partyType: String, partyId: String): Promise<null> {
		let association: boolean;

		association = await this.associatedPartyExistsByTypeAndId(partyType, partyId);

		if (association) {
			throw new PartyAssociationAlreadyExistsError();
		}
		try {
			await this.partyAssociations.insertOne({
				id: partyId,
				type: partyType,
			}) as unknown as IPartyAccount;

			return null;
		} catch (e: unknown) {
			throw new UnableToStorePartyAssociationError();
		}
    }

    async disassociatePartyByTypeAndIdAndSubId(partyType: String, partyId: String, partySubId: String): Promise<null> {
		let partyAssociationExists: boolean;
		try {
			partyAssociationExists = await this.associatedPartyExistsByTypeAndIdAndSubId(partyType, partyId, partySubId);
		} catch (e: unknown) {
			throw new UnableToDisassociatePartyError((e as any)?.message);
		}

		if(partyAssociationExists) {
			throw new PartyAssociationDoesntExistsError();
		}			
	
		try {
			await this.partyAssociations.deleteOne({
				id: partyId,
				type: partyType,
				subId: partySubId
			}) as unknown as IPartyAccount;

			return null;
		} catch (e: unknown) {
			throw new UnableToDisassociatePartyError((e as any)?.message);
		}
    }

    async createParty(type: String, id: String): Promise<IPartyAccount | null> {
        throw new Error("Method not implemented.");
    }

    async deleteParty(type: String, id: String): Promise<void> {
        throw new Error("Method not implemented.");
    }

	// Public.
	public get type() {
        return this._type;
    }

    public set type(value: String) {

        this._type = value;
    }
	
	// Private.
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

	async setParties(parties: any) {
		this.parties = parties;
	}

	async deleteAll() {
		await this.partyAssociations.deleteMany({});
	}
}

