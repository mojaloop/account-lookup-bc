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
IParty,
IPartyAccount,
IParticipantAccount,
UnableToInitOracleProviderError,
PartyAssociationAlreadyExistsError,
PartyAssociationDoesntExistsError,
UnableToGetPartyError,
UnableToGetParticipantError,
UnableToStorePartyAssociationError,
UnableToDisassociatePartyError,
NoSuchPartyError,
IParticipant,
NoSuchParticipantError,
UnableToDisassociateParticipantError,
ParticipantAssociationDoesntExistsError,
ParticipantAssociationAlreadyExistsError,
UnableToStoreParticipantAssociationError
} from "@mojaloop/account-lookup-bc-domain";
import { IOracleProvider } from "@mojaloop/account-lookup-bc-domain";
import { MongoQueryError } from "./types";

export class MongoOracleProviderRepo implements IOracleProvider{
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly DB_URL: string;
	private readonly DB_NAME: string;
	private readonly COLLECTION_NAME: string;
	// Other properties.
	private readonly mongoClient: MongoClient;
	private partyAssociations: Collection;
	private parties: Collection;
	private participantAssociations: Collection;
	private participants: Collection;

	id: string;

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
			throw new UnableToInitOracleProviderError((e as MongoQueryError)?.message);
		}
			// The following doesn't throw if the repo is unreachable, nor if the db or collection don't exist.
			this.partyAssociations = this.mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
			this.parties = this.mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
			this.participantAssociations = this.mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
			this.participants = this.mongoClient.db(this.DB_NAME).collection(this.COLLECTION_NAME);
		}

	async destroy(): Promise<void> {
		await this.mongoClient.close();
	}

	//Party.
	async getPartyByTypeAndId(partyType: string, partyId: string): Promise<IParty | null> {
		let party:IParty|Error | undefined;

		try {
			const data = await this.parties.findOne(
				{
					id: partyId,
					type: partyType
				},
			);

			if(!data) {
				throw new NoSuchPartyError();
			}

			party = data as unknown as IParty;
		} catch (e: unknown) {
			throw new UnableToGetPartyError();
		}

		return party;
	}

	async getPartyByTypeAndIdAndSubId(partyType: string, partyId: string, partySubId: string): Promise<IParty | null> {
		let party:IParty|Error | undefined;

		try {
			const data = await this.parties.findOne({
				id: partyId,
				type: partyType,
				subId: partySubId
			});

			if(!data) {
				throw new NoSuchPartyError();
			}

			party = data as unknown as IParty;
		} catch (e: unknown) {
			throw new UnableToGetPartyError();
		}

		return party;
	}

	async associatePartyByTypeAndId(partyType: string, partyId: string): Promise<null> {
		const association = await this.associatedPartyExistsByTypeAndId(partyType, partyId);

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

	async associatePartyByTypeAndIdAndSubId(partyType: string, partyId: string, partySubId: string): Promise<null> {
		const association = await this.associatedPartyExistsByTypeAndIdAndSubId(partyType, partyId, partySubId);

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

	async disassociatePartyByTypeAndId(partyType: string, partyId: string): Promise<null> {
		const association = await this.associatedPartyExistsByTypeAndId(partyType, partyId);

		if (!association) {
			throw new PartyAssociationDoesntExistsError();
		}

		try {
			await this.partyAssociations.deleteOne({
				id: partyId,
				type: partyType,
			}) as unknown as IPartyAccount;

			return null;
		} catch (e: unknown) {
			throw new UnableToDisassociatePartyError();
		}
	}

	async disassociatePartyByTypeAndIdAndSubId(partyType: string, partyId: string, partySubId: string): Promise<null> {
		const association = await this.associatedPartyExistsByTypeAndId(partyType, partyId);

		if (!association) {
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
			throw new UnableToDisassociatePartyError();
		}
	}

	//Participant
	async getParticipantByTypeAndId(participantType: string, participantId: string): Promise<IParticipant | null> {
		let participant:IParticipant|Error | undefined;

		try {
			const data = await this.parties.findOne({
				id: participantId,
				type: participantType
			});

			if(!data) {
				throw new NoSuchParticipantError();
			}

			participant = data as unknown as IParticipant;
		} catch (e: unknown) {
			throw new UnableToGetParticipantError();
		}

		return participant;
	}

	async getParticipantByTypeAndIdAndSubId(participantType: string, participantId: string, participantSubId: string): Promise<IParticipant | null> {
		let participant:IParticipant|Error | undefined;

		try {
			const data = await this.parties.findOne({
				id: participantId,
				type: participantType,
				subId: participantSubId
			});

			if(!data) {
				throw new NoSuchParticipantError();
			}

			participant = data as unknown as IParticipant;
		} catch (e: unknown) {
			throw new UnableToGetParticipantError();
		}

		return participant;
	}

	async associateParticipantByTypeAndId(participantType: string, participantId: string): Promise<null> {
		const association = await this.associatedParticipantExistsByTypeAndId(participantType, participantId);

		if (association) {
			throw new ParticipantAssociationAlreadyExistsError();
		}

		try {
			await this.participantAssociations.insertOne({
				id: participantId,
				type: participantType,
			}) as unknown as IParticipantAccount;

			return null;
		} catch (e: unknown) {
			throw new UnableToStoreParticipantAssociationError();
		}
	}

	async associateParticipantByTypeAndIdAndSubId(participantType: string, participantId: string, participantSubId: string): Promise<null> {
		const association = await this.associatedParticipantExistsByTypeAndIdAndSubId(participantType, participantId, participantSubId);

		if (association) {
			throw new ParticipantAssociationAlreadyExistsError();
		}

		try {
			await this.participantAssociations.insertOne({
				id: participantId,
				type: participantType,
			}) as unknown as IParticipantAccount;

			return null;
		} catch (e: unknown) {
			throw new UnableToStoreParticipantAssociationError();
		}
	}

	async disassociateParticipantByTypeAndId(participantType: string, participantId: string): Promise<null> {
		const association = await this.associatedParticipantExistsByTypeAndId(participantType, participantId);

		if (!association) {
			throw new ParticipantAssociationDoesntExistsError();
		}

		try {
			await this.participantAssociations.deleteOne({
				id: participantId,
				type: participantType,
			}) as unknown as IParticipantAccount;

			return null;
		} catch (e: unknown) {
			throw new UnableToDisassociateParticipantError();
		}
	}

	async disassociateParticipantByTypeAndIdAndSubId(participantType: string, participantId: string, participantSubId: string): Promise<null> {
		const association = await this.associatedParticipantExistsByTypeAndId(participantType, participantId);

		if (!association) {
			throw new ParticipantAssociationDoesntExistsError();
		}

		try {
			await this.participantAssociations.deleteOne({
				id: participantId,
				type: participantType,
				subId: participantSubId
			}) as unknown as IParticipantAccount;

			return null;
		} catch (e: unknown) {
			throw new UnableToDisassociateParticipantError();
		}
	}


	// Private.
	private async associatedPartyExistsByTypeAndId(partyType: string, partyId: string): Promise<boolean> {
		try {
			const partyAssociation: WithId<Document> | null = await this.partyAssociations.findOne({
				id: partyId,
				type: partyType
			}); 
			
			return partyAssociation !== null;
		} catch (e: unknown) {
			throw new UnableToGetPartyError((e as MongoQueryError)?.message);
		}
	}

	private async associatedPartyExistsByTypeAndIdAndSubId(partyType: string, partyId: string, partySubId: string): Promise<boolean> {
		try {
			const partyAssociation: WithId<Document> | null = await this.partyAssociations.findOne({
				id: partyId,
				type: partyType,
				subId: partySubId
			});

			return partyAssociation !== null;
		} catch (e: unknown) {
			throw new UnableToGetPartyError((e as MongoQueryError)?.message);
		}
	}

	private async associatedParticipantExistsByTypeAndId(partyType: string, partyId: string): Promise<boolean> {
		try {
			const partyAssociation: WithId<Document> | null = await this.partyAssociations.findOne({
				id: partyId,
				type: partyType
			});

			return partyAssociation !== null;
			} catch (e: unknown) {
				throw new UnableToGetParticipantError((e as MongoQueryError)?.message);
			}
		}

	private async associatedParticipantExistsByTypeAndIdAndSubId(partyType: string, partyId: string, partySubId: string): Promise<boolean> {
		try {
			const partyAssociation: WithId<Document> | null = await this.partyAssociations.findOne({
				id: partyId,
				type: partyType,
				subId: partySubId
			});

			return partyAssociation !== null;
		} catch (e: unknown) {
			throw new UnableToGetParticipantError((e as MongoQueryError)?.message);
		}
	}
}

