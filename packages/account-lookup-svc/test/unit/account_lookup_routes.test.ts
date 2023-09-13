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
import {
  MemoryOracleFinder,
  MemoryMessageProducer,
  MemoryOracleProviderFactory,
  MemoryMessageConsumer,
  MemoryParticipantService,
  MemoryAuthenticatedHttpRequesterMock,
  mockedPartyIds,
  mockedPartyTypes,
  mockedParticipantFspIds,
  mockedPartySubTypes,
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import {
  IOracleFinder,
  IOracleProviderFactory,
  IParticipantServiceAdapter,
} from "@mojaloop/account-lookup-bc-domain-lib";
import { IMessageConsumer, IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IAuthenticatedHttpRequester } from "@mojaloop/security-bc-client-lib";
import { Service } from "../../src/service";
import { IMetrics, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer: IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService: IParticipantServiceAdapter = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const mockedAuthRequester: IAuthenticatedHttpRequester = new MemoryAuthenticatedHttpRequesterMock(logger, "fake token");

const mockedMetrics: IMetrics = new MetricsMock();

const serverBaseUrl = (process.env["ACCOUNT_LOOKUP_URL"] || "http://localhost:3030") + "/account-lookup";

const CURRENCY = {
  USD: "USD",
  EUR: "EUR",
};

describe("Account Lookup Routes - Unit Test", () => {
  beforeAll(async () => {
    await Service.start(
      logger,
      mockedConsumer,
      mockedProducer,
      mockedOracleFinder,
      mockedOracleProviderFactory,
      mockedAuthRequester,
      mockedParticipantService,
      mockedMetrics
    );
  });

  afterAll(async () => {
    await Service.stop();
  });

  test("GET - should fetch fspId for partyId and partyType", async () => {
    // Arrange
    const partyId = mockedPartyIds[0];
    const partyType = mockedPartyTypes[0];

    // Act
    const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toEqual(mockedParticipantFspIds[0]);
  });

  test("GET - should receive 404 when fsp id not found", async () => {
    // Arrange
    const partyId = mockedPartyIds[4];
    const partyType = mockedPartyTypes[4];

    // Act
    const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`);

    // Assert
    expect(response.status).toBe(404);
  });

  test("GET - should fetch fspId for partyId ,partyType, partySubType and currency", async () => {
    // Arrange
    const partyId = mockedPartyIds[0];
    const partyType = mockedPartyTypes[0];
    const partySubType = mockedPartySubTypes[0];
    const currency = CURRENCY.USD;

    // Act
    const response = await request(serverBaseUrl).get(
      `/${partyType}/${partyId}?currency=${currency}&partySubType=${partySubType}`
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toEqual(mockedParticipantFspIds[0]);
  });

  test("GET - should get not found when url is invalid", async () => {
    // Arrange
    const partyId = "";
    const partyType = mockedPartyTypes[2];

    // Act
    const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`);

    // Assert
    expect(response.status).toBe(404);
  });

  test("GET - should throw a 500 when the request got wrong on server", async () => {
    // Arrange
    const partyId = mockedPartyIds[3];
    const partyType = mockedPartyTypes[3];

    // Act
    const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`);

    // Assert
    expect(response.status).toBe(500);
  });
});
