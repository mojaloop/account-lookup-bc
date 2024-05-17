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
 
 import { MongoClient } from 'mongodb';
 import { MongoOracleFinderRepo } from '../../../src/oracles/mongo_oraclefinder'; // adjust path as necessary
 import { ConsoleLogger, ILogger, LogLevel } from '@mojaloop/logging-bc-public-types-lib';
 import {
   NoSuchOracleError,
   OracleAlreadyRegisteredError,
   UnableToCloseDatabaseConnectionError,
   UnableToDeleteOracleError,
   UnableToGetOracleError,
   UnableToInitOracleFinderError,
   UnableToRegisterOracleError,
 } from '../../../src/errors';
 import { mockedOracleAdapters } from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { Oracle } from '@mojaloop/account-lookup-bc-domain-lib';



const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);


const mongoConnectSpy = jest.fn();
const mongoCloseSpy = jest.fn();
const mongoFindOneSpy = jest.fn();
const mongoInsertOneSpy = jest.fn();
const mongoInsertManySpy = jest.fn();
const mongoBulkWriteSpy = jest.fn();
const mongoUpdateOneSpy = jest.fn();
const mongoDeleteOneSpy = jest.fn();
const mongoToArraySpy = jest.fn();
const mongoFindSpy = jest.fn().mockImplementation(() => ({
    toArray: mongoToArraySpy,
}))
const mongoCountDocumentsSpy = jest.fn();
const mongoAggregateSpy = jest.fn();

const mongoCollectionSpy = jest.fn().mockImplementation(() => ({
    findOne: mongoFindOneSpy,
    insertOne: mongoInsertOneSpy,
    insertMany: mongoInsertManySpy,
    bulkWrite: mongoBulkWriteSpy,
    updateOne: mongoUpdateOneSpy,
    deleteOne: mongoDeleteOneSpy,
    find: mongoFindSpy,
    countDocuments: mongoCountDocumentsSpy,
    aggregate: mongoAggregateSpy,
}));

jest.mock('mongodb', () => {
    const mockCollection = jest.fn().mockImplementation(() => ({
        findOne: mongoFindOneSpy
    }));

    return {
        MongoClient: jest.fn().mockImplementation(() => ({
            connect: mongoConnectSpy,
            close: mongoCloseSpy,
            db: jest.fn().mockImplementation(() => ({
                collection: mongoCollectionSpy
            })),
        })),
        Collection: mockCollection,
    };
});
 
  
const connectionString = 'mongodb://localhost:27017';
const dbName = 'testDB';

describe("Implementations - Mongo Oracles Repo Unit Tests", () => {
    let mongoOraclesRepo: MongoOracleFinderRepo;

    beforeEach(async () => {
        jest.clearAllMocks();

        mongoOraclesRepo = new MongoOracleFinderRepo(logger, connectionString, dbName);

        await mongoOraclesRepo.init();

    });

    it('should initialize the MongoDB connection and oracles collection', async () => {
        // Act 
        await mongoOraclesRepo.init();

        // Assert
        expect(MongoClient).toHaveBeenCalledWith(connectionString);
        expect(mongoCollectionSpy).toHaveBeenCalledWith('oracles');
    });

    it('should close the database connection', async () => {
        // Act
        await mongoOraclesRepo.destroy();

        // Assert
        expect(mongoCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw UnableToCloseDatabaseConnectionError when encountering an error during closing', async () => {
        // Arrange
        const errorMessage = 'Closing error';

        mongoCloseSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoOraclesRepo.destroy()).rejects.toThrow(UnableToCloseDatabaseConnectionError);

    });

    it('should throw an error if unable to connect to the database', async () => {
        // Arrange
        mongoConnectSpy.mockImplementationOnce(() => { throw new Error(); })

        // Act & Assert
        await expect(mongoOraclesRepo.init()).rejects.toThrow(UnableToInitOracleFinderError);
    });

    it('should add oracle to the collection', async () => {
        // Arrange
        const mockOracle = mockedOracleAdapters[0];

        mongoFindOneSpy.mockResolvedValueOnce(null);

        // Act
        await mongoOraclesRepo.addOracle(mockOracle);

        // Assert
        expect(mongoFindOneSpy).toHaveBeenCalledWith({
            partyType: mockOracle.partyType,
            type: mockOracle.type,
            id: mockOracle.id,
            name: mockOracle.name,
            endpoint: mockOracle.endpoint,
        });
        expect(mongoInsertOneSpy).toHaveBeenCalledWith(mockOracle);
    });

    it('should throw UnableToGetOracleError when findOne throws an error', async () => {
        // Arrange
        const mockOracle = mockedOracleAdapters[0];
        const expectedQuery = {
            partyType: mockOracle.partyType,
            type: mockOracle.type,
            id: mockOracle.id,
            name: mockOracle.name,
            endpoint: mockOracle.endpoint,
        };
    
        const errorMessage = 'Find error';
        mongoFindOneSpy.mockRejectedValueOnce(new Error(errorMessage));
    
        // Act & Assert
        await expect(mongoOraclesRepo.addOracle(mockOracle)).rejects.toThrow(UnableToGetOracleError);
    });

    it('should throw OracleAlreadyRegisteredError when oracle already exists', async () => {
        // Arrange
        const mockOracle = mockedOracleAdapters[0];

        mongoFindOneSpy.mockResolvedValueOnce(mockOracle);

        // Act & Assert
        await expect(mongoOraclesRepo.addOracle(mockOracle)).rejects.toThrow(OracleAlreadyRegisteredError);
    });

    it('should throw UnableToRegisterOracleError when unable to insert oracle', async () => {
        // Arrange
        const mockOracle = mockedOracleAdapters[0];

        mongoFindOneSpy.mockResolvedValueOnce(null);

        const errorMessage = 'Insertion error';
        mongoInsertOneSpy.mockRejectedValueOnce(new Error(errorMessage));

        // Act & Assert
        await expect(mongoOraclesRepo.addOracle(mockOracle)).rejects.toThrow(UnableToRegisterOracleError);
    });
      
    it('should remove oracle from the collection', async () => {
        // Arrange
        const oracleId = 'testOracleId';
        const deleteResult = { deletedCount: 1 };
        mongoDeleteOneSpy.mockResolvedValueOnce(deleteResult);
    
        // Act
        await mongoOraclesRepo.removeOracle(oracleId);
    
        // Assert
        expect(mongoDeleteOneSpy).toHaveBeenCalledWith({ id: oracleId });
    });
    
    it('should throw NoSuchOracleError when oracle with given id does not exist', async () => {
        // Arrange
        const oracleId = 'nonExistentOracleId';
        const deleteResult = { deletedCount: 0 };
        mongoDeleteOneSpy.mockResolvedValueOnce(deleteResult);
    
        // Act & Assert
        await expect(mongoOraclesRepo.removeOracle(oracleId)).rejects.toThrow(NoSuchOracleError);
    });
    
    it('should throw UnableToDeleteOracleError when unable to delete oracle', async () => {
        // Arrange
        const oracleId = 'testOracleId';
        const errorMessage = 'Delete error';
        mongoDeleteOneSpy.mockRejectedValueOnce(new Error(errorMessage));
    
        // Act & Assert
        await expect(mongoOraclesRepo.removeOracle(oracleId)).rejects.toThrow(UnableToDeleteOracleError);
    });

    it('should return all oracles from the collection', async () => {
        // Arrange
        const mockOracles = [{}, {}]; // Mocked oracles array
        const toArrayResult = mockOracles.map((oracle) => ({ ...oracle }));
    
        mongoToArraySpy.mockResolvedValueOnce(toArrayResult);
    
        // Act
        const result = await mongoOraclesRepo.getAllOracles();
    
        // Assert
        expect(result).toEqual(mockOracles);
    });
    
    it('should throw UnableToGetOracleError when unable to retrieve oracles', async () => {
        // Arrange
        const errorMessage = 'Find error';
        mongoToArraySpy.mockRejectedValueOnce(new Error(errorMessage));
    
        // Act & Assert
        await expect(mongoOraclesRepo.getAllOracles()).rejects.toThrow(UnableToGetOracleError);
    });

    it('should return oracle by id from the collection', async () => {
        // Arrange
        const oracleId = 'testOracleId';
        const mockOracle = { id: oracleId }; // Mocked oracle object
        mongoFindOneSpy.mockResolvedValueOnce(mockOracle);
    
        // Act
        const result = await mongoOraclesRepo.getOracleById(oracleId);
    
        // Assert
        expect(result).toEqual(mockOracle);
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ id: oracleId });
    });
    
    it('should return null when oracle with given id does not exist', async () => {
        // Arrange
        const nonExistentOracleId = 'nonExistentOracleId';
        mongoFindOneSpy.mockResolvedValueOnce(null);
    
        // Act
        const result = await mongoOraclesRepo.getOracleById(nonExistentOracleId);
    
        // Assert
        expect(result).toBeNull();
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ id: nonExistentOracleId });
    });
    
    it('should throw UnableToGetOracleError when unable to retrieve oracle by id', async () => {
        // Arrange
        const oracleId = 'testOracleId';
        const errorMessage = 'Find error';
        mongoFindOneSpy.mockRejectedValueOnce(new Error(errorMessage));
    
        // Act & Assert
        await expect(mongoOraclesRepo.getOracleById(oracleId)).rejects.toThrow(UnableToGetOracleError);
    });

    it('should return oracle by name from the collection', async () => {
        // Arrange
        const oracleName = 'testOracleName';
        const mockOracle = { name: oracleName }; // Mocked oracle object
        mongoFindOneSpy.mockResolvedValueOnce(mockOracle);
    
        // Act
        const result = await mongoOraclesRepo.getOracleByName(oracleName);
    
        // Assert
        expect(result).toEqual(mockOracle);
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ name: oracleName });
    });
    
    it('should return null when oracle with given name does not exist', async () => {
        // Arrange
        const nonExistentOracleName = 'nonExistentOracleName';
        mongoFindOneSpy.mockResolvedValueOnce(null);
    
        // Act
        const result = await mongoOraclesRepo.getOracleByName(nonExistentOracleName);
    
        // Assert
        expect(result).toBeNull();
        expect(mongoFindOneSpy).toHaveBeenCalledWith({ name: nonExistentOracleName });
    });
    
    it('should throw UnableToGetOracleError when unable to retrieve oracle by name', async () => {
        // Arrange
        const oracleName = 'testOracleName';
        const errorMessage = 'Find error';
        mongoFindOneSpy.mockRejectedValueOnce(new Error(errorMessage));
    
        // Act & Assert
        await expect(mongoOraclesRepo.getOracleByName(oracleName)).rejects.toThrow(UnableToGetOracleError);
    });

    it('should return oracle by partyType and currency from the collection', async () => {
        // Arrange
        const partyType = 'testPartyType';
        const currency = 'testCurrency';
        const mockOracles = [{ partyType: partyType, currency: currency }, { partyType: partyType, currency: 'otherCurrency' }];
        const toArrayResult = mockOracles.map((oracle) => ({ ...oracle }));
    
        mongoToArraySpy.mockResolvedValueOnce(toArrayResult);
    
        // Act
        const result = await mongoOraclesRepo.getOracle(partyType, currency);
    
        // Assert
        expect(result).toEqual(mockOracles[0]);
        expect(mongoToArraySpy).toHaveBeenCalledWith();
    });
    
    it('should return oracle by partyType only if currency is null', async () => {
        // Arrange
        const partyType = 'testPartyType';
        const currency = null;
        const mockOracle = { partyType: partyType, currency: 'testCurrency' };
        const toArrayResult = [mockOracle];
    
        mongoToArraySpy.mockResolvedValueOnce(toArrayResult);
    
        // Act
        const result = await mongoOraclesRepo.getOracle(partyType, currency);
    
        // Assert
        expect(result).toEqual(mockOracle);
        expect(mongoToArraySpy).toHaveBeenCalledWith();
    });
    
    it('should return null when oracle with given partyType and currency does not exist', async () => {
        // Arrange
        const partyType = 'nonExistentPartyType';
        const currency = 'nonExistentCurrency';
        const toArrayResult:Oracle[] = [];
    
        mongoToArraySpy.mockResolvedValueOnce(toArrayResult);
    
        // Act & Assert
        await expect(mongoOraclesRepo.getOracle(partyType, currency)).rejects.toThrow(NoSuchOracleError);
    });
    
    it('should throw NoSuchOracleError when unable to retrieve oracle by partyType and currency', async () => {
        // Arrange
        const partyType = 'testPartyType';
        const currency = 'testCurrency';
        const errorMessage = 'Find error';
        mongoToArraySpy.mockRejectedValueOnce(new Error(errorMessage));
    
        // Act & Assert
        await expect(mongoOraclesRepo.getOracle(partyType, currency)).rejects.toThrow(UnableToGetOracleError);
    });
});