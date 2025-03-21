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

import { Oracle } from "@mojaloop/account-lookup-bc-domain-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { OracleAdapterFactory, OracleTypeNotSupportedError } from "../../src/index";
import { MongoOracleProviderRepo } from "../../src/oracles/adapters/builtin/mongo_oracleprovider";
import { HttpOracleProvider } from "../../src/oracles/adapters/remote/http_oracleprovider";

jest.mock("../../src/oracles/adapters/builtin/mongo_oracleprovider");
jest.mock("../../src/oracles/adapters/remote/http_oracleprovider");

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const oracleAdapterFactory = new OracleAdapterFactory("mongo_url","db name 2", logger, "null",  0,  0);

describe("Implementations - Oracle Adapter Factory Unit tests", () => {

    afterAll(async() => {
        jest.clearAllMocks();
    });

    test("should return a remote Oracle Adapter", async () => {
        // Arrange
        const oracle: Oracle = {
            id: "1",
            name: "oracle 1",
            type: "remote-http",
            endpoint: "http://localhost:3000",
            partyType: "MSISDN",
            currency: "USD"
        }

        // Act
        const oracleAdapter = oracleAdapterFactory.create(oracle);

        // Assert
        expect(oracleAdapter).toBeDefined();
        expect(oracleAdapter).toBeInstanceOf(HttpOracleProvider);
    });

    test("should return a builtin Oracle Adapter", async () => {
        // Arrange
        const oracle: Oracle = {
            id: "1",
            name: "oracle 1",
            type: "builtin",
            endpoint: null,
            partyType: "MSISDN",
            currency: "USD"
        }

        // Act
        const oracleAdapter = oracleAdapterFactory.create(oracle);

        // Assert
        expect(oracleAdapter).toBeDefined();
        expect(oracleAdapter).toBeInstanceOf(MongoOracleProviderRepo);
    });

    test("should throw an error when the oracle type is not supported", async () => {
        // Arrange
        const oracle: any = {
            id: "1",
            name: "oracle 1",
            type: "unsupported",
            endpoint: null,
            partyType: "MSISDN"
        }

        // Act and Assert
        expect(() => oracleAdapterFactory.create(oracle)).toThrowError(OracleTypeNotSupportedError);
    });

});


