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

import {ILogger,ConsoleLogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountLookupClient} from "@mojaloop/account-lookup-bc-client";
import {
    AccountLookupAggregate, 
    IOracleFinder, 
    IOracleProvider, 
    IParty, 
    UnableToGetOracleError, 
    UnableToGetOracleProviderError, 
    GetPartyError,
    NoSuchPartyError
} from "@mojaloop/account-lookup-bc-domain";
import {MongoOracleFinderRepo, MongoOracleProviderRepo} from '../../src';
import { mockedOracleList, mockedParties, mockedPartyIds, mockedPartyResultIds, mockedPartyResultSubIds, mockedPartySubIds, mockedPartyTypes } from "./mocks/data";
import { InsertOneResult, Document } from "mongodb";

// Web server.
const WEB_SERVER_HOST: string = process.env.ACCOUNT_LOOKUP_WEB_SERVER_HOST ?? "localhost";
const WEB_SERVER_PORT_NO: number =
    parseInt(process.env.ACCOUNT_LOOKUP_WEB_SERVER_PORT_NO ?? "") || 1234;

// Account Lookup Client.
const ACCOUNT_LOOKUP_URL: string = `http://${WEB_SERVER_HOST}:${WEB_SERVER_PORT_NO}`;
const HTTP_CLIENT_TIMEOUT_MS: number = 10_000;

const DB_HOST: string = process.env.ACCOUNT_LOOKUP_DB_HOST ?? "localhost";
const DB_PORT_NO: number =
    parseInt(process.env.ACCOUNT_LOOKUP_DB_PORT_NO ?? "") || 27017;
const DB_URL: string = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
const DB_NAME: string = "account-lookup";
const ORACLE_PROVIDERS_COLLECTION_NAME: string = "oracle-providers";
const ORACLE_PROVIDER_PARTIES_COLLECTION_NAME: string = "oracle-provider-parties";

 /* ********** Test Interfaces ********** */
 interface IOracleFinderWrite {
    deleteAll(): void;
    storeNewOracleProvider(partyType: String, partyId: String): Promise<InsertOneResult<Document>>;
 }
 interface IOracleFinderTest extends IOracleFinder, IOracleFinderWrite {}

 interface IOracleProviderWrite {
    parties: Map<{partyId:string, partyType:string, partySubId?:string}, IParty|Error | undefined>;
    deleteAll(): void;
    setParties(parties: any): void;
 }
 interface IOracleProviderTest extends IOracleProvider, IOracleProviderWrite {}


 /* ********** Constants ********** */
 
 const logger: ILogger = new ConsoleLogger();
 const oracleFinderRepo: IOracleFinderTest = new MongoOracleFinderRepo(
	logger,
	DB_URL,
	DB_NAME,
	ORACLE_PROVIDERS_COLLECTION_NAME
);



const oracleProviderList: IOracleProviderTest[] = [];

for(let i=0 ; i<mockedOracleList.length ; i+=1) {
    const oracleProviderRepo: IOracleProviderTest = new MongoOracleProviderRepo(
        logger,
        DB_URL,
        DB_NAME,
        ORACLE_PROVIDER_PARTIES_COLLECTION_NAME
    );

    oracleProviderList.push(oracleProviderRepo);
}

const fakeOracleProviderRepo: IOracleProviderTest = new MongoOracleProviderRepo(
    logger,
    DB_URL,
    DB_NAME,
    ORACLE_PROVIDER_PARTIES_COLLECTION_NAME
);

let accountLookupClient: AccountLookupClient;
let aggregate: AccountLookupAggregate;

describe("account lookup - integration tests", () => {
    beforeAll(async () => {
        accountLookupClient = new AccountLookupClient(
            logger,
            ACCOUNT_LOOKUP_URL,
            HTTP_CLIENT_TIMEOUT_MS
        );
        aggregate = new AccountLookupAggregate(
            logger,
            oracleFinderRepo,
            oracleProviderList.concat(fakeOracleProviderRepo)
        );
        await aggregate.init();
    });

    afterAll(async () => {
        await aggregate.destroy();
    });

    afterEach(async () => {
        await oracleFinderRepo.deleteAll();

        for(let i=0 ; i<oracleProviderList.length ; i+=1) {
            oracleProviderList[i].deleteAll();
        }
    });

    // Get party.
    test("should get party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        await insertOracleProviderType({ 
            oracleProvider: oracleProviderList[0], 
            partyType, 
            partyId, 
        })

        //Act
        const party= await aggregate.getPartyByTypeAndId(partyType, partyId);

        //Assert
        expect(party?.id).toBe(mockedPartyResultIds[0]);
        expect(party?.subId).toBe(mockedPartyResultSubIds[0]);

    });

    test("should throw error if is unable to get party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];
        await insertOracleProviderType({ 
            oracleProvider: oracleProviderList[0], 
            partyType, 
            partyId, 
        })

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(GetPartyError);
        
    });

    test("should throw error if no party found for partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = "non-existent-party-id";
        await insertOracleProviderType({ 
            oracleProvider: oracleProviderList[0], 
            partyType, 
            partyId, 
        })
        
        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(NoSuchPartyError);
        
    });

    
    test("should get party by partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[1];
        const partyId = mockedPartyIds[1];
        const partySubId = mockedPartySubIds[0];
        await insertOracleProviderType({ 
            oracleProvider: oracleProviderList[1], 
            partyType, 
            partyId, 
        })

        //Act
        const party= await aggregate.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(party?.id).toBe(mockedPartyResultIds[1]);
        expect(party?.subId).toBe(mockedPartyResultSubIds[1]);

    });

    test("associate party by type and id should throw error of oracle not found", async () => {
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

    test("associate party by type and id should throw error of oracle provider not found", async () => {
        //Arrange 
        const partyType = "non-existent-party-type";
        const partyId = "non-existent-partyd-id";
        await insertOracleProviderType({ 
            oracleProvider: fakeOracleProviderRepo, 
            partyType, 
            partyId, 
        })
        
        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToGetOracleProviderError);
        
    });

    test("should throw error if is unable to get party by partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];
        const partySubId = mockedPartySubIds[0];
        await insertOracleProviderType({ 
            oracleProvider: oracleProviderList[2], 
            partyType, 
            partyId, 
        })
        
        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(GetPartyError);
        
    });

    // Associate party by type and id.
    test("should associate party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        await insertOracleProviderType({ 
            oracleProvider: oracleProviderList[0], 
            partyType, 
            partyId, 
        })

        //Act
        const party = await aggregate.associatePartyByTypeAndId(partyType, partyId);

        //Assert
        expect(party).toBe(undefined);

    });

    // Associate party by type and id and subId.
    test("should associate party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const partySubId = mockedPartySubIds[0];
        await insertOracleProviderType({ 
            oracleProvider: oracleProviderList[0], 
            partyType, 
            partyId, 
        })

        //Act
        const party = await aggregate.associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(party).toBe(undefined);

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
    test("should associate party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        await insertOracleProviderType({ 
            oracleProvider: oracleProviderList[0], 
            partyType, 
            partyId, 
        })

        //Act
        const party = await aggregate.disassociatePartyByTypeAndId(partyType, partyId);

        //Assert
        expect(party).toBe(undefined);

    });

    test("disassociate party by type and id should throw error of oracle not found", async () => {
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
    test("should associate party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const partySubId = mockedPartySubIds[0];

        await insertOracleProviderType({ 
            oracleProvider: oracleProviderList[0], 
            partyType, 
            partyId,
        })

        //Act
        const party = await aggregate.disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(party).toBe(undefined);

    });

    test("disassociate party by type and id should throw error of oracle not found", async () => {
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

// Helper Functions.
async function insertOracleProviderType({ 
    oracleProvider, 
    partyType, 
    partyId, 
    addParties = true
}: { 
    oracleProvider: IOracleProviderTest, 
    partyType: String, 
    partyId: String, 
    addParties?: boolean
}): Promise<null> {
    await oracleFinderRepo.storeNewOracleProvider(partyType, partyId)

    oracleProvider.id = partyId;
    oracleProvider.type = partyType;
    
    if(addParties) {
        oracleProvider.parties = mockedParties;
    }
    return null;
}