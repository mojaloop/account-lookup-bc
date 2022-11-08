/*****
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
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 ******/

 "use strict";

 import {ConsoleLogger, ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
 import {ParticipantClientHttpMock} from "../utils/mocks/participant_client_http_mock";
 import { ParticipantClient} from "../../src/external_adapters/participant_client";
 import { ILocalCache, LocalCache } from "@mojaloop/account-lookup-bc-infrastructure";
 
 const BASE_URL_PARTICIPANT_CLIENT: string = "http://localhost:1234";
 
 let participantHttpServerMock: ParticipantClientHttpMock;
 let participantClient: ParticipantClient;
 let localCache: ILocalCache;
 
 describe("Account Lookup Client Library - Unit Tests", () => {
     beforeAll(async () => {
         const logger: ILogger = new ConsoleLogger();
         logger.setLogLevel(LogLevel.FATAL);
         localCache = new LocalCache(logger);
         participantHttpServerMock = new ParticipantClientHttpMock(
             logger,
             BASE_URL_PARTICIPANT_CLIENT
         );
         participantHttpServerMock.setUp();
         
 
         participantClient = new ParticipantClient(
             logger,
             BASE_URL_PARTICIPANT_CLIENT,
             localCache
         );
     });
 
     // Get participant.
     test("should receive null if participant doesnt exist", async () => {
         // Arrange
         const participantId: string = ParticipantClientHttpMock.NON_EXISTING_PARTICIPANT_ID;
 
         // Act
         const participantInfo =
             await participantClient.getParticipantInfo(participantId);
         
         // Assert
         expect(participantInfo).toBeNull();
     });
 
     test("should get participant info", async () => {
         // Arrange
         const participantId: string = ParticipantClientHttpMock.EXISTING_PARTICIPANT_ID;
 
         // Act
         const participantInfo =
             await participantClient.getParticipantInfo(participantId);
         
         // Assert
         expect(participantInfo).toEqual(ParticipantClientHttpMock.participant);
     });
 
     test("should retrieve participant from cache", async () => {
         // Arrange
         const participantId: string = ParticipantClientHttpMock.EXISTING_PARTICIPANT_ID;
         jest.spyOn(localCache, "get").mockReturnValue({"id":1, "name":"cache"});
 
         // Act
         const participantInfo =
             await participantClient.getParticipantInfo(participantId);
         
         // Assert
         expect(participantInfo).toEqual({"id":1, "name":"cache"});
     });
 
 });
 