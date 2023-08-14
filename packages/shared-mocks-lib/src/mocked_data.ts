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

import { Oracle } from "@mojaloop/account-lookup-bc-domain-lib";

export const mockedPartyIds = ["party1", "party2", "party3","partyError"];

export const mockedPartyTypes = ["bank", "creditUnion", "insurance", "not_included", "lender"];

export const mockedPartySubTypes = ["savings", "checking", "order"];

export const mockedParticipantIds = ["participant1", "participant2", "participant3","participantError","participantNull"];

export const notIncludedOracleAdapters: Oracle[] = [
    {
        id: "0",
        name: "oracle0",
        endpoint: null,
        partyType: mockedPartyTypes[3],
        type: "builtin",
        currency: "USD",
    },
    {
        id: "0.1",
        name: "oracle0.1",
        endpoint: null,
        partyType: mockedPartyTypes[3],
        type: "builtin",
        currency: "EUR",
    }
];

export const mockedOracleAdapters: Oracle [] = [
    {
        id: "1",
        name: "oracle1",
        endpoint: null,
        partyType: mockedPartyTypes[0],
        type: "builtin",
        currency: "USD",
    },
    {
        id: "1.1",
        name: "oracle1.1",
        endpoint: null,
        partyType: mockedPartyTypes[0],
        type: "builtin",
        currency: "EUR",
    },
    {
        id: "1.2",
        name: "oracle1.2",
        endpoint: null,
        partyType: mockedPartyTypes[0],
        type: "builtin",
        currency: "USD",
    },
    {
        id: "2",
        name: "oracle2",
        endpoint: null,
        partyType: mockedPartyTypes[1],
        type: "builtin",
        currency: "EUR",
    },
    {
        id: "2.2",
        name: "oracle2.2",
        endpoint: null,
        partyType: mockedPartyTypes[1],
        type: "builtin",
        currency: "USD",
    },
    {
        id: "3",
        name: "oracle3",
        endpoint: "http://bank-oracle.com",
        partyType: mockedPartyTypes[2],
        type: "remote-http",
        currency: "USD",
    },
    {
        id: "3.3",
        name: "oracle3.3",
        endpoint: "http://bank-oracle.com",
        partyType: mockedPartyTypes[2],
        type: "remote-http",
        currency: "EUR",
    }

];

export const mockedParticipantFspIds = ["fspId1","fspId2","fspId3","fspId4","fspId5"];


export type OracleAdapterResults = {
    partyType: string;
    partyId : string;
    fspId: string | null;
    association: boolean;
    disassociation: boolean;
    partySubType: string | null;
    currency: string | null;
}

export const mockedOracleAdapterResults:OracleAdapterResults[] = [
    {
        partyType: mockedPartyTypes[0],
        fspId: mockedParticipantFspIds[0],
        partyId: mockedPartyIds[0],
        association: true,
        disassociation: true,
        partySubType: null,
        currency: "USD"
    },
    {
        partyType: mockedPartyTypes[1],
        fspId: mockedParticipantFspIds[1],
        partyId: mockedPartyIds[1],
        association: false,
        disassociation: true,
        partySubType: null,
        currency: "EUR"
    },
    {
        partyType: mockedPartyTypes[1],
        partyId: mockedPartyIds[1],
        fspId: mockedParticipantFspIds[1],
        association: false,
        disassociation: false,
        partySubType: null,
        currency: "EUR"
    },
    {
        partyType: mockedPartyTypes[2],
        fspId: mockedParticipantFspIds[2],
        partyId: mockedPartyIds[2],
        association: true,
        disassociation: true,
        partySubType: null,
        currency: "USD"
    },
    {
        partyType: mockedPartyTypes[2],
        partyId: mockedPartyIds[2],
        fspId: mockedParticipantFspIds[2],
        association: false,
        disassociation: false,
        partySubType: null,
        currency: "USD"
    },
    {
        partyType: mockedPartyTypes[2],
        fspId: mockedParticipantFspIds[2],
        partyId: mockedPartyIds[2],
        association: true,
        disassociation: true,
        partySubType: null,
        currency: null
    },
    {
        partyType: mockedPartyTypes[0],
        partyId: mockedPartyIds[0],
        fspId: null,
        association: false,
        disassociation: false,
        partySubType: null,
        currency: null
    },
    {
        partyType: mockedPartyTypes[0],
        partyId: mockedPartyIds[0],
        fspId: mockedParticipantFspIds[3],
        association: false,
        disassociation: false,
        partySubType: null,
        currency: null
    },
    {
        partyType: mockedPartyTypes[0],
        partyId: mockedPartyIds[0],
        fspId: mockedParticipantFspIds[3],
        association: false,
        disassociation: false,
        partySubType: null,
        currency: null
    },
    {
        partyType: mockedPartyTypes[4],
        partyId: mockedPartyIds[0],
        fspId: mockedParticipantFspIds[0],
        association: false,
        disassociation: false,
        partySubType: null,
        currency: "USD"
    }
];

export const getParticipantFspIdForOracleTypeAndSubType = (partyType: string, _partySubType: string|null): string|null => {
    const result = mockedOracleAdapterResults.find((oracleAdapterResult) => {
        return oracleAdapterResult.partyType === partyType;
    });
    return result?.fspId ?? null;
};



