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

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 ******/

 "use strict";

 // Logger.
 import {ConsoleLogger, ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
 import {
     AccountLookupAggregate,
     GetPartyError,
     IOracleFinder,
     IOracleProvider,
     NoSuchPartyError,
     UnableToAssociatePartyError,
     UnableToDisassociatePartyError,
     UnableToGetOracleError,
     UnableToGetOracleProviderError,
 } from "../../src";
import { MemoryOracleFinder } from "./mocks/memory_oracle_finder";
import { MemoryOracleProvider } from "./mocks/memory_oracle_providers";
import { mockedOracleList, mockedPartyIds, mockedPartyResultIds, mockedPartyResultSubIds, mockedPartySubIds, mockedPartyTypes } from "./mocks/data";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

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

describe("Account Lookup Domain", () => {
    
   
    afterEach(async () => {
        jest.resetAllMocks();
    });

    test("should throw error if couldnt init aggregate", async () => {
        // Arrange
        jest.spyOn(oracleFinder, "init").mockImplementation(() => {throw new Error();});

        // Act && Assert

        await expect(aggregate.init()).rejects.toThrowError();

        
    });

    test("should throw error if couldnt destroy aggregate", async () => {

        // Arrange
        jest.spyOn(oracleFinder, "destroy").mockImplementation(() => {throw new Error();});

        // Act && Assert

        await expect(aggregate.destroy()).rejects.toThrowError();
        
    });


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
 
         // Act && Assert
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

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(GetPartyError);
        
    });


    test("should throw error if no party found for partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[1];
        const partyId = "non-existent-party-id";

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

        //Act
        const party= await aggregate.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(party?.id).toBe(mockedPartyResultIds[1]);
        expect(party?.subId).toBe(mockedPartyResultSubIds[1]);

    });

    test("should throw error if is unable to get party by partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];
        const partySubId = mockedPartySubIds[0];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(GetPartyError);
        
    });


    test("should throw error if no party found for partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[1];
        const partyId = "non-existent-party-id";
        const partySubId = "non-existent-party-sub-id";

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(NoSuchPartyError);
        
    });


    test("should associate party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];

        //Act
        const association= await aggregate.associatePartyByTypeAndId(partyType, partyId);

        //Assert
        expect(association).toBeUndefined();
  
    });

    test("should throw error if is unable to associate party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[2];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.associatePartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToAssociatePartyError);
        
    });


    test("should associate party by partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[1];
        const partyId = mockedPartyIds[1];
        const partySubId = mockedPartySubIds[0];
        

        //Act
        const association= await aggregate.associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(association).toBeUndefined();
  
    });


    test("should throw error if is unable to associate party by partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[2];
        const partySubId = mockedPartyIds[1];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(UnableToAssociatePartyError);
        
    });

    test("should disassociate party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];

        //Act
        const association= await aggregate.disassociatePartyByTypeAndId(partyType, partyId);

        //Assert
        expect(association).toBeUndefined();
  
    });

    test("should throw error if is unable to disassociate party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[2];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.disassociatePartyByTypeAndId(partyType, partyId);
            }
        ).rejects.toThrow(UnableToDisassociatePartyError);
        
    });

    test("should disassociate party by partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[1];
        const partyId = mockedPartyIds[1];
        const partySubId = mockedPartySubIds[0];

        //Act
        const association= await aggregate.disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);

        //Assert
        expect(association).toBeUndefined();
  
    });

    test("should throw error if is unable to disassociate party by partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[2];
        const partySubId = mockedPartySubIds[1];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(UnableToDisassociatePartyError);
        
    });

});
