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


import { Oracle } from "../../../src/interfaces/infrastructure";
import { IParticipant } from "../../../src/types";

export const mockedPartyIds = ["party1", "party2", "party3","partyError"];

export const mockedPartyTypes = ["bank", "creditUnion", "insurance"];

export const mockedPartySubTypes = ["savings", "checking", "order"];

export const mockedParticipantIds = ["participant1", "participant2", "participant3","participantError","participantNull"];

export const mockedOracleAdapters: Oracle [] = [
    {
        id: "1",
        name: "oracle1",
        endpoint: null,
        partyType: mockedPartyTypes[0],
        partySubType: mockedPartySubTypes[0],
        type: "builtin",
    },
    {
        id: "1.1",
        name: "oracle1.1",
        endpoint: null,
        partyType: mockedPartyTypes[0],
        partySubType: null,
        type: "builtin",
    },
    {
        id: "1.2",
        name: "oracle1.2",
        endpoint: null,
        partyType: mockedPartyTypes[0],
        partySubType: mockedPartySubTypes[1],
        type: "builtin",
    },
    {
        id: "2",
        name: "oracle2",
        endpoint: null,
        partyType: mockedPartyTypes[1],
        partySubType: mockedPartySubTypes[1],
        type: "builtin",
    },
    {
        id: "2.2",
        name: "oracle2.2",
        endpoint: null,
        partyType: mockedPartyTypes[1],
        partySubType: null,
        type: "builtin",
    },
    {
        id: "3",
        name: "oracle3",
        endpoint: "http://bank-oracle.com",
        partyType: mockedPartyTypes[2],
        partySubType: mockedPartySubTypes[2],
        type: "remote-http",
    },
    {
        id: "3.3",
        name: "oracle3.3",
        endpoint: "http://bank-oracle.com",
        partyType: mockedPartyTypes[2],
        partySubType: null,
        type: "remote-http",
    }

];

export const mockedParticipantFspIds = ["fspId1","fspId2","fspId3","fspId4","fspId5"];


export type OracleAdapterResults = {
    partyType: string;
    partySubType: string|null;
    fspId: string | null;
}

export const mockedOracleAdapterResults:OracleAdapterResults[] = [
    {
        partyType: mockedPartyTypes[0],
        partySubType: mockedPartySubTypes[0],
        fspId: mockedParticipantFspIds[0],
    },
    {
        partyType: mockedPartyTypes[0],
        partySubType: null,
        fspId: mockedParticipantFspIds[0],
    },
    {
        partyType: mockedPartyTypes[1],
        partySubType: mockedPartySubTypes[1],
        fspId: mockedParticipantFspIds[1],
    },
    {
        partyType: mockedPartyTypes[1],
        partySubType: null,
        fspId: mockedParticipantFspIds[1],
    },
    {
        partyType: mockedPartyTypes[2],
        partySubType: mockedPartySubTypes[2],
        fspId: mockedParticipantFspIds[2],
    },
    {
        partyType: mockedPartyTypes[2],
        partySubType: null,
        fspId: mockedParticipantFspIds[2],
    },
    {
        partyType: mockedPartyTypes[0],
        partySubType: mockedPartySubTypes[1],
        fspId: null,
    },
];



// TODO: Review this part



export const mockedParticipantResultIds = ["receivedParticipant1", "receivedParticipant2", "receivedParticipant3"];

export const mockedParticipantResultSubIds = ["receivedParticipantSub1", "receivedParticipantSub2", "receivedParticipantSub3"];


export const mockedParticipants: Map<string, IParticipant| null> = new Map();
mockedParticipants.set(mockedParticipantFspIds[0],{id: mockedParticipantResultIds[0], subId: mockedParticipantResultSubIds[0],type: "individual", isActive: true});
mockedParticipants.set(mockedParticipantFspIds[2],{id: mockedParticipantResultIds[1], subId: mockedParticipantResultSubIds[1],type: "individual", isActive: true});
mockedParticipants.set(mockedParticipantFspIds[4],null);


