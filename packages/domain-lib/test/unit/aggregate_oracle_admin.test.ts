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

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

 "use strict";


 // Logger.
import {ConsoleLogger, ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import { IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    AccountLookupAggregate,
    AddOracleDTO,
    DuplicateOracleError,
    OracleNotFoundError,
    Oracle,
} from "../../src";
import { mockedOracleAdapters, MemoryOracleFinder,MemoryMessageProducer,MemoryOracleProviderFactory, MemoryParticipantService, mockedOracleAdapterResults } from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { logger, oracleFinder, oracleProviderFactory, messageProducer, participantService } from "../utils/mocked_variables";
import {IMetrics, MetricsMock} from "@mojaloop/platform-shared-lib-observability-types-lib";

let aggregate: AccountLookupAggregate;

describe("Domain - Unit Tests Oracle admin routes", () => {

    beforeAll(async () => {
        const metricsMock :IMetrics = new MetricsMock();
        aggregate = new AccountLookupAggregate(logger, oracleFinder,oracleProviderFactory, messageProducer,participantService, metricsMock);
        await aggregate.init();
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    test("should be able to get all oracles", async () => {
        // Arrange
        const expectedOraclesLength = mockedOracleAdapters.length;

        // Act
        const oracles = await aggregate.getAllOracles();

        // Assert
        expect(oracles.length).toBe(expectedOraclesLength);
    });

    test("should be able to get an oracle by its id", async () => {
        // Arrange
        const id = mockedOracleAdapters[0].id;

        // Act
        const oracle = await aggregate.getOracleById(id);

        // Assert
        expect(oracle?.id).toBe(id);
    });

    test("should be able to perform an health check on an existing oracle", async () => {
        // Arrange
        const id = mockedOracleAdapters[0].id;

        // Act
        const result = await aggregate.healthCheck(id);

        // Assert
        expect(result).toBeTruthy();

    });

    test("should throw an error when performing an health check on a non existing oracle", async () => {
        // Arrange
        const id = "non-existing-oracle";

        // Act && Assert
        await expect(aggregate.healthCheck(id)).rejects.toThrowError(OracleNotFoundError);
    });


    test("shouldnt be able to add oracle if oracle already exists", async () => {
        // Arrange
        const oracle = mockedOracleAdapters[0];

        // Act && Assert
        await expect(aggregate.addOracle(oracle)).rejects.toThrowError(DuplicateOracleError);
    });

    test("shouldnt be able to add oracle with same name", async () => {
        // Arrange
        const oracle:Oracle = {
            name: mockedOracleAdapters[0].name,
            endpoint: "http://localhost:3000",
            id: "not-existing-id",
            partyType: "DFSP",
            type: "builtin",
            currency: "USD",
        };

        // Act && Assert
        await expect(aggregate.addOracle(oracle)).rejects.toThrowError(DuplicateOracleError);
    });

    test("should throw error if oracle type is not supported", async () => {
        // Arrange
        const oracle: any = {
            name: "not-supported-oracle",
            endpoint: "http://localhost:3000",
            id: "not-existing-id",
            partyType: "DFSP",
            type: "not-supported-type",
        };

        // Act && Assert
        await expect(aggregate.addOracle(oracle)).rejects.toThrowError();
    });

    test("should throw error if oracle finder can't add oracle", async () => {
        // Arrange
        const oracle: any = {
            name: "not-supported-oracle",
            endpoint: "http://localhost:3000",
            id: "not-existing-id",
            partyType: "DFSP",
            type: "not-supported-type",
        };

        jest.spyOn(oracleFinder, "addOracle").mockImplementationOnce(() => {
            throw new Error("error");
        });

        // Act && Assert
        await expect(aggregate.addOracle(oracle)).rejects.toThrowError();
    });

    test("should be able to add oracle", async () => {
        // Arrange
        const oracle:AddOracleDTO = {
            id: null,
            name: "new-oracle",
            endpoint: "http://localhost:3000",
            partyType: "DFSP",
            type: "builtin",
            currency: "USD",
        };

        // Act
        const result = await aggregate.addOracle(oracle);

        // Assert
        expect(result).toBeDefined();
        expect(aggregate.oracleProvidersAdapters.find((o) => o.oracleId === result)).toBeTruthy();

    });

    test("shouldnt be able to remove oracle if oracle doesn't exist", async () => {
        // Arrange
        const oracleId = "not-existing-id";

        // Act && Assert
        await expect(aggregate.removeOracle(oracleId)).rejects.toThrow(OracleNotFoundError);
    });

    test("shouldnt be able to remove oracle if oracle finder cant remove it", async () => {
        // Arrange
        const oracleId = mockedOracleAdapters[0].id;

        jest.spyOn(oracleFinder, "removeOracle").mockImplementationOnce(() => {
            throw new Error("error");
        });

        // Act && Assert
        await expect(aggregate.removeOracle(oracleId)).rejects.toThrowError();
    });

    test("should be able to remove oracle", async () => {
        // Arrange
        const oracleId = mockedOracleAdapters[0].id;

        // Act
        await aggregate.removeOracle(oracleId);

        // Assert
        expect(aggregate.oracleProvidersAdapters.find((o) => o.oracleId === oracleId)).toBeFalsy();
    });

    test("should return all oracles", async () => {
        // Arrange
        const expectedOraclesLength = mockedOracleAdapters.length;

        // Act
        const oracles = await aggregate.getAllOracles();

        // Assert
        expect(oracles.length).toBe(expectedOraclesLength);
    });

    test("should return builtin oracle associations", async()=>{
        // Arrange
        const mockedOracleAdapter = mockedOracleAdapterResults[0];

        // Act
        const result = await aggregate.getBuiltInOracleAssociations();

        // Assert
        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].fspId).toBe(mockedOracleAdapter.fspId);
        expect(result[0].currency).toBe(mockedOracleAdapter.currency);
        expect(result[0].partyId).toBe(mockedOracleAdapter.partyId);
        expect(result[0].partyType).toBe(mockedOracleAdapter.partyType);
    });

});
