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

import { AccountLookupHttpClient } from "../../src";
import { ILogger,ConsoleLogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import {AuthenticatedHttpRequester, IAuthenticatedHttpRequester} from '@mojaloop/security-bc-client-lib';
import { HttpAccountLookupServiceMock } from "../mocks/http_account_lookup_service_mock";
import { FSP_ID, FSP_ID2, FSP_ID_WITH_CURRENCY_EUR, FSP_ID_WITH_CURRENCY_USD, FSP_ID_WITH_SUB_TYPE, ID_1, ID_2, PARTY_ID, PARTY_TYPE } from "../mocks/data";
import { ParticipantLookup } from "@mojaloop/account-lookup-bc-domain-lib";
import nock from "nock";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

let accountLookupServiceMock : HttpAccountLookupServiceMock;
let accountLookupClient: AccountLookupHttpClient;
let authRequester: IAuthenticatedHttpRequester;

const BASE_URL = "http://localhost:3301";
const TOKEN_URL = "http://localhost:3302/token";
const USERNAME="user";
const PASSWORD = "superPass";
const CLIENT_ID = "security-bc-ui";
const CLIENT_SECRET = "client_secret";

describe("Client - Account Lookup Client Unit tests", () => {
    beforeAll(async () => {
        authRequester = new AuthenticatedHttpRequester(logger, TOKEN_URL);
        authRequester.setUserCredentials(CLIENT_ID, USERNAME, PASSWORD);
        authRequester.setAppCredentials(CLIENT_ID, CLIENT_SECRET);
        // accountLookupServiceMock = new HttpAccountLookupServiceMock(BASE_URL, TOKEN_URL);
        // accountLookupServiceMock.setUp();
        accountLookupClient = new AccountLookupHttpClient(logger, BASE_URL, authRequester, 1000, 200000000);
    });

    beforeEach(async () => {
        jest.setTimeout(600000000);
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    // test("GET - participantLookUp - should throw error if endpoint is not found", async () => {
    //     // Arrange
    //     const partyId = "error";
    //     const partyType = "error";
    //     const currency = "error";

    //     // Act
    //     const result = accountLookupClient.participantLookUp(partyId, partyType, currency);

    //     // Assert
    //     await expect(result).rejects.toThrowError();
    // });


    // test("GET - participantLookUp - should be able to get individual fspId using partyId and partyType", async () => {
    //     //Arrange
    //     nock(BASE_URL)
    //         .get(`/account-lookup/${PARTY_ID}/${PARTY_TYPE}`)
    //         .reply(200, FSP_ID);

    //     // Act
    //     const result = await accountLookupClient.participantLookUp(PARTY_ID, PARTY_TYPE, null);

    //     // Assert
    //     expect(result).toEqual(FSP_ID);
    // });

    // test("GET - participantLookUp - should be able to get individual fspId using partyId and partyType and currency", async () => {
    //     // Act
    //     const result = await accountLookupClient.participantLookUp(PARTY_ID, PARTY_TYPE, "EUR");

    //     // Assert
    //     expect(result).toEqual(FSP_ID_WITH_CURRENCY_EUR);
    // });

    // test("POST - participantBulkLookUp - should throw error if endpoint is not found", async () => {
    //     // Arrange
    //     const id= "error";
    //     const body: ParticipantLookup = {
    //         partyId: "error",
    //         partyType: "error",
    //         currency: "error"
    //     }

    //     const request = {[id]: body};

    //     // Act
    //     // @ts-ignore
    //     const result = accountLookupClient.participantBulkLookUp(request);

    //     // Assert
    //     await expect(result).rejects.toThrowError();

    // });

    // test("POST - participantBulkLookUp - should return the list of fspIds for the request", async () => {
    //     // Arrange
    //     const id= ID_1;
    //     const firstParticipant: ParticipantLookup = {
    //         partyId: PARTY_ID,
    //         partyType: PARTY_TYPE,
    //         currency: null
    //     }

    //     const id2= ID_2;
    //     const secondParticipant: ParticipantLookup = {
    //         partyId: PARTY_ID,
    //         partyType: PARTY_TYPE,
    //         currency: "USD"
    //     }

    //     const request = {[id]: firstParticipant, [id2]: secondParticipant};

    //     // Act
    //     // @ts-ignore
    //     const result = await accountLookupClient.participantBulkLookUp(request);

    //     // Assert
    //     expect(result).toStrictEqual({
    //         [id]: FSP_ID,
    //         [id2]: FSP_ID2
    //     });

    // });


    // test("POST - participantBulkLookUp - should return bad request when body is incorrect", async () => {
    //     // Arrange
    //     const id= ID_1;
    //     const firstParticipant  = {
    //         currency: null
    //     } as any;

    //     const id2= ID_2;
    //     const secondParticipant: ParticipantLookup = {
    //         partyId: PARTY_ID,
    //         partyType: PARTY_TYPE,
    //         currency: "USD"
    //     }

    //     const request:Map<string,ParticipantLookup> = new Map();
    //     request.set(id, firstParticipant);
    //     request.set(id2, secondParticipant);

    //     // Act
    //     const result = accountLookupClient.participantBulkLookUp(request);

    //     // Assert
    //     await expect(result).rejects.toThrowError("Unable to Get FspId Bulk");

    // });

 });

