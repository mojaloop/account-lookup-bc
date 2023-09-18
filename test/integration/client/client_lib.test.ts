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

import { ILogger, ConsoleLogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { MongoOracleProviderRepo } from "../../../packages/implementations-lib/src";
import { Oracle } from "../../../packages/domain-lib/src";
import { Collection, MongoClient } from "mongodb";
import { AccountLookupHttpClient } from "./../../../packages/client-lib/src/account_lookup_http_client";
import { IAuthenticatedHttpRequester, AuthenticatedHttpRequester } from "@mojaloop/security-bc-client-lib";
import { Service } from "./../../../packages/account-lookup-svc/src/service";
import { MongoOracleFinderRepo } from "@mojaloop/account-lookup-bc-implementations-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const ACCOUNT_LOOKUP_SVC_URL = "http://localhost:3030";
const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_NAME ?? "account-lookup";
const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017";
const BUILTIN_ORACLE_COLLECTION_NAME = "builtinOracleParties";
const BUILTIN_ORACLE_FINDER_NAME = "oracles";

const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "account-lookup-bc-account-lookup-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_ID"] || "superServiceSecret";

const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix

const oracle1: Oracle = {
  id: "1",
  endpoint: null,
  name: "test",
  partyType: "MSISDN",
  type: "builtin",
  currency: "USD",
};

const oracle2: Oracle = {
  id: "2",
  endpoint: null,
  name: "test2",
  partyType: "MSISDN",
  type: "builtin",
  currency: "EUR",
};

// const oracle3: Oracle = {
//     id: "3",
//     endpoint:null,
//     name: "test3",
//     partyType: "MSISDN",
//     type: "builtin",
//     currency: null,
// };

let mongoClient: MongoClient;
let collection: Collection;
let authRequester: IAuthenticatedHttpRequester;

let accountLookupClient: AccountLookupHttpClient;

describe("Client Lib - Integration tests", () => {
  beforeAll(async () => {
    await cleanUp();

    const oracleFinder = new MongoOracleFinderRepo(logger, CONNECTION_STRING, DB_NAME);
    await oracleFinder.init();
    oracleFinder.addOracle(oracle1);
    oracleFinder.addOracle(oracle2);
    // oracleFinder.addOracle(oracle3);

    const builtInOracleProvider1 = new MongoOracleProviderRepo(oracle1, logger, CONNECTION_STRING, DB_NAME);
    await builtInOracleProvider1.init();
    await builtInOracleProvider1.associateParticipant("fsp1", "MSISDN", "123456789", "subtype", "USD");

    const builtInOracleProvider2 = new MongoOracleProviderRepo(oracle2, logger, CONNECTION_STRING, DB_NAME);
    await builtInOracleProvider2.init();
    await builtInOracleProvider2.associateParticipant("fsp2", "MSISDN", "987654321", "subtype2", "EUR");

    // const builtInOracleProvider3 = new MongoOracleProviderRepo(oracle3,logger,CONNECTION_STRING,DB_NAME);
    // await builtInOracleProvider3.init();
    // await builtInOracleProvider3.associateParticipant("fsp3", "MSISDN", "123456789", null);

    authRequester = new AuthenticatedHttpRequester(logger, AUTH_N_SVC_TOKEN_URL);
    authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);

    accountLookupClient = new AccountLookupHttpClient(logger, ACCOUNT_LOOKUP_SVC_URL, authRequester);

    await oracleFinder.destroy();
    await builtInOracleProvider1.destroy();
    await builtInOracleProvider2.destroy();
    // await builtInOracleProvider3.destroy();

    await Service.start();
  });

  afterAll(async () => {
    await cleanUp();
    await Service.stop();
  });

  test("should be able to get fspId for party type, party id and currency USD", async () => {
    // Act
    const result = await accountLookupClient.participantLookUp("MSISDN", "123456789", "USD");

    // Assert
    expect(result).toEqual("fsp1");
  });

  test("should be able to get fspId for party type and party id and currency EUR", async () => {
    // Act
    const result = await accountLookupClient.participantLookUp("MSISDN", "987654321", "EUR");

    // Assert
    expect(result).toEqual("fsp2");
  });

  // test("should be able to get fspId for party type and party id and currency null", async () => {
  //     // Act
  //     const result = await accountLookupClient.participantLookUp("MSISDN", "123456789", null);

  //     // Assert
  //     expect(result).toEqual("fsp3");

  // });

  test("should return null when fspId is not found", async () => {
    // Act
    const result = await accountLookupClient.participantLookUp("MSISDN", "non-existing", "USD");

    // Assert
    expect(result).toBeNull();
  });

  test("should throw error when oracle is not found", async () => {
    // Act
    const result = accountLookupClient.participantLookUp("non existing", "non-existing", "USD");

    // Assert
    await expect(result).rejects.toThrowError("Account Lookup Client - Unable to Get FspId - 500");
  });
});

async function cleanUp() {
  mongoClient = await MongoClient.connect(CONNECTION_STRING).catch((err) => {
    throw new Error(`Unable to connect to mongo at ${CONNECTION_STRING} with error: ${err.message}`);
  });
  collection = mongoClient.db(DB_NAME).collection(BUILTIN_ORACLE_COLLECTION_NAME);
  await collection.deleteMany({});
  collection = mongoClient.db(DB_NAME).collection(BUILTIN_ORACLE_FINDER_NAME);
  await collection.deleteMany({});
  await mongoClient.close();
}
