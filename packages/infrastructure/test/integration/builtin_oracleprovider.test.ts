
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

 import {ILogger,ConsoleLogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
 import { mongoQuery, MongoDbOperationEnum } from "../utils/helpers/db";
 import { MongoOracleProviderRepo, ParticipantAssociationAlreadyExistsError, UnableToCloseDatabaseConnectionError, UnableToInitOracleProvider, UnableToStoreParticipantAssociationError } from "../../src/index";
 import { Oracle } from "@mojaloop/account-lookup-bc-domain";
 
 const logger: ILogger = new ConsoleLogger();
 logger.setLogLevel(LogLevel.FATAL);
 
 const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_TEST_NAME ?? "test";
 const CONNECTION_STRING = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";
 const COLLECTION_NAME = "builtinOracleParties";
 
 let builtInOracleProvider: MongoOracleProviderRepo;
 const oracle: Oracle = {
     id: "1",
     endpoint:null,
     name: "test",
     partyType: "MSISDN",
     partySubType:"PHONE",
     type: "builtin",
 };
 
 describe("Infrastructure - Builtin Oracle Provider Integration tests", () => {
 
     beforeAll(async () => {
         builtInOracleProvider = new MongoOracleProviderRepo(oracle,logger,CONNECTION_STRING,DB_NAME);
         await builtInOracleProvider.init();
     });
 
     afterEach(async () => {
         await mongoQuery({
             dbUrl: CONNECTION_STRING,
             dbName: DB_NAME,
             dbCollection: COLLECTION_NAME,
             operation: MongoDbOperationEnum.DELETE_MANY,
             query: {}
         });
     });
 
     afterAll(async () => {
         await builtInOracleProvider.destroy();
     });


    test("should be able to init the builtin oracle provider", async () => {
        expect(builtInOracleProvider).toBeDefined();
    });

    test("should throw error if unable to init builtin provider", async () => {
        const nonWorkingBuiltInOracleProvider = new MongoOracleProviderRepo(oracle,logger,CONNECTION_STRING,"fakeName");
        await expect(nonWorkingBuiltInOracleProvider.init()).rejects.toThrowError(UnableToInitOracleProvider);
    });

    test("should throw error if unable to destroy builtin provider", async () => {
        const nonWorkingBuiltInOracleProvider = new MongoOracleProviderRepo(oracle,logger,CONNECTION_STRING,"fakeName");
        await expect(nonWorkingBuiltInOracleProvider.destroy()).rejects.toThrowError();
    });
 
     test("should get participant fspid", async () => {
        // Arrange
        const fspId = "fsp1";
        const partyType = "MSISDN";
        const partyId = "123456789";
        const partySubId = "987654321";
        const currency = "USD";
        await builtInOracleProvider.associateParticipant(fspId, partyType, partyId, partySubId, currency);
        
        // Act
        const result = await builtInOracleProvider.getParticipantFspId(partyType, partyId, partySubId, currency);

        // Assert
        expect(result).toEqual(fspId);
            
    });
    
    test("should be able to associate a participant to an oracle", async () => {
            // Arrange
            const fspId = "fsp1";
            const partyType = "MSISDN";
            const partyId = "123456789";
            const partySubId = "987654321";
            const currency = "USD";

            // Act
            const result = await builtInOracleProvider.associateParticipant(fspId, partyType, partyId, partySubId, currency);
            
            // Assert
            expect(result).toEqual(null);
            const queryResult = await mongoQuery({
                dbUrl: CONNECTION_STRING,
                dbName: DB_NAME,
                dbCollection: COLLECTION_NAME,
                operation: MongoDbOperationEnum.FIND,
                query: {
                    fspId,
                    partyType,
                    partyId,
                    partySubId,
                    currency
                }});

            expect(queryResult.length).toEqual(1);

     });

    test("should throw error if association already exists", async () => {
        // Arrange
        const fspId = "fsp1";
        const partyType = "MSISDN";
        const partyId = "123456789";
        const partySubId = "987654321";
        const currency = "USD";
        await builtInOracleProvider.associateParticipant(fspId, partyType, partyId, partySubId, currency);
        
        // Act and Assert
        await expect(builtInOracleProvider.associateParticipant(fspId, partyType, partyId, partySubId, currency)).rejects.toThrow(ParticipantAssociationAlreadyExistsError);
        
        
    });

    test("should be able to disassociate a participant from an oracle", async () => {
        // Arrange
        const fspId = "fsp1";
        const partyType = "MSISDN";
        const partyId = "123456789";
        const partySubId = "987654321";
        const currency = "USD";
        await builtInOracleProvider.associateParticipant(fspId, partyType, partyId, partySubId, currency);
        
        // Act
        const result = await builtInOracleProvider.disassociateParticipant(fspId,partyType, partyId, partySubId, currency);
        
        // Assert
        expect(result).toBeNull();
        const queryResult = await mongoQuery({
            dbUrl: CONNECTION_STRING,
            dbName: DB_NAME,
            dbCollection: COLLECTION_NAME,
            operation: MongoDbOperationEnum.FIND,
            query: {
                fspId,
                partyType,
                partyId,
                partySubId,
                currency
            }});
        expect(queryResult.length).toEqual(0);
    
    });


    test("should be able to perform health check", async () => {   
        // Act
        const result = await builtInOracleProvider.healthCheck();
        
        // Assert
        expect(result).toEqual(true);
    });


    test("should return false health check if db is down", async () => {
        // Arrange
        const nonWorkingBuiltInOracleProvider = new MongoOracleProviderRepo(oracle,logger,CONNECTION_STRING,"invalid_db_name");
        
        // Act
        const result = await nonWorkingBuiltInOracleProvider.healthCheck();
        
        // Assert
        expect(result).toEqual(false);
    });

 
 });
 
 
 
 