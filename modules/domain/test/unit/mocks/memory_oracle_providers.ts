/**
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
     IParty,
	 UnableToDisassociatePartyError,
 } from "../../../src";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { mockedParties, mockedPartyAssociations } from "./data";
import { UnableToCreatePartyAssociationError } from "@mojaloop/account-lookup-bc-client";

 export class MemoryOracleProvider implements IOracleProvider {
	id: string;
	private readonly logger: ILogger;

	private readonly parties: Map<{partyId:string, partyType:string, partySubId?:string}, IParty|Error>;
	private readonly partyAssociations: Map<{partyType:string,partyId:string,partySubId?:string}, null| Error>;

	constructor(
		logger: ILogger,
	) {
		this.logger = logger;
		this.parties = mockedParties;
		this.partyAssociations = mockedPartyAssociations;
	}


	async init(): Promise<void> {
	}

	async destroy(): Promise<void> {
	}

	async getPartyByTypeAndId(partyType:string, partyId:string):Promise<IParty|null> {
		
		let party:IParty|Error | undefined;

		mockedParties.forEach((partyFound:IParty| Error, key) => {
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

	async getPartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<IParty|null> {
		let party:IParty| Error | undefined;

		mockedParties.forEach((partyFound:IParty|Error, key) => {
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

	async associatePartyByTypeAndId(partyType:string, partyId:string):Promise<null> {
		let association:null| Error | undefined;

		mockedPartyAssociations.forEach((partyFound:null|Error, key) => {
			if(key.partyId === partyId && key.partyType === partyType){
				association=partyFound;
			}
		});

		if(association===null){
			return null;
		}
		
		throw new UnableToCreatePartyAssociationError();
	}

	async associatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<null> {
		let association:null| Error | undefined;

		mockedPartyAssociations.forEach((partyFound:null|Error, key) => {
			if(key.partyId === partyId && key.partyType === partyType && key.partySubId === partySubId){
				association=partyFound;
			}
		});

		if(association===null){
			return null;
		}
		
		throw new UnableToCreatePartyAssociationError();
	}

	async disassociatePartyByTypeAndId(partyType:string, partyId:string):Promise<null> {
		let association:null| Error | undefined;

		mockedPartyAssociations.forEach((partyFound:null|Error, key) => {
			if(key.partyId === partyId && key.partyType === partyType){
				association=partyFound;
			}
		});

		if(association===null){
			return null;
		}
		
		throw new UnableToDisassociatePartyError();
	}

	async disassociatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<null> {
		let association:null| Error | undefined;

		mockedPartyAssociations.forEach((partyFound:null|Error, key) => {
			if(key.partyId === partyId && key.partyType === partyType && key.partySubId === partySubId){
				association=partyFound;
			}
		});

		if(association===null){
			return null;
		}
		
		throw new UnableToDisassociatePartyError();
	}
}
