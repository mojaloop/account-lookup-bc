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

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

 "use strict";

 // Logger.
 import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
 import {
     AccountLookupAggregate,
     IOracleFinder,
     IOracleProvider,
     IParty,
     NoSuchPartyAssociationError,
     UnableToGetOracleError,
     UnableToGetOracleProviderError
 } from "../../src";
import { MemoryOracleFinder } from "./mocks/memory_oracle_finder_mock";
import { MemoryOracleProvider } from "./mocks/memory_oracle_providers_mock";
import * as uuid from "uuid";
import { OracleCurrency, OracleType } from "./enums";
import { mockedOracleList } from "./mocks/oracleList";

/* Constants. */
const logger: ILogger = new ConsoleLogger();

// Infrastructure.
const oracleFinder: IOracleFinder = new MemoryOracleFinder(
    logger,
);

const oracleProviderList: IOracleProvider[] = [];

for(let i=0 ; i<mockedOracleList.length ; i+=1) {
    const oracleProvider: IOracleProvider = new MemoryOracleProvider(
        logger,
    );
    oracleProvider.id = mockedOracleList[i].id;
    oracleProviderList.push(oracleProvider);
}

// Domain.
const aggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    oracleFinder,
    oracleProviderList
);

describe("party lookup service - unit tests", () => {
    beforeAll(async () => {
        await aggregate.init();
    });

    afterAll(async () => {
        await aggregate.destroy();
    });

    // Associate party by type and id.
    test("associate party by type and id", async () => {
        const party: IParty = {
            id: oracleProviderList[0].id as string,
            type: OracleType.BANK,
            currency: OracleCurrency.EURO,
            subId: null
        };
        const partyReceived: boolean = await aggregate.associatePartyByTypeAndId(party.type, party.id);
        expect(partyReceived).toBeTruthy();
    });
    test("associate party by type and id should throw error of oracle not found", async () => {
        const NonExistingOracleType: string = Date.now().toString();
        const party: IParty = {
            id: oracleProviderList[0].id as string,
            type: NonExistingOracleType,
            currency: OracleCurrency.EURO,
            subId: null
        };
        await expect(
            async () => {
                await aggregate.associatePartyByTypeAndId(party.type, party.id);
            }
        ).rejects.toThrow(UnableToGetOracleError);
    });
    test("associate party by type and id should throw error of oracle provider not found", async () => {
        const party: IParty = {
            id: "2" as string,
            type: OracleType.CREDIT_UNION,
            currency: OracleCurrency.EURO,
            subId: null
        };
        await expect(
            async () => {
                await aggregate.associatePartyByTypeAndId(party.type, party.id);
            }
        ).rejects.toThrow(UnableToGetOracleProviderError);
    });
    test("associate party by type and id should return true if successful", async () => {
        const party: IParty = {
            id: oracleProviderList[1].id as string,
            type: OracleType.BANK,
            currency: OracleCurrency.EURO,
            subId: null
        };

        const partyAssociation = await aggregate.associatePartyByTypeAndId(party.type, party.id);
        expect(partyAssociation).toBeTruthy();
    });

    // Associate party by type and id and subId.
    test("associate party by type and id and subId", async () => {
        const party: IParty = {
            id: oracleProviderList[0].id as string,
            type: OracleType.BANK,
            currency: OracleCurrency.EURO,
            subId: uuid.v4()
        };
        const partyReceived: boolean = await aggregate.associatePartyByTypeAndIdAndSubId(party.type, party.id, party.subId as string);
        expect(partyReceived).toBeTruthy();
    });
    test("associate party by type and id and subId should throw error of oracle not found", async () => {
        const NonExistingOracleType: string = Date.now().toString();
        const party: IParty = {
            id: oracleProviderList[0].id as string,
            type: NonExistingOracleType,
            currency: OracleCurrency.EURO,
            subId: null
        };
        await expect(
            async () => {
                await aggregate.associatePartyByTypeAndIdAndSubId(party.type, party.id, party.subId as string);
            }
        ).rejects.toThrow(UnableToGetOracleError);
    });
    test("associate party by type and id and subId should throw error of oracle provider not found", async () => {
        const party: IParty = {
            id: "NonExistingOracleId",
            type: OracleType.CREDIT_UNION,
            currency: OracleCurrency.EURO,
            subId: null
        };
        await expect(
            async () => {
                await aggregate.associatePartyByTypeAndIdAndSubId(party.type, party.id, party.subId as string);
            }
        ).rejects.toThrow(UnableToGetOracleProviderError);
    });
    test("associate party by type and id and subId should return true if successful", async () => {
        const party: IParty = {
            id: oracleProviderList[1].id as string,
            type: OracleType.BANK,
            currency: OracleCurrency.EURO,
            subId: null
        };

        const partyAssociation = await aggregate.associatePartyByTypeAndIdAndSubId(party.type, party.id, party.subId as string);
        expect(partyAssociation).toBeTruthy();
    });

    // Get party by type and id.
	test("get associate party by type and id should throw error of oracle not found ", async () => {
        const partyType: string = Date.now().toString();
        const partyId: string = Date.now().toString();
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToGetOracleError);
	});
    test("get associate party by type and id should throw error of party association not found ", async () => {
        const partyType: string = OracleType.BANK;
        const partyId: string = Date.now().toString();
      
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId)
            }
        ).rejects.toThrow(NoSuchPartyAssociationError);
	});
    test("get associate party by type and id should return a party association ", async () => {
        const partyType: string = OracleType.BANK;
        const partyId: string = Date.now().toString();
      
        // Create party association first
        await aggregate.associatePartyByTypeAndId(partyType, partyId);
        const party = await aggregate.getPartyByTypeAndId(partyType, partyId);
        /*
            {
                "currency": "euro", 
                "id": "1661171497915", 
                "subId": null, 
                "type": "BANK"
            }
        */
        expect(party?.id).toEqual(partyId);
	});
    
    // Get party by type and id and subid.
	test("get associate party by type and id and subId should throw error of oracle not found ", async () => {
        const partyType: string = Date.now().toString();
        const partyId: string = Date.now().toString();
        const partySubId: string = Date.now().toString();
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(UnableToGetOracleError);
	});
    // test("get associate party by type and id and subId should throw error of party association not found ", async () => {
    //     const partyType: string = OracleType.BANK;
    //     const partyId: string = Date.now().toString();
    //     const partySubId: string = Date.now().toString();
      
    //     const partyAssociation =                 await aggregate.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
    //     expect(partyAssociation).toEqual(1);
	// });
});
