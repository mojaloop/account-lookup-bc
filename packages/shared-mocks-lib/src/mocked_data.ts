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

export const mockedPartyIds = ["party", "party1", "party2", "party3", "party4"];

export const mockedPartyTypes = ["bank", "creditUnion", "insurance", "lender", "issuer"];

export const mockedPartySubTypes = ["savings", "checking", "order", "loan", "credit"];

export const mockedParticipantIds = ["participant", "participant1", "participant2", "participant3", "participant4"];

export const mockedOracleAdapters: Oracle[] = [
  {
    id: "1",
    name: "oracle1",
    endpoint: null,
    partyType: mockedPartyTypes[0],
    type: "builtin",
    currency: "USD",
  },
  {
    id: "2",
    name: "oracle2",
    endpoint: null,
    partyType: mockedPartyTypes[0],
    type: "builtin",
    currency: "USD",
  },
  {
    id: "3",
    name: "oracle without fspId",
    endpoint: "http://bank-oracle.com",
    partyType: mockedPartyTypes[3],
    type: "remote-http",
    currency: "USD",
  },
  {
    id: "4",
    name: "oracle with error",
    endpoint: "http://bank-oracle.com",
    partyType: mockedPartyTypes[4],
    type: "remote-http",
    currency: "EUR",
  },
];

export const mockedParticipantFspIds = ["fspId", "fspId1", "fspId2", "fspId3", "fspId4"];

export type OracleAssociations = {
  partyType: string;
  partyId: string;
  fspId: string | null;
  hasError: boolean;
  partySubType: string | null;
  currency: string | null;
};

export const mockedOracleAssociations: OracleAssociations[] = [
  {
    partyType: mockedPartyTypes[0],
    fspId: mockedParticipantFspIds[0],
    partyId: mockedPartyIds[0],
    partySubType: mockedPartySubTypes[0],
    currency: "USD",
    hasError: false,
  },
  {
    partyType: mockedPartyTypes[2],
    fspId: null,
    partyId: mockedPartyIds[2],
    partySubType: mockedPartySubTypes[2],
    currency: "EUR",
    hasError: false,
  },
  {
    partyType: mockedPartyTypes[3],
    fspId: mockedParticipantFspIds[3],
    partyId: mockedPartyIds[3],
    partySubType: mockedPartySubTypes[3],
    currency: "EUR",
    hasError: true,
  },
  {
    partyType: mockedPartyTypes[4],
    fspId: null,
    partyId: mockedPartyIds[4],
    partySubType: mockedPartySubTypes[4],
    currency: "USD",
    hasError: false,
  },
];
