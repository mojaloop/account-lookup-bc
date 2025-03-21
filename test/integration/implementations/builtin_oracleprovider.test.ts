/**
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

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

import { ILogger, ConsoleLogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import {
  MongoOracleProviderRepo,
  ParticipantAssociationAlreadyExistsError,
  UnableToInitOracleProvider,
} from "../../../packages/implementations-lib/src";
import { Oracle } from "../../../packages/domain-lib/src";
import { Collection, MongoClient } from "mongodb";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_TEST_NAME ?? "test";
const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017";
//const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://127.0.0.1:27017";
const COLLECTION_NAME = "builtinOracleParties";

let builtInOracleProvider: MongoOracleProviderRepo;
const oracle: Oracle = {
  id: "1",
  endpoint: null,
  name: "test",
  partyType: "MSISDN",
  type: "builtin",
  currency: "USD",
};

let mongoClient: MongoClient;
let collection: Collection;
const connectionString = `${CONNECTION_STRING}/${DB_NAME}`;

describe("Implementations - Builtin Oracle Provider Integration tests", () => {
  beforeAll(async () => {
    mongoClient = await MongoClient.connect(CONNECTION_STRING).catch((err) => {
      throw new Error(`Unable to connect to mongo at ${connectionString} with error: ${err.message}`);
    });
    collection = mongoClient.db(DB_NAME).collection(COLLECTION_NAME);
    builtInOracleProvider = new MongoOracleProviderRepo(oracle, logger, CONNECTION_STRING, DB_NAME);
    await builtInOracleProvider.init();
  });

  afterEach(async () => {
    await collection.deleteMany({});
  });

  afterAll(async () => {
    await builtInOracleProvider.destroy();
    await mongoClient.close();
  });

  test("should be able to init the builtin oracle provider", async () => {
    expect(builtInOracleProvider).toBeDefined();
  });

  test("should throw error if unable to init builtin provider", async () => {
    const nonWorkingBuiltInOracleProvider = new MongoOracleProviderRepo(
      oracle,
      logger,
      "bad connection string",
      "fakeName"
    );
    await expect(nonWorkingBuiltInOracleProvider.init()).rejects.toThrowError(UnableToInitOracleProvider);
  });

  test("should throw error if unable to destroy builtin provider", async () => {
    const nonWorkingBuiltInOracleProvider = new MongoOracleProviderRepo(oracle, logger, CONNECTION_STRING, "fakeName");
    await expect(nonWorkingBuiltInOracleProvider.destroy()).rejects.toThrowError();
  });

  test("should get participant fspid", async () => {
    // Arrange
    const fspId = "fsp1";
    const partyType = "MSISDN";
    const partySubType = "personal";
    const partyId = "123456789";
    const currency = "USD";
    await builtInOracleProvider.associateParticipant(fspId, partyType, partyId, partySubType, currency);

    // Act
    const result = await builtInOracleProvider.getParticipantFspId(partyType, partyId, partySubType, currency);

    // Assert
    expect(result).toEqual(fspId);
  });

  test("should return null if no participant fspid is found", async () => {
    // Arrange
    const partyType = "non-existent-partytype";
    const partyId = "non-existent-partyid";
    const currency = "USD";

    // Act
    const result = await builtInOracleProvider.getParticipantFspId(partyType, partyId, null, currency);

    //Assert
    expect(result).toBeNull();
  });

  test("should be able to associate a participant to an oracle", async () => {
    // Arrange
    const fspId = "fsp1";
    const partyType = "MSISDN";
    const partyId = "123456789";
    const partySubType = "personal";
    const currency = "USD";

    // Act
    await builtInOracleProvider.associateParticipant(fspId, partyType, partyId, partySubType, currency);

    // Assert
    const queryResult = await collection.findOne({
      fspId: fspId,
      partyType: partyType,
      partyId: partyId,
      partySubType: partySubType,
      currency: currency,
    });
    expect(queryResult).toBeDefined();
    expect(queryResult?.fspId).toEqual(fspId);
  });

  test("should throw error if association already exists", async () => {
    // Arrange
    const fspId = "fsp1";
    const partyType = "MSISDN";
    const partyId = "123456789";
    const currency = "USD";

    await builtInOracleProvider.associateParticipant(fspId, partyType, partyId, null, currency);

    // Act and Assert
    await expect(builtInOracleProvider.associateParticipant(fspId, partyType, partyId, null, currency)).rejects.toThrow(
      ParticipantAssociationAlreadyExistsError
    );
  });

  test("should be able to disassociate a participant from an oracle", async () => {
    // Arrange
    const fspId = "fsp1";
    const partyType = "MSISDN";
    const partyId = "123456789";
    const currency = "USD";
    const partySubType = "personal";
    await builtInOracleProvider.associateParticipant(fspId, partyType, partyId, partySubType, currency);

    // Act
    const result = await builtInOracleProvider.disassociateParticipant(
      fspId,
      partyType,
      partyId,
      partySubType,
      currency
    );

    // Assert
    expect(result).toBeNull();
    const queryResult = await collection.findOne({
      fspId: fspId,
      partyType: partyType,
      partyId: partyId,
      currency: currency,
    });
    expect(queryResult).toBeNull();
  });

  test("should be able to perform health check", async () => {
    // Act
    const result = await builtInOracleProvider.healthCheck();

    // Assert
    expect(result).toEqual(true);
  });

  test("should be able to get all associated participants", async () => {
    // Arrange
    const fspId = "fsp1";
    const partyType = "MSISDN";
    const partyId = "123456789";
    const currency = "USD";
    const partySubType = "personal";
    await builtInOracleProvider.associateParticipant(fspId, partyType, partyId, partySubType, currency);

    // Act
    const result = await builtInOracleProvider.getAllAssociations();

    // Assert
    expect(Array.isArray(result)).toEqual(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
