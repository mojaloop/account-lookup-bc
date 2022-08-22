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

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

 "use strict";

 import {
	 CurrencyType,
	 HttpResponse,
	 HttpStatusCode,
     IOracleProvider,
     IParty,
     IPartyAccount,
     NoSuchPartyAssociationError,
     PartyAssociationAlreadyExistsError
 } from "../../../src";
 import {Party} from '../../../src/entities/party'
 import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
 import * as uuid from "uuid";

 export class PartyAccount implements IPartyAccount {
	fspId: string;
	currency: string[];
	extensionList: string[];
}

export class MemoryOracleProvider implements IOracleProvider {
	// Properties received through the constructor.
	id: string;
	private readonly logger: ILogger;

	// Other properties.
	private readonly parties: Map<string, IParty>;
	private readonly partyAssociations: Map<string, IPartyAccount>;

	constructor(
		logger: ILogger,
	) {
		this.logger = logger;

		this.parties = new Map<string, IParty>();
		this.partyAssociations = new Map<string, IPartyAccount>();
	}


	async init(): Promise<void> {
	}

	async destroy(): Promise<void> {
	}

	async getPartyByTypeAndId(partyType:string, partyId:string):Promise<HttpResponse|null> {
		const partyIdentifier = partyType.concat(partyId);
		
		const partyAssociation = this.parties.get(partyIdentifier);

		if (!partyAssociation) {
			throw new NoSuchPartyAssociationError();
		}

		return {
			status: HttpStatusCode.OK,
			result: partyAssociation
		};
	}

	async getPartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<IParty|null> {
		return partyId as unknown as Promise<IParty>;
	}

	async associatePartyByTypeAndId(partyType:string, partyId:string):Promise<IPartyAccount|null> {
		const partyIdentifier = partyType.concat(partyId);
		
		if (this.partyAssociations.has(partyIdentifier)) {
			throw new PartyAssociationAlreadyExistsError();
		}

		
		const party = new Party(partyId,partyType,CurrencyType.EURO)

		const partyAssociationAccount = new PartyAccount()

		partyAssociationAccount.fspId = uuid.v4();
		partyAssociationAccount.currency = [];
		partyAssociationAccount.extensionList = [];

		this.parties.set(partyIdentifier, party);
		this.partyAssociations.set(partyIdentifier, partyAssociationAccount);

		return partyAssociationAccount;
	}

	async associatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<IPartyAccount|null> {
		return partyId as unknown as Promise<IPartyAccount>;
	}

	async disassociatePartyByTypeAndId(partyType:string, partyId:string):Promise<IPartyAccount|null> {
		return partyId as unknown as Promise<IPartyAccount>;
	}

	async disassociatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<IPartyAccount|null> {
		return partyId as unknown as Promise<IPartyAccount>;
	}
}
