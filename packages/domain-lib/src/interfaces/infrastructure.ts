/**
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

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

import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import { Oracle, Association } from "../entities";
import { OracleType, AssociationsSearchResults } from "@mojaloop/account-lookup-bc-public-types-lib";


export interface IOracleFinder{
	init(): Promise<void>;
	destroy(): Promise<void>;
    addOracle(oracle: Oracle):Promise<void>;
    removeOracle(id: string):Promise<void>;
    getAllOracles():Promise<Oracle[]>;
    getOracleById(id:string):Promise<Oracle|null>;
    getOracleByName(name:string):Promise<Oracle|null>;
    getOracle(partyType:string, currency:string|null):Promise<Oracle | null>;
}

export interface IOracleProviderAdapter{
    oracleId: string;
    type:  OracleType;
    init(): Promise<void>;
    destroy(): Promise<void>;
    healthCheck(): Promise<boolean>;
    getParticipantFspId(partyType:string, partyId: string, partySubType:string | null, currency:string| null ):Promise<string|null>;
    associateParticipant(fspId:string, partyType:string, partyId: string, partySubType:string| null, currency:string| null):Promise<null>;
    disassociateParticipant(fspId:string, partyType:string, partyId: string, partySubType:string| null, currency:string| null):Promise<null>;
    getAllAssociations():Promise<Association[]>;
    searchAssociations(
        fspId:string|null,
        partyId:string|null,
        partyType:string|null,
        partySubType:string|null,
        currency:string|null,
        pageIndex?:number,
        pageSize?: number
    ): Promise<AssociationsSearchResults>;
    getSearchKeywords():Promise<{fieldName:string, distinctTerms:string[]}[]>
}

export interface IOracleProviderFactory {
    create(oracle: Oracle): IOracleProviderAdapter;
}

export interface IParticipantServiceAdapter {
    getParticipantInfo(fspId: string): Promise<IParticipant| null>;
    getParticipantsInfo(fspIds: string[]): Promise<IParticipant[]|null>;
}


