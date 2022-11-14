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
import { AccountLookupAggregate, IOracleFinder, IOracleProviderFactory, IParticipantService} from "@mojaloop/account-lookup-bc-domain";
import { MemoryOracleFinder,MemoryMessageProducer,MemoryOracleProviderFactory, MemoryMessageConsumer, MemoryParticipantService } from "@mojaloop/account-lookup-shared-mocks";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { start, stop } from "@mojaloop/account-lookup-bc-svc";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService:IParticipantService = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const mockedAggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    mockedOracleFinder,
    mockedOracleProviderFactory,
    mockedProducer,
    mockedParticipantService
);

const server = process.env["ADMIN_URL"] || "http://localhost:3030";

describe("Oracle Admin Routes - Integration", () => {

    beforeAll(async () => {
        await start(logger,mockedConsumer,mockedProducer, mockedOracleFinder, mockedOracleProviderFactory, mockedParticipantService);
    });

    afterAll(async () => {
        await stop();
    });

    it("should return 200 when calling /health", async () => {
        // Arrange && Act
        const response = await request(server)
            .get('/parties/MSISDN/123456789')
            .expect(200);

        // Assert
        expect(response.status).toBe(200);
    });

});
