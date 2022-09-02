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


import { IParticipant, IParty } from "../types";


/* infratructure interfaces */

export interface IOracleFinder{
    // Init and destroy.
	init(): Promise<void>;
	destroy(): Promise<void>;
    // Gets.
    getOracleForType(type:String):Promise<String | undefined>;
}


export interface IOracleProvider{
    // Properties.
    id: String;
    // Init and destroy.
	init(): Promise<void>;
	destroy(): Promise<void>;
    // Gets.
    getPartyByTypeAndId(partyType:String, partyId:String):Promise<IParty|null>;
    getPartyByTypeAndIdAndSubId(partyType:String, partyId:String, partySubId:String):Promise<IParty|null>;
    getParticipantByTypeAndId(participantType:String, participantId:String):Promise<IParticipant|null>;
    getParticipantByTypeAndIdAndSubId(participantType:String, participantId:String, participantSubId:String):Promise<IParticipant|null>;
    // Stores.
    associatePartyByTypeAndId(partyType:String, partyId:String):Promise<null>;
    associatePartyByTypeAndIdAndSubId(partyType:String, partyId:String, partySubId:String):Promise<null>;
    associateParticipantByTypeAndId(participantType:String, participantId:String):Promise<null>;
    associateParticipantByTypeAndIdAndSubId(participantType:String, participantId:String, participantSubId:String):Promise<null>;
    // Updates.
    disassociatePartyByTypeAndId(partyType:String, partyId:String):Promise<null>;
    disassociatePartyByTypeAndIdAndSubId(partyType:String, partyId:String, partySubId:String):Promise<null>;
    disassociateParticipantByTypeAndId(participantType:String, participantId:String):Promise<null>;
    disassociateParticipantByTypeAndIdAndSubId(participantType:String, participantId:String, participantSubId:String):Promise<null>;
}

export interface IMessageHeader {
    [key: string]: string | Buffer;
}
export interface IMessage {
    value: Buffer | string | object | null;
    topic: string;
    key: Buffer | string | null;
    timestamp: number | null;
    headers: IMessageHeader[] | null;
}

export interface IMessagePublisher {
    init(): Promise<void>;
	destroy(): Promise<void>;
    send(message: IMessage | IMessage[] | any): Promise<void>;
}