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
IPartyAccount,
UnableToInitOracleProviderError,
PartyAssociationAlreadyExistsError,
PartyAssociationDoesntExistsError,
UnableToGetPartyError,
UnableToGetParticipantError,
UnableToStorePartyAssociationError,
UnableToDisassociatePartyError,
NoSuchParticipantError} from "@mojaloop/account-lookup-bc-domain";
import { IOracleProvider } from "@mojaloop/account-lookup-bc-domain";
import { UnableToCloseDatabaseConnectionError } from "../errors";

export class MongoOracleProviderRepo implements IOracleProvider{
	// Properties received through the constructor.
	private readonly _logger: ILogger;
	private readonly DB_URL: string;
	private readonly DB_NAME: string;
	private readonly COLLECTION_NAME: string;
	// Other properties.
	private readonly _mongoClient: MongoClient;
	private partyAssociations: Collection;
	private parties: Collection;
	private participantAssociations: Collection;
	private participants: Collection;

	id: string;
	partyType: string;

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


	async init(): Promise<void> {
		try {
			await this._mongoClient.connect(); // Throws if the repo is unreachable.
		} catch (e: any) {
			this._logger.fatal(`Unable to connect to the mongo database: ${this.DB_URL}: ${e.message}`);
			throw new UnableToInitOracleProviderError();
		}
			// The following doesn't throw if the repo is unreachable, nor if the db or collection don't exist.
			this.partyAssociations = this._mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
			this.parties = this._mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
			this.participantAssociations = this._mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
			this.participants = this._mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
		}

	async destroy(): Promise<void> {
		try{
			await this._mongoClient.close();
		}
		catch(e: any){
			this._logger.fatal(`Unable to close the mongo database: ${this.DB_URL}: ${e.message}`);
			throw new UnableToCloseDatabaseConnectionError();
		}
		
	}

	//Participant
	async getParticipant(partyId: string): Promise<string> {
		let participant = null;

		try {
			const data = await this.parties.findOne({
				partyId: partyId,
			});

			if(!data) {
                throw new NoSuchParticipantError();
            }

			participant = data.participantId as unknown as string;

		} catch (e: any) {
			this._logger.debug(`Unable to get participant for partyId ${partyId}: ${e.message}`);
			throw new UnableToGetParticipantError();
		}

		return participant;
	}

	//Party.
	async associateParty(partyId: string): Promise<null> {
		const association = await this.associatedPartyExists(partyId);

		if (association) {
			throw new PartyAssociationAlreadyExistsError();
		}

		try {
			await this.partyAssociations.insertOne({
				partyId: partyId,
			}) as unknown as IPartyAccount;

			return null;
		} catch (e: any) {
			this._logger.debug(`Unable to store party association for partyId ${partyId}: ${e.message}`);
			throw new UnableToStorePartyAssociationError();
		}
	}


	async disassociateParty(partyId: string): Promise<null> {
		const association = await this.associatedPartyExists(partyId);

		if (!association) {
			throw new PartyAssociationDoesntExistsError();
		}

		try {
			await this.partyAssociations.deleteOne({
				partyId: partyId,
			}) as unknown as IPartyAccount;

			return null;
		} catch (e: any) {
			this._logger.debug(`Unable to disassociate party for partyId ${partyId}: ${e.message}`);
			throw new UnableToDisassociatePartyError();
		}
	}

	// Private.
	private async associatedPartyExists(partyId: string): Promise<boolean> {
		try {
			const partyAssociation: WithId<Document> | null = await this.partyAssociations.findOne({
				partyId: partyId,
			}); 
			
			return partyAssociation !== null;
		} catch (e: any) {
			this._logger.debug(`Unable to check if party association exists for partyId ${partyId}: ${e.message}`);
			throw new UnableToGetPartyError();
		}
	}

}

