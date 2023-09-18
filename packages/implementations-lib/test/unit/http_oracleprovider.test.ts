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
import { ILogger, ConsoleLogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { HttpOracleProvider } from "../../src/oracles/adapters/remote/http_oracleprovider";
import { UnableToInitRemoteOracleProvider } from "../../src/errors";
import { RemoteOracleProviderHttpMock } from "../mocks/http_oracleprovider_mock";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);
let oracleproviderHttpServerMock: RemoteOracleProviderHttpMock;
let remoteOracleProvider: HttpOracleProvider;
const oracle: Oracle = {
  id: "test",
  type: "remote-http",
  endpoint: "http://localhost:3000",
  name: "test",
  partyType: "MSISDN",
  currency: "USD",
};

describe("Implementations - Remote Oracle Provider Unit tests", () => {
  beforeAll(async () => {
    oracleproviderHttpServerMock = new RemoteOracleProviderHttpMock(logger, oracle.endpoint as string);
    oracleproviderHttpServerMock.setUp();
    remoteOracleProvider = new HttpOracleProvider(oracle, logger);
  });

  afterAll(async () => {
    oracleproviderHttpServerMock.disable();
    jest.clearAllMocks();
  });

  test("should set correct values on initialization", async () => {
    // Act
    remoteOracleProvider.init();

    // Assert
    expect(remoteOracleProvider.type).toEqual(oracle.type);
    expect(remoteOracleProvider.oracleId).toEqual(oracle.id);
  });

  test("should be able to destroy the oracle provider", async () => {
    // Act && Assert
    await expect(remoteOracleProvider.destroy()).resolves.not.toThrow();
  });

  test("should throw error if oracle endpoint not valid", async () => {
    // Arrange
    const oracle: Oracle = {
      id: "test",
      type: "remote-http",
      endpoint: null,
      name: "test",
      partyType: "MSISDN",
      currency: "USD",
    };
    const badRemoteOracleProvider = new HttpOracleProvider(oracle, logger);

    // Act && Assert
    expect(() => badRemoteOracleProvider.init()).toThrow(UnableToInitRemoteOracleProvider);
  });

  test("should be able to health check remote oracle", async () => {
    // Act
    const healthCheck = await remoteOracleProvider.healthCheck();

    // Assert
    expect(healthCheck).toEqual(true);
  });

  test("should throw error if couldn't get Participant FspId", async () => {
    // Act && Assert
    await expect(
      remoteOracleProvider.getParticipantFspId("partyTypeNotFound", "partyId", "partySubType", "USD")
    ).rejects.toThrowError();
  });

  test("should be able to get Participant FspId", async () => {
    // Act
    const result = await remoteOracleProvider.getParticipantFspId("partyType", "partyId", null, null);

    // Assert
    expect(result).toEqual("fspIdSuccess");
  });

  test("should throw error if couldn't associate participant", async () => {
    // Act && Assert
    await expect(
      remoteOracleProvider.associateParticipant("fakeFspId", "partyTypeNoAssociation", "partyId", "partySubType", "USD")
    ).rejects.toThrowError();
  });

  test("should be able to associate participant", async () => {
    // Act
    const result = await remoteOracleProvider.associateParticipant(
      "fspId",
      "partyTypeAssociation",
      "partyId",
      null,
      null
    );

    // Assert
    expect(result).toBeNull();
  });

  test("should throw error if couldn't disassociate participant", async () => {
    // Act && Assert
    await expect(
      remoteOracleProvider.disassociateParticipant("fspId", "partyTypeNoAssociation", "partyId", null, null)
    ).rejects.toThrowError();
  });

  test("should be able to disassociate participant", async () => {
    // Act
    const result = await remoteOracleProvider.disassociateParticipant(
      "fspId",
      "partyTypeDisassociation",
      "partyId",
      null,
      null
    );

    // Assert
    expect(result).toBeNull();
  });

  test("should be able to get all associations from oracle", async () => {
    // Act
    const result = await remoteOracleProvider.getAllAssociations();

    // Assert
    expect(result).toEqual([
      {
        fspId: "fspIdSuccess",
        partyType: "partyType",
        partyId: "partyId",
        partySubType: "partySubType",
        currency: "USD",
      },
    ]);
  });
});
