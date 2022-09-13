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


import { IParticipant, IParty } from "../types";
 
/* infratructure interfaces */

export interface IOracleFinder{
    // Init and destroy.
	init(): Promise<void>;
	destroy(): Promise<void>;
    // Gets.
    getOracleForType(type:string):Promise<string | undefined>;
}


export interface IOracleProvider{
    // Properties.
    id: string;
    // Init and destroy.
	init(): Promise<void>;
	destroy(): Promise<void>;
    // Gets.
    getPartyByTypeAndId(partyType:string, partyId:string):Promise<IParty|null>;
    getPartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<IParty|null>;
    getParticipantByTypeAndId(participantType:string, participantId:string):Promise<string|null>;
    getParticipantByTypeAndIdAndSubId(participantType:string, participantId:string, participantSubId:string):Promise<string|null>;
    // Stores.
    associatePartyByTypeAndId(partyType:string, partyId:string):Promise<null>;
    associatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<null>;
    associateParticipantByTypeAndId(participantType:string, participantId:string):Promise<null>;
    associateParticipantByTypeAndIdAndSubId(participantType:string, participantId:string, participantSubId:string):Promise<null>;
    // Updates.
    disassociatePartyByTypeAndId(partyType:string, partyId:string):Promise<null>;
    disassociatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<null>;
    disassociateParticipantByTypeAndId(participantType:string, participantId:string):Promise<null>;
    disassociateParticipantByTypeAndIdAndSubId(participantType:string, participantId:string, participantSubId:string):Promise<null>;
}

export interface IParticipantService {
    getParticipantInfo(fspId: string):Promise<IParticipant|null>;
}

