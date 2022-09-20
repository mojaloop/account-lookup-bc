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
import {
    IOracleFinder, 
    IOracleProvider, 
    UnableToGetOracleError,
    UnableToGetPartyError,
    PartyAssociationAlreadyExistsError,
    PartyAssociationDoesntExistsError,
    ParticipantAssociationDoesntExistsError,
    ParticipantAssociationAlreadyExistsError,
    UnableToGetParticipantError
} from "@mojaloop/account-lookup-bc-domain";
import { ILocalCache, LocalCache, MongoOracleFinderRepo, MongoOracleProviderRepo} from '../../src';
import { mockedOracleList, mockedParticipantFspIds, mockedParticipantIds, mockedParticipantResultIds, mockedParticipantResultSubIds, mockedParticipantSubIds, mockedParticipantTypes, mockedPartyIds, mockedPartyResultIds, mockedPartyResultSubIds, mockedPartySubIds, mockedPartyTypes } from "./mocks/data";
import { mongoQuery, MongoDbOperationEnum } from "./helpers/db";

 /* ********** Constants ********** */

const DB_HOST: string = process.env.ACCOUNT_LOOKUP_DB_HOST ?? "localhost";
const DB_PORT_NO: number =
    parseInt(process.env.ACCOUNT_LOOKUP_DB_PORT_NO ?? "") || 27017;
const DB_URL: string = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
const DB_NAME: string = "account-lookup";
const ORACLE_PROVIDERS_COLLECTION_NAME: string = "oracle-providers";
const ORACLE_PROVIDER_PARTIES_COLLECTION_NAME: string = "oracle-provider-parties";


 /* ********** Repos ********** */
 
 const logger: ILogger = new ConsoleLogger();
 logger.setLogLevel(LogLevel.FATAL);

 const oracleFinderRepo: IOracleFinder = new MongoOracleFinderRepo(
	logger,
	DB_URL,
	DB_NAME,
	ORACLE_PROVIDERS_COLLECTION_NAME
);

const oracleProviderListRepo: IOracleProvider[] = [];

for(let i=0 ; i<mockedOracleList.length ; i+=1) {
    const oracleProviderRepo: IOracleProvider = new MongoOracleProviderRepo(
        logger,
        DB_URL,
        DB_NAME,
        ORACLE_PROVIDER_PARTIES_COLLECTION_NAME
    );

    oracleProviderListRepo.push(oracleProviderRepo);
}
jest.setTimeout(100000);

const localCache: ILocalCache = new LocalCache(
	logger,
);

describe("account lookup - infrastructure integration tests", () => {
    beforeAll(async () => {
        oracleFinderRepo.init();
        for await (const oracleProviderRepo of oracleProviderListRepo) {
            await oracleProviderRepo.init();
        }
    });

    afterEach(async () => {
        await mongoQuery({
            dbUrl: DB_URL,
            dbName: DB_NAME,
            dbCollection: ORACLE_PROVIDERS_COLLECTION_NAME,
            operation: MongoDbOperationEnum.DELETE_MANY,
            query: {}
        });
        for await (const _oracleProvider of oracleProviderListRepo) {
            await mongoQuery({
                dbUrl: DB_URL,
                dbName: DB_NAME,
                dbCollection: ORACLE_PROVIDER_PARTIES_COLLECTION_NAME,
                operation: MongoDbOperationEnum.DELETE_MANY,
                query: {}
            });
        }
        localCache.destroy();
    });
    
    afterAll(async () => {
        await oracleFinderRepo.destroy();

        for await (const _oracleProvider of oracleProviderListRepo) {
            _oracleProvider.destroy();
        }
    });

    // Get oracle type.
    test("should throw error if is unable to get oracle type", async () => {
        //Arrange 
        const partyType = "non-existent-party-type";
 
        // Act && Assert
        await expect(
            async () => {
                await oracleFinderRepo.getOracleProvider(partyType);
            }
        ).rejects.toThrow(UnableToGetOracleError);
        
    });

    test("should be able to get oracle type", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        await mongoQuery({ 
            dbUrl: DB_URL,
            dbName: DB_NAME,
            dbCollection: ORACLE_PROVIDERS_COLLECTION_NAME,
            operation: MongoDbOperationEnum.INSERT_ONE,
            query: {
                partyType: partyType
            },
        })

        //Act
        const oracle = await oracleFinderRepo.getOracleProvider(partyType);

        //Assert
        expect(oracle?.partyType).toEqual(partyType);
    });

    // Local Cache
    test("should be able to get value from cache", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[0];
        const participantId = mockedParticipantIds[0];
        const participantFspId = mockedParticipantFspIds[0];
        const participant = { id: participantId, type: participantType };

        //Act
        localCache.set(participant, participantFspId)

        //Assert
        expect(localCache.get(participantFspId)).toEqual(participant);
    });

    test("should throw error if trying to set an already existing key", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[0];
        const participantId = mockedParticipantIds[0];
        const participantFspId = mockedParticipantFspIds[0];
        const participant = { id: participantId, type: participantType };

        // Act && Assert
        expect(
            async () => {
                localCache.set(participant, participantFspId)
                localCache.set(participant, participantFspId)
            }
        ).rejects.toThrow(Error);
    });

    test("should be able to delete value from cache", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[0];
        const participantId = mockedParticipantIds[0];
        const participantFspId = mockedParticipantFspIds[0];
        const participant = { id: participantId, type: participantType };

        //Act
        localCache.set(participant, participantFspId)
        localCache.delete(participantFspId)

        //Assert
        expect(localCache.get(participantFspId)).toBeNull();
    });
    
    // Associate party by type and id.
    test("should throw error if party association by partyId already exists", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[2];
        await mongoQuery({ 
            dbUrl: DB_URL,
            dbName: DB_NAME,
            dbCollection: ORACLE_PROVIDERS_COLLECTION_NAME,
            operation: MongoDbOperationEnum.INSERT_ONE,
            query: {
                partyId: partyId,
            },
            cb: () => { 
                oracleProviderListRepo[0].partyType = partyType
            }
        })

        
        // Act && Assert
        await oracleProviderListRepo[0].associateParty(partyId);
        
        await expect(
            async () => {
                await oracleProviderListRepo[0].associateParty(partyId);
            }
        ).rejects.toThrow(PartyAssociationAlreadyExistsError);
        
    });
    
    test("should associate party by partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        await mongoQuery({ 
            dbUrl: DB_URL,
            dbName: DB_NAME,
            dbCollection: ORACLE_PROVIDERS_COLLECTION_NAME,
            operation: MongoDbOperationEnum.INSERT_ONE,
            query: {
                id: partyId,
                type: partyType
            },
            cb: () => { 
                oracleProviderListRepo[0].partyType = partyType
            }
        })

        //Act
        const party = await oracleProviderListRepo[0].associateParty(partyId);

        //Assert
        expect(party).toBeNull();

    });


    // Disassociate party by partyId.
    test("should throw an error if trying to disassociate party by partyId", async () => {
        //Arrange 
        const partyId = mockedPartyIds[3];

        // Act && Assert
        await expect(
            async () => {
                await oracleProviderListRepo[0].disassociateParty(partyId);
            }
        ).rejects.toThrow(PartyAssociationDoesntExistsError);
        
    });

    test("should disassociate party by partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        await mongoQuery({ 
            dbUrl: DB_URL,
            dbName: DB_NAME,
            dbCollection: ORACLE_PROVIDERS_COLLECTION_NAME,
            operation: MongoDbOperationEnum.INSERT_ONE,
            query: {
                id: partyId,
            },
            cb: () => { 
                oracleProviderListRepo[0].partyType = partyType
            }
        })

        //Act
        await oracleProviderListRepo[0].associateParty(partyId);

        const party = await oracleProviderListRepo[0].disassociateParty(partyId);

        //Assert
        expect(party).toBeNull();

    });

    // Get participant by type and id.
    test("should throw error if is unable to find participant for participantType", async () => {
        //Arrange 
        const participantId = mockedParticipantIds[4];

        await expect(
            async () => {
                await oracleProviderListRepo[0].getParticipant(participantId);
            }
        ).rejects.toThrow(UnableToGetParticipantError);
        
    });

    test("should get fspId info with participant by participantId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[0];
        const partyId = mockedPartyIds[0];
        const participantId = mockedParticipantFspIds[0];

        await mongoQuery({ 
            dbUrl: DB_URL,
            dbName: DB_NAME,
            dbCollection: ORACLE_PROVIDERS_COLLECTION_NAME,
            operation: MongoDbOperationEnum.INSERT_ONE,
            query: {
                participantId: participantId,
                participantType: participantType,
            },
            cb: () => { 
                oracleProviderListRepo[0].partyType = participantType
            }
        })
        await mongoQuery({ 
            dbUrl: DB_URL,
            dbName: DB_NAME,
            dbCollection: ORACLE_PROVIDER_PARTIES_COLLECTION_NAME,
            operation: MongoDbOperationEnum.INSERT_ONE,
            query: {
                participantId: participantId,
                partyId: partyId,
            },
        })

        //Act
        const fspId = await oracleProviderListRepo[0].getParticipant(partyId);

        //Assert
        expect(fspId).toBe(participantId);

    });
});
