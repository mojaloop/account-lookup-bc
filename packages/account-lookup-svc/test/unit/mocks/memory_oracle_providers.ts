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
     IOracleProvider,
     IParticipant,
     IParty,
	 UnableToAssociatePartyError,
	 UnableToDisassociatePartyError,
 } from "@mojaloop/account-lookup-bc-domain";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";


 export class MemoryOracleProvider implements IOracleProvider {
	id: string;
	private readonly logger: ILogger;

	

	constructor(
		logger: ILogger,
	) {
		this.logger = logger;
	}

	async init(): Promise<void> {
		return Promise.resolve();
	}

	async destroy(): Promise<void> {
		return Promise.resolve();
	}

	getParticipantByTypeAndId(participantType: string, participantId: string): Promise<IParticipant | null> {
		 throw new Error("Method not implemented.");
	 }
	 getParticipantByTypeAndIdAndSubId(participantType: string, participantId: string, participantSubId: string): Promise<IParticipant | null> {
		 throw new Error("Method not implemented.");
	 }
	 associateParticipantByTypeAndId(participantType: string, participantId: string): Promise<null> {
		 throw new Error("Method not implemented.");
	 }
	 associateParticipantByTypeAndIdAndSubId(participantType: string, participantId: string, participantSubId: string): Promise<null> {
		 throw new Error("Method not implemented.");
	 }
	 disassociateParticipantByTypeAndId(participantType: string, participantId: string): Promise<null> {
		 throw new Error("Method not implemented.");
	 }
	 disassociateParticipantByTypeAndIdAndSubId(participantType: string, participantId: string, participantSubId: string): Promise<null> {
		 throw new Error("Method not implemented.");
	 }

	async getPartyByTypeAndId(partyType:string, partyId:string):Promise<IParty|null> {
		
		throw new Error("Method not implemented.");
	}

	async getPartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<IParty|null> {
		throw new Error("Method not implemented.");
	}

	async associatePartyByTypeAndId(partyType:string, partyId:string):Promise<null> {
		throw new Error("Method not implemented.");
	}

	async associatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<null> {
		throw new Error("Method not implemented.");
	}

	async disassociatePartyByTypeAndId(partyType:string, partyId:string):Promise<null> {
		throw new Error("Method not implemented.");
	}

	async disassociatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<null> {
		throw new Error("Method not implemented.");
	}
}
