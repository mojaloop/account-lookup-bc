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
    AccountLookupAggregate, 
    IOracleFinder, 
    IOracleProvider, 
    UnableToGetOracleError,
    UnableToGetOracleProviderError,
    UnableToAssociatePartyError,
    UnableToDisassociatePartyError,
    GetPartyError
} from "@mojaloop/account-lookup-bc-domain";
import {MongoOracleFinderRepo, MongoOracleProviderRepo} from '@mojaloop/account-lookup-bc-infrastructure';
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

const oracleProviderList: IOracleProvider[] = [];

for(let i=0 ; i<mockedOracleList.length ; i+=1) {
    const oracleProviderRepo: IOracleProvider = new MongoOracleProviderRepo(
        logger,
        DB_URL,
        DB_NAME,
        ORACLE_PROVIDER_PARTIES_COLLECTION_NAME
    );

    oracleProviderList.push(oracleProviderRepo);
}

const fakeOracleProviderRepo: IOracleProvider = new MongoOracleProviderRepo(
    logger,
    DB_URL,
    DB_NAME,
    ORACLE_PROVIDER_PARTIES_COLLECTION_NAME
);

let aggregate: AccountLookupAggregate;

describe("account lookup - integration tests", () => {
    beforeAll(async () => {
        aggregate = new AccountLookupAggregate(
            logger,
            oracleFinderRepo,
            oracleProviderList.concat(fakeOracleProviderRepo)
        );
        await aggregate.init();
    });

    afterEach(async () => {
        await mongoQuery({
            dbUrl: DB_URL,
            dbName: DB_NAME,
            dbCollection: ORACLE_PROVIDERS_COLLECTION_NAME,
            operation: MongoDbOperationEnum.DELETE_MANY,
            query: {}
        });
        for await (const _oracleProvider of oracleProviderList) {
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
        await aggregate.destroy();
    });


    // Get party.
    test("should throw error if is unable to get oracle", async () => {
        //Arrange 
        const partyType = "error";
        const partyId = mockedPartyIds[0];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToGetOracleError);
        
    });

    test("should throw error if is unable to find oracle for partyType", async () => {
        //Arrange 
        const partyType = "non-exisiting-oracle-type";
        const partyId = mockedPartyIds[0];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToGetOracleError);
        
    });
 
    test("should throw error if oracle returned is not present in the oracle providers list", async () => {
        //Arrange 
        const partyType = "not_found_oracle";
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
        
        // Act && Assert

        // Changing oracle provider id in runtime to not match it when trying to find it
        fakeOracleProviderRepo.id = "runtime-id";
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToGetOracleProviderError);
          
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
                oracleProviderList[0].id = partyId
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
        const party = await aggregate.getPartyByTypeAndId(partyType, partyId);

        //Assert
        expect(party?.id).toBe(mockedPartyResultIds[0]);
        expect(party?.subId).toBeUndefined();

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
                oracleProviderList[0].id = partyId
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
        const party = await aggregate.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(party?.id).toBe(mockedPartyResultIds[0]);
        expect(party?.subId).toBe(mockedPartyResultSubIds[0]);

    });


    test("should throw error if no party found for partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = "non-existent-party-id";
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
                oracleProviderList[0].id = partyId
            }
        })
        
        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(GetPartyError);
        
    });

    
    test("should get party by partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[1];
        const partyId = mockedPartyIds[1];
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
                oracleProviderList[1].id = partyId
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
        const party = await aggregate.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(party?.id).toBe(mockedPartyResultIds[1]);
        expect(party?.subId).toBe(mockedPartyResultSubIds[1]);

    });

    test("should throw error of oracle not found when associating party by type and id", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.associatePartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToGetOracleError);
        
    });

    test("should throw error of oracle provider not found when associating party by type and id", async () => {
        //Arrange 
        const partyType = "non-existent-party-type";
        const partyId = "non-existent-partyd-id";
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
                fakeOracleProviderRepo.id = partyId
            }
        })
        
        // Act && Assert

        // Changing oracle provider id in runtime to not match it when trying to find it
        fakeOracleProviderRepo.id = "runtime-id";

        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToGetOracleProviderError);
        
    });

    // Associate party by type and id.
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
                oracleProviderList[0].id = partyId
            }
        })

        //Act
        const party = await aggregate.associatePartyByTypeAndId(partyType, partyId);

        //Assert
        expect(party).toBeUndefined();

    });

    test("should throw error if is unable to associate party by partyType and partyId", async () => {
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
                oracleProviderList[0].id = partyId
            }
        })

        
        // Act && Assert
        await aggregate.associatePartyByTypeAndId(partyType, partyId);
        
        await expect(
            async () => {
                await aggregate.associatePartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToAssociatePartyError);
        
    });


    // Associate party by type and id and subId.
    test("should associate party by partyType and partyId", async () => {
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
                oracleProviderList[0].id = partyId
            }
        })

        //Act
        const party = await aggregate.associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(party).toBeUndefined();

    });

    test("associate party by type and id and subId should throw error of party not found", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];
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
                oracleProviderList[0].id = partyId
            }
        })
        
        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(GetPartyError);
        
    });

    test("associate party by type and id and subId should throw error of oracle not found", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];
        const partySubId = mockedPartySubIds[0];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(UnableToGetOracleError);
        
    });
    

    // Disassociate party by type and id.
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
                oracleProviderList[0].id = partyId
            }
        })

        //Act
        await aggregate.associatePartyByTypeAndId(partyType, partyId);

        const party = await aggregate.disassociatePartyByTypeAndId(partyType, partyId);

        //Assert
        expect(party).toBeUndefined();

    });

    test("should throw an error if trying to disassociate party by type and id with oracle not found", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.disassociatePartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToGetOracleError);
        
    });

    // Disassociate party by type and id and subId.
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
                oracleProviderList[0].id = partyId
            }
        })

        // Act && Assert
        await aggregate.associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
        
        await expect(
            async () => {
                await aggregate.disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(UnableToDisassociatePartyError);

    });

    test("should throw error of oracle not found when disassociating party by type and id and subId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];
        const partySubId = mockedPartySubIds[0];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(UnableToGetOracleError);
        
    });
});
