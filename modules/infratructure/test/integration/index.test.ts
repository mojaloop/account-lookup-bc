/*****
 License
--------------
Copyright © 2017 Bill & Melinda Gates Foundation
The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Contributors
--------------
This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
Names of the original copyright holders (individuals or organizations)
should be listed with a '*' in the first column. People who have
contributed from an organization can be listed under the organization
that actually holds the copyright for their contributions (see the
Gates Foundation organization for an example). Those individuals should have
their names indented and be marked with a '-'. Email address can be added
optionally within square brackets <email>.

* Gates Foundation
- Name Surname <name.surname@gatesfoundation.com>

* Coil
- Jason Bruwer <jason.bruwer@coil.com>

--------------
******/

"use strict";

import {ILogger,ConsoleLogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {
    IOracleFinder, 
    IOracleProvider, 
    UnableToGetOracleError,
    UnableToGetPartyError,
    PartyAssociationAlreadyExistsError,
    PartyAssociationDoesntExistsError
} from "@mojaloop/account-lookup-bc-domain";
import {MongoOracleFinderRepo, MongoOracleProviderRepo} from '../../src';
import { mockedOracleList, mockedPartyIds, mockedPartyResultIds, mockedPartyResultSubIds, mockedPartySubIds, mockedPartyTypes } from "./mocks/data";
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

describe("account lookup - integration tests", () => {
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
                await oracleFinderRepo.getOracleForType(partyType);
            }
        ).rejects.toThrow(UnableToGetOracleError);
        
    });

    test("should be able to get oracle type", async () => {
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
        })

        //Act
        const oracle = await oracleFinderRepo.getOracleForType(partyType);

        //Assert
        expect(oracle).toEqual(partyId);
    });


    // Get party by type and id.
    test("should throw error if is unable to find party for partyType", async () => {
        //Arrange 
        const partyType = "non-exisiting-oracle-type";
        const partyId = mockedPartyIds[0];

        // Act && Assert
        await expect(
            async () => {
                await oracleProviderListRepo[0].getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToGetPartyError);
        
    });

    test("should get party by partyType and partyId", async () => {
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
                oracleProviderListRepo[0].id = partyId
            }
        })
        await mongoQuery({ 
            dbUrl: DB_URL,
            dbName: DB_NAME,
            dbCollection: ORACLE_PROVIDER_PARTIES_COLLECTION_NAME,
            operation: MongoDbOperationEnum.INSERT_ONE,
            query: {
                id: partyId,
                type: partyType
            },
        })

        //Act
        const party = await oracleProviderListRepo[0].getPartyByTypeAndId(partyType, partyId);

        //Assert
        expect(party?.id).toBe(mockedPartyResultIds[0]);
        expect(party?.subId).toBeUndefined();

    });

    // Get party by type and id and subId.
    test("should throw error if is unable to find party for partyType", async () => {
        //Arrange 
        const partyType = "non-exisiting-oracle-type";
        const partyId = mockedPartyIds[0];
        const partySubId = mockedPartyResultSubIds[0];

        // Act && Assert
        await expect(
            async () => {
                await oracleProviderListRepo[0].getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(UnableToGetPartyError);
        
    });

    test("should get party by partyType and partyId and subId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const partySubId = mockedPartyResultSubIds[0];
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
                oracleProviderListRepo[0].id = partyId
            }
        })
        await mongoQuery({ 
            dbUrl: DB_URL,
            dbName: DB_NAME,
            dbCollection: ORACLE_PROVIDER_PARTIES_COLLECTION_NAME,
            operation: MongoDbOperationEnum.INSERT_ONE,
            query: {
                id: partyId,
                type: partyType,
                subId: partySubId
            },
        })

        //Act
        const party = await oracleProviderListRepo[0].getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(party?.id).toBe(mockedPartyResultIds[0]);
        expect(party?.subId).toBe(mockedPartyResultSubIds[0]);
        
    });
    
    // Associate party by type and id.
    test("should throw error if party association by partyType and partyId already exists", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[2];
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
                oracleProviderListRepo[0].id = partyId
            }
        })

        
        // Act && Assert
        await oracleProviderListRepo[0].associatePartyByTypeAndId(partyType, partyId);
        
        await expect(
            async () => {
                await oracleProviderListRepo[0].associatePartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(PartyAssociationAlreadyExistsError);
        
    });
    
    test("should associate party by partyType and partyId", async () => {
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
                oracleProviderListRepo[0].id = partyId
            }
        })

        //Act
        const party = await oracleProviderListRepo[0].associatePartyByTypeAndId(partyType, partyId);

        //Assert
        expect(party).toBeNull();

    });



    // Associate party by type and id and subId.
    test("should throw error if party association by partyType and partyId and subId already exists", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[2];
        const partySubId = mockedPartySubIds[2];
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
                oracleProviderListRepo[0].id = partyId
            }
        })

        
        // Act && Assert
        await oracleProviderListRepo[0].associatePartyByTypeAndId(partyType, partyId);
        
        await expect(
            async () => {
                await oracleProviderListRepo[0].associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(PartyAssociationAlreadyExistsError);
        
    });
    
    test("should associate party by partyType and partyId and subId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const partySubId = mockedPartySubIds[0];
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
                oracleProviderListRepo[0].id = partyId
            }
        })

        //Act
        const party = await oracleProviderListRepo[0].associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(party).toBeNull();

    });
    

    // Disassociate party by type and id.
    test("should throw an error if trying to disassociate party by type and id", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];

        // Act && Assert
        await expect(
            async () => {
                await oracleProviderListRepo[0].disassociatePartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(PartyAssociationDoesntExistsError);
        
    });

    test("should disassociate party by partyType and partyId", async () => {
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
                oracleProviderListRepo[0].id = partyId
            }
        })

        //Act
        await oracleProviderListRepo[0].associatePartyByTypeAndId(partyType, partyId);

        const party = await oracleProviderListRepo[0].disassociatePartyByTypeAndId(partyType, partyId);

        //Assert
        expect(party).toBeNull();

    });


    // Disassociate party by type and id and subId.
    test("should throw an error if trying to disassociate party by type and id and subId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];
        const partySubId = mockedPartySubIds[0];

        // Act && Assert
        await expect(
            async () => {
                await oracleProviderListRepo[0].disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(PartyAssociationDoesntExistsError);
        
    });

    test("should disassociate party by partyType and partyId and subId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const partySubId = mockedPartySubIds[0];
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
                oracleProviderListRepo[0].id = partyId
            }
        })

        //Act
        await oracleProviderListRepo[0].associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        const party = await oracleProviderListRepo[0].disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(party).toBeNull();

    });

});
