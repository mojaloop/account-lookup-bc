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
import { IOracleFinder, IOracleProviderFactory, IParticipantService} from "@mojaloop/account-lookup-bc-domain";
import { MemoryOracleFinder,MemoryMessageProducer,MemoryOracleProviderFactory, MemoryMessageConsumer, MemoryParticipantService } from "@mojaloop/account-lookup-shared-mocks";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { start, stop } from "@mojaloop/account-lookup-bc-svc";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.DEBUG);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService:IParticipantService = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger, false);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const server = (process.env["ADMIN_URL"] || "http://localhost:3030") + "/admin";

describe("Oracle Admin Routes - Integration", () => {

    beforeAll(async () => {
        await start(logger,mockedConsumer,mockedProducer, mockedOracleFinder, mockedOracleProviderFactory, mockedParticipantService);
    });

    afterAll(async () => {
        await stop();
    });

    test("should fetch empty array when no oracles available", async () => {
        const response = await request(server)
            .get("/oracles")
            .expect(200);
            
        expect(response.body).toEqual([]);
    });

    test("should throw a bad request when trying to add an oracle with an invalid body", async () => {
        await request(server)
            .post("/oracles")
            .send({
               type:"invalid",
               name:"new oracle",
               partyType: "party type"
            })
            .expect(422);    
    });


    test("should add a new oracle", async () => {
        const response = await request(server)
            .post("/oracles")
            .send({
               type:"builtin",
               name:"new oracle",
               partyType: "party type"
            })
            .expect(200);

        expect(checkIfValidUUID(response.body.id)).toBe(true);
   
    });

    test("should fetch the added oracle by id", async () => {
        // Arrange
        const oracles = await request(server)
            .get("/oracles")
            .expect(200);
        
        const oracleId = oracles.body[0].id;
        
        // Act && Assert
        const response = await request(server)
            .get(`/oracles/${oracleId}`)
            .expect(200);
        expect(response.body.name).toBe("new oracle");
        expect(response.body.type).toBe("builtin");
        expect(response.body.partyType).toBe("party type");
    });

    test("should return null if trying to fetch an oracle by id that doesnt exist", async () => {
        // Arrange
        const oracleId = "invalid-id";
        
        const response = await request(server)
            .get(`/oracles/${oracleId}`)   
            .expect(200);

        expect(response.body).toBeNull();
    });


});

function checkIfValidUUID(str:string): boolean {
    // Regular expression to check if string is a valid UUID
    const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
  
    return regexExp.test(str);
}

