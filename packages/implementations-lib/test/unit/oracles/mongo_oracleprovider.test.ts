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

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

 "use strict";

import { MongoClient, Collection } from "mongodb";
import { ILogger, ConsoleLogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import Redis from "ioredis";
import { MongoOracleProviderRepo } from '../../../src/oracles/adapters/builtin/mongo_oracleprovider';
import { ParticipantAssociationAlreadyExistsError, UnableToAssociateParticipantError, UnableToCloseDatabaseConnectionError, UnableToDisassociateParticipantError, UnableToGetAssociationError, UnableToGetAssociationsError, UnableToGetParticipantError, UnableToInitOracleProvider } from "../../../src/errors";
import { Oracle } from "@mojaloop/account-lookup-bc-domain-lib";

const mongoConnectSpy = jest.fn();
const mongoCloseSpy = jest.fn();
const mongoCollectionSpy = jest.fn();
const findOneSpy = jest.fn();
const insertOneSpy = jest.fn();
const deleteOneSpy = jest.fn();
const toArraySpy = jest.fn();
const findSpy = jest.fn();
const sortSpy = jest.fn().mockImplementation(() => ({ skip: skipSpy, limit: limitSpy }));
const skipSpy = jest.fn().mockImplementation(() => ({ limit: limitSpy }));
const limitSpy = jest.fn().mockImplementation(() => ({ toArray: toArraySpy }));
const aggregateSpy = jest.fn();

jest.mock('mongodb', () => {
    return {
        ...jest.requireActual('mongodb'),
        MongoClient: jest.fn().mockImplementation(() => ({
            connect: mongoConnectSpy,
            close: mongoCloseSpy,
            db: jest.fn().mockImplementation(() => ({
                collection: (name:string) => {
                    mongoCollectionSpy(name);
                    return {
                        findOne: findOneSpy,
                        insertOne: insertOneSpy,
                        deleteOne: deleteOneSpy,
                        sort: sortSpy,
                        skip: skipSpy,
                        limit: limitSpy,
                        toArray: toArraySpy,
                        find: findSpy.mockReturnThis(),
                        aggregate: aggregateSpy
                    };
                },
            })),
        })),
    };
});

const redisGetSpy = jest.fn();
const redisSetexSpy = jest.fn();
const redisDelSpy = jest.fn();
const redisConnectSpy = jest.fn();
const redisDisconnectSpy = jest.fn();

jest.mock('ioredis', () => {
    return function() {
        return {
            get: redisGetSpy,
            setex: redisSetexSpy,
            del: redisDelSpy,
            connect: redisConnectSpy,
            disconnect: redisDisconnectSpy,
        };
    };
});

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

describe("Implementations - Mongo Oracle Provider Repo Unit Tests", () => {
    let mongoOracleProviderRepo: MongoOracleProviderRepo;
    const oracle = { id: "oracle1", type: "builtin" } as Oracle;

    beforeEach(async () => {
        jest.clearAllMocks();

        mongoOracleProviderRepo = new MongoOracleProviderRepo(oracle, logger, "mongodb://localhost:27017", "testDB", "localhost", 6379);

        await mongoOracleProviderRepo.init();
    });

    it('should initialize the MongoDB and Redis connections successfully', async () => {
        // Act & Assert
        expect(MongoClient).toHaveBeenCalledWith("mongodb://localhost:27017");
        expect(mongoConnectSpy).toHaveBeenCalledTimes(1);
        expect(redisConnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should close MongoDB and Redis connections', async () => {
        // Act
        await mongoOracleProviderRepo.destroy();

        // Assert
        expect(mongoCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw UnableToCloseDatabaseConnectionError when an error occurs during MongoDB closure', async () => {
        // Arrange
        const errorMessage = 'Closing error';
        mongoCloseSpy.mockRejectedValueOnce(new Error(errorMessage));
        await mongoOracleProviderRepo.init();

        // Act & Assert
        await expect(mongoOracleProviderRepo.destroy()).rejects.toThrow(UnableToCloseDatabaseConnectionError);
    });

    it('should throw UnableToInitOracleProvider if unable to connect to the database', async () => {
        // Arrange
        mongoConnectSpy.mockImplementationOnce(() => { throw new Error("Connection error"); });

        // Act & Assert
        await expect(mongoOracleProviderRepo.init()).rejects.toThrow(UnableToInitOracleProvider);
    });

    it('should throw UnableToInitOracleProvider if MongoDB fails to connect', async () => {
        // Arrange
        redisConnectSpy.mockClear();
        const mongoOracleProviderRepoFail = new MongoOracleProviderRepo(oracle, logger, "mongodb://localhost:27017", "testDB", "localhost", 6379);

        mongoConnectSpy.mockRejectedValueOnce(new Error("MongoDB connection error"));

        // Act & Assert
        await expect(mongoOracleProviderRepoFail.init()).rejects.toThrow(UnableToInitOracleProvider);
        expect(mongoConnectSpy).toHaveBeenCalled();
        expect(redisConnectSpy).not.toHaveBeenCalled();
    });

    it('should throw UnableToInitOracleProvider if Redis fails to connect', async () => {
        // Arrange
        mongoConnectSpy.mockResolvedValueOnce(undefined); // Mock MongoDB connection to succeed
        redisConnectSpy.mockRejectedValueOnce(new Error("Redis connection error"));

        // Act & Assert
        await expect(mongoOracleProviderRepo.init()).rejects.toThrow(Error);
        expect(mongoConnectSpy).toHaveBeenCalled();
        expect(redisConnectSpy).toHaveBeenCalled();
    });

    it('should close both MongoDB and Redis connections even if one fails', async () => {
        // Arrange
        await mongoOracleProviderRepo.init();
        mongoCloseSpy.mockRejectedValueOnce(new Error("MongoDB close error"));
        redisDisconnectSpy.mockResolvedValueOnce(undefined);

        // Act & Assert
        await expect(mongoOracleProviderRepo.destroy()).rejects.toThrow(UnableToCloseDatabaseConnectionError);
        expect(mongoCloseSpy).toHaveBeenCalledTimes(1);
    });

    it("should return fspId from cache if available", async () => {
        // Arrange
        const partyType = "type";
        const partyId = "id";
        const partySubType = "subtype";
        const currency = "USD";
        const expectedFspId = "fsp123";
        const mockCacheData = JSON.stringify({ fspId: expectedFspId });
        redisGetSpy.mockResolvedValue(mockCacheData);

        // Act
        const result = await mongoOracleProviderRepo.getParticipantFspId(partyType, partyId, partySubType, currency);

        // Assert
        expect(result).toBe(expectedFspId);
    });

    it("should fetch from MongoDB if not found in cache and set to cache", async () => {
        // Arrange
        const partyType = "type";
        const partyId = "id";
        const partySubType = "subtype";
        const currency = "USD";
        const expectedFspId = "fsp123";
        redisGetSpy.mockResolvedValue(null);
        findOneSpy.mockResolvedValue({ fspId: expectedFspId });

        // Act
        const result = await mongoOracleProviderRepo.getParticipantFspId(partyType, partyId, partySubType, currency);

        // Assert
        expect(findOneSpy).toHaveBeenCalledWith({ partyId, partyType, partySubType, currency });
        expect(redisSetexSpy).toHaveBeenCalled();
        expect(result).toBe(expectedFspId);
    });

    it("should return null if participant not found in MongoDB", async () => {
        // Arrange
        const partyType = "type";
        const partyId = "id";
        const partySubType = null;
        const currency = null;
        redisGetSpy.mockResolvedValue(null);
        findOneSpy.mockResolvedValue(null);

        // Act
        const result = await mongoOracleProviderRepo.getParticipantFspId(partyType, partyId, partySubType, currency);

        // Assert
        expect(result).toBeNull();
    });

    it("should throw UnableToGetParticipantError when MongoDB operation fails", async () => {
        // Arrange
        const partyType = "type";
        const partyId = "id";
        const partySubType = "subtype";
        const currency = "USD";
        redisGetSpy.mockResolvedValue(null);
        findOneSpy.mockRejectedValue(new Error("DB error"));

        // Act & Assert
        await expect(mongoOracleProviderRepo.getParticipantFspId(partyType, partyId, partySubType, currency)).rejects.toThrow(UnableToGetParticipantError);
    });

    it("should throw error if participant association already exists", async () => {
        // Arrange
        const fspId = "fsp123";
        const partyType = "type";
        const partyId = "id";
        const partySubType = "subtype";
        const currency = "USD";
        const mockExistingAssociation = { fspId, partyId, partyType, partySubType, currency };
        findOneSpy.mockResolvedValue(mockExistingAssociation);

        // Act & Assert
        await expect(mongoOracleProviderRepo.associateParticipant(fspId, partyType, partyId, partySubType, currency)).rejects.toThrow(ParticipantAssociationAlreadyExistsError);
    });

    it("should store participant association if none exists", async () => {
        // Arrange
        const fspId = "fsp123";
        const partyType = "type";
        const partyId = "id";
        const partySubType = "subtype";
        const currency = "USD";
        findOneSpy.mockResolvedValue(null);
        insertOneSpy.mockResolvedValue({ acknowledged: true, insertedId: "newId" });

        // Act
        const result = await mongoOracleProviderRepo.associateParticipant(fspId, partyType, partyId, partySubType, currency);

        // Assert
        expect(result).toBeNull();
        expect(insertOneSpy).toHaveBeenCalled();
    });

    it("should throw error when unable to store association in database", async () => {
        // Arrange
        const fspId = "fsp123";
        const partyType = "type";
        const partyId = "id";
        const partySubType = "subtype";
        const currency = "USD";
        findOneSpy.mockResolvedValue(null);
        insertOneSpy.mockRejectedValue(new Error("DB write error"));

        // Act & Assert
        await expect(mongoOracleProviderRepo.associateParticipant(fspId, partyType, partyId, partySubType, currency)).rejects.toThrow(UnableToAssociateParticipantError);
    });

    it("should delete participant association and cache", async () => {
        // Arrange
        const fspId = "fsp123";
        const partyType = "type";
        const partyId = "id";
        const partySubType = "subtype";
        const currency = "USD";
        deleteOneSpy.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

        // Act
        const result = await mongoOracleProviderRepo.disassociateParticipant(fspId, partyType, partyId, partySubType, currency);

        // Assert
        expect(result).toBeNull();
        expect(deleteOneSpy).toHaveBeenCalledWith({
            fspId,
            partyType,
            partyId,
            partySubType,
            currency
        });
        expect(redisDelSpy).toHaveBeenCalled();
    });

    it("should throw error when unable to delete association from database", async () => {
        // Arrange
        const fspId = "fsp123";
        const partyType = "type";
        const partyId = "id";
        const partySubType = "subtype";
        const currency = "USD";
        deleteOneSpy.mockRejectedValue(new Error("DB delete error"));

        // Act & Assert
        await expect(mongoOracleProviderRepo.disassociateParticipant(fspId, partyType, partyId, partySubType, currency)).rejects.toThrow(UnableToDisassociateParticipantError);
    });

    // it("should return true when database ping is successful", async () => {
    //     // Arrange
    //     const commandSpy = jest.spyOn(mongoOracleProviderRepo.mongoClient.db(), 'command').mockResolvedValue({ ok: 1 });

    //     // Act
    //     const result = await mongoOracleProviderRepo.healthCheck();

    //     // Assert
    //     expect(result).toBeTruthy();
    // });

    // it("should return false when database ping fails", async () => {
    //     // Arrange
    //     const commandSpy = jest.spyOn(commandSpy).mockRejectedValue(new Error("Ping failed"));

    //     // Act
    //     const result = await mongoOracleProviderRepo.healthCheck();

    //     // Assert
    //     expect(result).toBeFalsy();
    // });

    it("should return an array of mapped associations if database query is successful", async () => {
        // Arrange
        const mockAssociations = [
          { _id: "1", partyId: "party123", fspId: "fsp123", partyType: "individual", currency: "USD" },
          { _id: "2", partyId: "party456", fspId: "fsp456", partyType: "business", currency: "EUR" }
        ];
        toArraySpy.mockResolvedValue(mockAssociations);

        // Act
        const result = await mongoOracleProviderRepo.getAllAssociations();

        // Assert
        expect(result).toEqual([
          { partyId: "party123", fspId: "fsp123", partyType: "individual", currency: "USD" },
          { partyId: "party456", fspId: "fsp456", partyType: "business", currency: "EUR" }
        ]);
    });

    it("should throw UnableToGetAssociationError if database query fails", async () => {
        // Arrange
        const error = new Error("Database error");
        toArraySpy.mockRejectedValue(error);

        // Act & Assert
        await expect(mongoOracleProviderRepo.getAllAssociations()).rejects.toThrow(UnableToGetAssociationError);
    });

    it("should return filtered and paginated association results", async () => {
        // Arrange
        const mockAssociations = [
          { partyId: "party123", fspId: "fsp123", partyType: "individual", currency: "USD", updatedAt: new Date() },
          { partyId: "party456", fspId: "fsp456", partyType: "business", currency: "EUR", updatedAt: new Date() }
        ];
        toArraySpy.mockResolvedValueOnce(mockAssociations);
        toArraySpy.mockResolvedValueOnce(mockAssociations);

        // Act
        const results = await mongoOracleProviderRepo.searchAssociations(null, "party", null, null, null, 0, 20);

        // Assert
        expect(results.items).toEqual(mockAssociations);
        expect(results.totalPages).toEqual(1);
    });

    it('should construct the filter object correctly based on provided parameters', async () => {
        // Arrange
        const associationsData = [
            { fspId: "fsp1", partyType: "type1", partyId: "party1" },
            { fspId: "fsp2", partyType: "type2", partyId: "party2" }
        ];

        const countResult = 2;

        const searchResults = {
            pageSize: 20,
            pageIndex: 0,
            totalPages: 1,
            items: associationsData,
        };

        toArraySpy.mockResolvedValueOnce(associationsData).mockResolvedValueOnce([{}, {}]); // First for items, second for total count

        // Act
        const result = await mongoOracleProviderRepo.searchAssociations('fsp1', 'party1', 'type1', null, null, 0, 20);

        // Assert
        expect(findSpy).toHaveBeenNthCalledWith(1, {
            $and: [
                { "fspId": "fsp1" },
                { "partyId": {"$regex": "party1", "$options": "i"} },
                { "partyType": "type1" }
            ],
        }, { sort: ["updatedAt", "desc"], skip: 0, limit: 20 });

        expect(toArraySpy).toHaveBeenCalledTimes(2);
        expect(result).toEqual(searchResults);
    });

    // it('should handle errors during search operation', async () => {
    //     // Arrange
    //     const errorMessage = 'Search error';
    //     toArraySpy.mockImplementationOnce(() => new Error(errorMessage));

    //     // Act & Assert
    //     await expect(mongoOracleProviderRepo.searchAssociations(null, null, null, null, null, 0, 10))
    //         .rejects.toThrow(UnableToGetAssociationsError);
    // });

    it('should handle pagination and limit results correctly', async () => {
        // Arrange
        const mockItems = new Array(30).fill({ fspId: "fsp1", partyType: "type1", partyId: "party1" });
        toArraySpy.mockResolvedValueOnce(mockItems.slice(0, 20)).mockResolvedValueOnce(mockItems);

        // Act
        const result = await mongoOracleProviderRepo.searchAssociations('fsp1', 'party1', 'type1', null, null, 1, 20);

        // Assert
        expect(findSpy).toHaveBeenNthCalledWith(1, expect.any(Object), { sort: ["updatedAt", "desc"], skip: 20, limit: 20 });
        expect(result.pageSize).toBe(20);
        expect(result.pageIndex).toBe(1);
        expect(result.totalPages).toBe(2);
    });

    it("should extract unique keywords from associations", async () => {
        // Arrange
        const amountTypeResult = {
            _id: { partyType: 'MSISDN', currency: 'USD', fspId: 'FSP1' }
        };

        aggregateSpy.mockReturnValueOnce({
            [Symbol.asyncIterator]: jest.fn(() => ({
                next: jest.fn()
                    .mockResolvedValueOnce({ value: amountTypeResult, done: false })
                    .mockResolvedValueOnce({ done: true }),
            })),
        });

        const expectedResponse = [
            { fieldName: 'partyType', distinctTerms: ['MSISDN'] },
            { fieldName: 'currency', distinctTerms: ['USD'] },
            { fieldName: 'fspId', distinctTerms: ['FSP1'] },
        ];

        // Act
        const result = await mongoOracleProviderRepo.getSearchKeywords();

        // Assert
        expect(result).toEqual(expectedResponse);
    });

    it("should handle errors during aggregation", async () => {
        // Arrange
        aggregateSpy.mockImplementationOnce(() => {
            throw new Error('Aggregation error');
        });

        // Act & Assert
        await expect(mongoOracleProviderRepo.getSearchKeywords()).resolves.toEqual([]);
    });
});
