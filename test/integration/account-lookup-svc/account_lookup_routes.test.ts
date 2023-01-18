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

import request from "supertest";
import { IOracleFinder, IOracleProviderFactory, IParticipantService, ParticipantLookup} from "@mojaloop/account-lookup-bc-domain";
import { MemoryOracleFinder,MemoryMessageProducer,MemoryOracleProviderFactory, MemoryMessageConsumer, MemoryParticipantService, mockedPartyIds, mockedPartyTypes, mockedParticipantFspIds, mockedPartySubTypes } from "@mojaloop/account-lookup-shared-mocks";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { start, stop } from "@mojaloop/account-lookup-bc-svc";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.ERROR);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService:IParticipantService = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const server = (process.env["ACCOUNT_LOOKUP_URL"] || "http://localhost:3030") + "/account-lookup";

describe("Account Lookup Routes - Integration", () => {

    beforeAll(async () => {
        await start(logger,mockedConsumer,mockedProducer, mockedOracleFinder, mockedOracleProviderFactory, mockedParticipantService);
    });

    afterAll(async () => {
        await stop();
    });

    test("GET - should fetch fspId for partyId and partyType", async () => {
        // Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];

        // Act
        const response = await request(server)
            .get(`/${partyId}/${partyType}`);
         
        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedParticipantFspIds[3]);
    });

    test("GET - should fetch null for partyId and partyType when no match", async () => {
        // Arrange
        const partyId = "non-existent-party-id";
        const partyType = "non-existent-party-type";

        // Act
        const response = await request(server)
            .get(`/${partyId}/${partyType}`);
         
        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual("");
    });

    test("GET - should fetch fspId for partyId, partyType and currency", async () => {
        // Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];
        const currency = "USD";

        // Act
        const response = await request(server)
            .get(`/${partyId}/${partyType}?currency=${currency}`);
         
        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedParticipantFspIds[0]);
    });

    test("GET - should fetch fspId for partyId, partyType and partySubType", async () => {
        // Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];

        // Act
        const response = await request(server)
            .get(`/${partyId}/${partyType}/${partySubType}`);
         
        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedParticipantFspIds[3]);
    });

    test("GET - should fetch fspId for partyId, partyType, partySubType and currency", async () => {
        // Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const currency = "USD";

        // Act
        const response = await request(server)
            .get(`/${partyId}/${partyType}/${partySubType}?currency=${currency}`);
         
        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedParticipantFspIds[0]);
    });
    
    test("GET - should throw not found when partyId is not valid", async () => {
        // Arrange
        const partyId = "";
        const partyType = mockedPartyTypes[0];

        // Act
        const response = await request(server)
            .get(`/${partyId}/${partyType}`);
         
        // Assert
        expect(response.status).toBe(404);
    });

    test("POST - fetch all fspIds for the given requests", async () => {
        // Arrange
        const id1 = "1234";
        const request1: ParticipantLookup = {
            partyId: mockedPartyIds[0],
            partyType: mockedPartyTypes[0],
            partySubType: null,
            currency: "USD"
        }
        const id2= "1235";
        const request2: ParticipantLookup = {
            partyId: mockedPartyIds[1],
            partyType: mockedPartyTypes[1],
            partySubType: mockedPartySubTypes[1],
            currency: "EUR"
        }

        // Act
        const response = await request(server)
            .post("")
            .send({
                id1 : request1,
                id2 : request2
            });
         
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            id1: mockedParticipantFspIds[0],
            id2: mockedParticipantFspIds[1]
        });
    });

    test("POST - if couldnt fetch a fspId return null on the respective id", async () => {
        // Arrange
        const id1 = "1234";
        const request1: ParticipantLookup = {
            partyId: mockedPartyIds[0],
            partyType: mockedPartyTypes[0],
            partySubType: null,
            currency: "USD"
        }
        const id2= "1235";
        const request2: ParticipantLookup = {
            partyId: "non-existent-party-id",
            partyType: "non-existent-party-type",
            partySubType: "non-existent-party-sub-type",
            currency: "EUR"
        }

        // Act
        const response = await request(server)
            .post("")
            .send({
                id1 : request1,
                id2 : request2
            });
         
        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            id1: mockedParticipantFspIds[0],
            id2: null
        });
    });

    test("POST - should throw bad request when request is not valid", async () => {
        // Arrange
        const id1 = "1234";
        const request1 = {
            partySubType: "any-party-sub-type",
            currency: "USD"
        }
        const id2= "1235";
        const request2: ParticipantLookup = {
            partyId: "non-existent-party-id",
            partyType: "non-existent-party-type",
            partySubType: "non-existent-party-sub-type",
            currency: "EUR"
        }

        // Act
        const response = await request(server)
            .post("")
            .send({
                id1 : request1,
                id2 : request2
            });
         
        // Assert
        expect(response.status).toBe(422);

    });


});

