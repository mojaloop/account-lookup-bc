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
  Association,
  IOracleFinder,
  IOracleProviderFactory,
  IParticipantServiceAdapter,
} from "@mojaloop/account-lookup-bc-domain-lib";
import { Service } from "../../src/service";
import {
  MemoryOracleFinder,
  MemoryMessageProducer,
  MemoryOracleProviderFactory,
  MemoryMessageConsumer,
  MemoryParticipantService,
  MemoryAuthenticatedHttpRequesterMock,
  mockedOracleAssociations,
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IAuthenticatedHttpRequester } from "@mojaloop/security-bc-client-lib";
import { IMetrics, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer: IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService: IParticipantServiceAdapter = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger, true);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const mockedAuthRequester: IAuthenticatedHttpRequester = new MemoryAuthenticatedHttpRequesterMock(logger, "fake token");

const mockedMetrics: IMetrics = new MetricsMock();

const serverBaseUrl = (process.env["ADMIN_URL"] || "http://localhost:3030") + "/admin";

describe("Oracle Admin Routes - Unit Test", () => {
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

  test("GET - should fetch an array of oracles", async () => {
    // Act
    const response = await request(serverBaseUrl).get("/oracles");

    // Assert
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toEqual(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("GET - should fetch an array of oracle associations available", async () => {
    // Arrange
    const expectedAssociations = mockedOracleAssociations[0];

    // Act
    const response = await request(serverBaseUrl).get("/oracles/builtin-associations");

    // Assert
    expect(response.status).toBe(200);
    const associationResponse: Association = response.body[0];
    expect(associationResponse.fspId).toEqual(expectedAssociations.fspId);
    expect(associationResponse.currency).toEqual(expectedAssociations.currency);
    expect(associationResponse.partyId).toEqual(expectedAssociations.partyId);
    expect(associationResponse.partyType).toEqual(expectedAssociations.partyType);
  });

  test("POST - should return an error when an invalid payload is passed", async () => {
    // Act
    const response = await request(serverBaseUrl).post("/oracles").send({
      type: "invalid-type",
      name: "oracle msisdn",
      partyType: "MSISDN",
    });

    // Assert
    expect(response.status).toBe(422);
  });

  test("POST - should add a new oracle", async () => {
    // Act
    const response = await request(serverBaseUrl).post("/oracles").send({
      type: "builtin",
      name: "oracle msisdn",
      partyType: "MSISDN",
    });

    // Assert
    expect(response.status).toBe(200);
    expect(checkIfValidUUID(response.body.id)).toBe(true);
  });

  test("GET - should fetch the recently added oracle by id", async () => {
    // Arrange
    const oracles = await request(serverBaseUrl).get("/oracles");

    const oracleId = oracles.body[0].id;

    // Act
    const response = await request(serverBaseUrl).get(`/oracles/${oracleId}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.name).toEqual("oracle1");
    expect(response.body.type).toEqual("builtin");
    expect(response.body.partyType).toEqual("bank");
  });

  test("GET - should return not found error when fetched with non-existent id", async () => {
    // Arrange
    const oracleId = "non-existent-id";

    // Act
    const response = await request(serverBaseUrl).get(`/oracles/${oracleId}`);

    // Assert
    expect(response.status).toBe(404);
  });

  test("GET - should return health condition of the specified oracle", async () => {
    // Arrange
    const oracles = await request(serverBaseUrl).get("/oracles");

    const oracleId = oracles.body[0].id;

    // Act
    const response = await request(serverBaseUrl).get(`/oracles/health/${oracleId}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(true);
  });

  test("GET - should return not found error when health check with non-existent id", async () => {
    // Arrange
    const oracleId = "non-existent-id";

    // Act
    const response = await request(serverBaseUrl).get(`/oracles/health/${oracleId}`);

    // Assert
    expect(response.status).toBe(404);
  });

  test("GET - should return an error when an invalid payload is passed", async () => {
    // Arrange
    const oracleId = "";

    // Act
    const response = await request(serverBaseUrl).get(`/oracles/health/${oracleId}`);

    // Assert
    expect(response.status).toBe(404);
  });

  test("DELETE - should delete the specified oracle", async () => {
    // Arrange
    const oracles = await request(serverBaseUrl).get("/oracles");

    const oracleId = oracles.body[0].id;

    // Act
    const response = await request(serverBaseUrl).delete(`/oracles/${oracleId}`);

    // Assert
    expect(response.status).toBe(200);
  });

  test("DELETE - should return not found error when try to delete with non-existence id", async () => {
    // Arrange
    const oracleId = "non-existent-id";

    // Act
    const response = await request(serverBaseUrl).delete(`/oracles/${oracleId}`);

    // Assert
    expect(response.status).toBe(404);
  });

  test("DELETE - should return an error when an invalid payload is passed", async () => {
    // Arrange
    const oracleId = "";

    // Act
    const response = await request(serverBaseUrl).delete(`/oracles/${oracleId}`);

    // Assert
    expect(response.status).toBe(404);
  });
});

function checkIfValidUUID(str: string): boolean {
  // Regular expression to check if string is a valid UUID
  const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;

  return regexExp.test(str);
}
