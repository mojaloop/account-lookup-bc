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


 // Logger.
 import {ConsoleLogger, ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
 import { IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
 import {Party} from "../../src/entities/party";
 import {Participant} from "../../src/entities/partipant";
 import {
     AccountLookupAggregate,
     GetParticipantError,
     GetPartyError,
     ILocalCache,
     InvalidParticipantIdError,
     InvalidParticipantTypeError,
     InvalidPartyIdError,
     InvalidPartyTypeError,
     IOracleFinder,
     IOracleProvider,
     IParticipant,
     IParticipantService,
     NoSuchParticipantError,
     NoSuchParticipantFspIdError,
     NoSuchPartyError,
     UnableToAssociateParticipantError,
     UnableToAssociatePartyError,
     UnableToDisassociateParticipantError,
     UnableToDisassociatePartyError,
     UnableToGetOracleError,
     UnableToGetOracleProviderError,
 } from "../../src";
import { MemoryOracleFinder } from "./mocks/memory_oracle_finder";
import { MemoryMessageProducer } from "./mocks/memory_message_producer";
import { mockedOracleList, mockedParticipantIds, mockedParticipantResultIds, mockedParticipantResultSubIds, mockedParticipantSubIds, mockedParticipantTypes, mockedPartyIds, mockedPartyResultIds, mockedPartyResultSubIds, mockedPartySubIds, mockedPartyTypes } from "./mocks/data";
import { MemoryOracleProvider } from "./mocks/memory_oracle_providers";
import { MemoryParticipantService } from "./mocks/memory_participant_service";
import { MemoryLocalCache } from "./mocks/memory_local_cache";

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

const messageProducer: IMessageProducer = new MemoryMessageProducer(
    logger,
);

const localCache: ILocalCache = new MemoryLocalCache(logger);

const participantService: IParticipantService = new MemoryParticipantService(
    logger,
);

// Domain.
const aggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    oracleFinder,
    oracleProviderList,
    messageProducer,
    localCache,
    participantService
);

describe("Account Lookup Domain", () => {
    
   
    afterEach(async () => {
        jest.resetAllMocks();
    });


    test("should create a new party entity", async()=>{
        // Arrange 
        const id="fakeId";
	    const type="fake type";
        const currency= "fake currency";
	    const subId="fake sub id";

        // Act
        const party = new Party(id, type, currency, subId);

        // Assert

        expect(party.id).toBe(id);
        expect(party.type).toBe(type);
        expect(party.currency).toBe(currency);
        expect(party.subId).toBe(subId);
        
    });

    test("should throw error if party id is not valid", async()=>{
        // Arrange 
        const id="";
	    const type="fake type";
        const currency= "fake currency";
	    const subId="fake sub id";

        // Act
        const party = new Party(id, type, currency, subId);


        // Assert
        expect(() => {
            Party.validateParty(party);
          }).toThrowError(InvalidPartyIdError);
        
        
    });


    test("should throw error if party type is not valid", async()=>{
        // Arrange 
        const id="fake id";
	    const type="";
        const currency= "fake currency";
	    const subId="fake sub id";

        // Act
        const party = new Party(id, type, currency, subId);


        // Assert

        expect(() => {
            Party.validateParty(party);
          }).toThrowError(InvalidPartyTypeError);
        
    });


    test("should throw error if couldnt init aggregate", async () => {
        // Arrange
        jest.spyOn(oracleFinder, "init").mockImplementation(() => {throw new Error();});

        // Act && Assert

        await expect(aggregate.init()).rejects.toThrowError();

        
    });

    test("should return participant from cache by type and id", async () => {

        // Arrange
        const participant:IParticipant = { 
            id: '1', 
            type: '2', 
            subId: null
        };
        jest.spyOn(localCache, "get").mockReturnValue(participant);

        // Act 
        const result = await aggregate.getParticipantByTypeAndId(participant.type, participant.id);

        // Assert
        expect(result).toEqual(participant);
        
    });
    
    test("should return participant from cache by type and id and subid", async () => {

        // Arrange
        const participant:IParticipant = { 
            id: '1', 
            type: '2', 
            subId: '3'
        };
        jest.spyOn(localCache, "get").mockReturnValue(participant);

        // Act 
        const result = await aggregate.getParticipantByTypeAndIdAndSubId(participant.type, participant.id, participant.subId as string);

        // Assert
        expect(result).toEqual(participant);
        
    });

    test("should throw error if is unable to get oracle", async () => {
       //Arrange 
       const partyType = "error";
       const partyId = mockedPartyIds[0];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndIdRequest(partyType, partyId);
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
                 await aggregate.getPartyByTypeAndIdRequest(partyType, partyId);
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
                 await aggregate.getPartyByTypeAndIdRequest(partyType, partyId);
             }
         ).rejects.toThrow(UnableToGetOracleProviderError);
         
     });


    test("should get party by partyType and partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];

        //Act
        const party= await aggregate.getPartyByTypeAndIdResponse(partyType, partyId);

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
                await aggregate.getPartyByTypeAndIdRequest(partyType, partyId);
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
                await aggregate.getPartyByTypeAndIdRequest(partyType, partyId);
            }
        ).rejects.toThrow(NoSuchPartyError);
        
    });

    test("should publish a message for party request for partyType, partyId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[1];
        const partyId = mockedPartyIds[1];

        const messageProducerSpy = jest.spyOn(messageProducer, "send");
        
        //Act
        await aggregate.getPartyByTypeAndIdRequest(partyType, partyId);

        //Assert
        expect(messageProducerSpy).toHaveBeenCalledTimes(1);
    });


    test("should get party by partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[1];
        const partyId = mockedPartyIds[1];
        const partySubId = mockedPartySubIds[0];

        //Act
        const party= await aggregate.getPartyByTypeAndIdAndSubIdResponse(partyType, partyId, partySubId);

        //Assert
        expect(party?.id).toBe(mockedPartyResultIds[1]);
        expect(party?.subId).toBe(mockedPartyResultSubIds[1]);

    });

    test("should throw error if is unable to get party by partyType, partyId and partySubId request", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[3];
        const partySubId = mockedPartySubIds[0];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndIdAndSubIdRequest(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(GetPartyError);
        
    });


    test("should throw error if no party found for partyType, partyId and partySubId request", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[1];
        const partyId = "non-existent-party-id";
        const partySubId = "non-existent-party-sub-id";

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyByTypeAndIdAndSubIdRequest(partyType, partyId, partySubId);
            }
        ).rejects.toThrow(NoSuchPartyError);
        
    });

    test("should publish a message for party request for partyType, partyId and partySubId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[1];
        const partyId = mockedPartyIds[1];
        const partySubId = mockedPartySubIds[0];

        const messageProducerSpy = jest.spyOn(messageProducer, "send");
        
        //Act
        await aggregate.getPartyByTypeAndIdAndSubIdRequest(partyType, partyId, partySubId);

        //Assert
        expect(messageProducerSpy).toHaveBeenCalledTimes(1);
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

    //Participant
    test("should create a new participant entity", async()=>{
        // Arrange 
        const id="fakeId";
	    const type="fake type";
        const currency= "fake currency";
	    const subId="fake sub id";

        // Act
        const participant = new Participant(id, type, currency, subId);

        // Assert

        expect(participant.id).toBe(id);
        expect(participant.type).toBe(type);
        expect(participant.currency).toBe(currency);
        expect(participant.subId).toBe(subId);
        
    });

    test("should throw error if participant id is not valid", async()=>{
        // Arrange 
        const id="";
	    const type="fake type";
        const currency= "fake currency";
	    const subId="fake sub id";

        // Act
        const participant = new Participant(id, type, currency, subId);


        // Assert
        expect(() => {
            Participant.validateParticipant(participant);
          }).toThrowError(InvalidParticipantIdError);
        
        
    });


    test("should throw error if participant type is not valid", async()=>{
        // Arrange 
        const id="fake id";
	    const type="";
        const currency= "fake currency";
	    const subId="fake sub id";

        // Act
        const participant = new Participant(id, type, currency, subId);


        // Assert

        expect(() => {
            Participant.validateParticipant(participant);
          }).toThrowError(InvalidParticipantTypeError);
        
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
       const participantType = "error";
       const participantId = mockedParticipantIds[0];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getParticipantByTypeAndId(participantType, participantId);
            }
        ).rejects.toThrow(UnableToGetOracleError);
        
    });

    test("should throw error if is unable to find oracle for participantType", async () => {
        //Arrange 
        const participantType = "non-exisiting-oracle-type";
        const participantId = mockedParticipantIds[0];
 
         // Act && Assert
         await expect(
             async () => {
                 await aggregate.getParticipantByTypeAndId(participantType, participantId);
             }
         ).rejects.toThrow(UnableToGetOracleError);
         
     });

     test("should throw error if oracle returned is not present in the oracle providers list", async () => {
        //Arrange 
        const participantType = "not_found_oracle";
        const participantId = mockedParticipantIds[0];
 
         // Act && Assert
         await expect(
             async () => {
                 await aggregate.getParticipantByTypeAndId(participantType, participantId);
             }
         ).rejects.toThrow(UnableToGetOracleProviderError);
         
     });


    test("should get participant by participantType and participantId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[0];
        const participantId = mockedParticipantIds[0];

        //Act
        const participant= await aggregate.getParticipantByTypeAndId(participantType, participantId);

        //Assert
        expect(participant?.id).toBe(mockedParticipantResultIds[0]);
        expect(participant?.subId).toBe(mockedParticipantResultSubIds[0]);

    });

    test("should throw error if it's unable to get participant by fspid", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[2];
        const participantId = mockedParticipantIds[5];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getParticipantByTypeAndId(participantType, participantId);
            }
        ).rejects.toThrow(NoSuchParticipantError);

    });

    test("should throw error if is unable to get participant by participantType and participantId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[2];
        const participantId = mockedParticipantIds[3];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getParticipantByTypeAndId(participantType, participantId);
            }
        ).rejects.toThrow(GetParticipantError);
        
    });


    test("should throw error if fspid not found for participantType and participantId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[1];
        const participantId = "non-existent-participant-id";

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getParticipantByTypeAndId(participantType, participantId);
            }
        ).rejects.toThrow(NoSuchParticipantFspIdError);
        
    });

    
    test("should throw error if no participant found for participantType and participantId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[1];
        const participantId = mockedParticipantIds[1];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getParticipantByTypeAndId(participantType, participantId);
            }
        ).rejects.toThrow(NoSuchParticipantError);
        
    });

    test("should throw error if fspid not found by participantType, participantId and participantSubId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[1];
        const participantId = mockedParticipantIds[1];
        const participantSubId = mockedParticipantSubIds[1];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId);
            }
        ).rejects.toThrow(NoSuchParticipantFspIdError);

    });
    
    test("should get participant by participantType, participantId and participantSubId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[2];
        const participantId = mockedParticipantIds[2];
        const participantSubId = mockedParticipantSubIds[1];

        //Act
        const participant= await aggregate.getParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId);

        //Assert
        expect(participant?.id).toBe(mockedParticipantResultIds[1]);
        expect(participant?.subId).toBe(mockedParticipantResultSubIds[1]);

    });

    test("should throw error if is unable to get participant by participantType, participantId and participantSubId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[2];
        const participantId = mockedParticipantIds[3];
        const participantSubId = mockedParticipantSubIds[0];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId);
            }
        ).rejects.toThrow(GetParticipantError);
        
    });


    test("should throw error if no participant found for participantType, participantId and participantSubId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[1];
        const participantId = mockedParticipantIds[1];
        const participantSubId = mockedParticipantSubIds[0];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId);
            }
        ).rejects.toThrow(NoSuchParticipantError);
        
    });


    test("should associate participant by participantType and participantId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[0];
        const participantId = mockedParticipantIds[0];

        //Act
        const association= await aggregate.associateParticipantByTypeAndId(participantType, participantId);

        //Assert
        expect(association).toBeUndefined();
  
    });

    test("should throw error if is unable to associate participant by participantType and participantId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[2];
        const participantId = mockedParticipantIds[2];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.associateParticipantByTypeAndId(participantType, participantId);
            }
        ).rejects.toThrow(UnableToAssociateParticipantError);
        
    });


    test("should associate participant by participantType, participantId and participantSubId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[1];
        const participantId = mockedParticipantIds[1];
        const participantSubId = mockedParticipantSubIds[0];
        

        //Act
        const association= await aggregate.associateParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId);

        //Assert
        expect(association).toBeUndefined();
  
    });


    test("should throw error if is unable to associate participant by participantType, participantId and participantSubId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[2];
        const participantId = mockedParticipantIds[2];
        const participantSubId = mockedParticipantIds[1];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.associateParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId);
            }
        ).rejects.toThrow(UnableToAssociateParticipantError);
        
    });

    test("should disassociate participant by participantType and participantId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[0];
        const participantId = mockedParticipantIds[0];

        //Act
        const association= await aggregate.disassociateParticipantByTypeAndId(participantType, participantId);

        //Assert
        expect(association).toBeUndefined();
  
    });

    test("should throw error if is unable to disassociate participant by participantType and participantId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[2];
        const participantId = mockedParticipantIds[2];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.disassociateParticipantByTypeAndId(participantType, participantId);
            }
        ).rejects.toThrow(UnableToDisassociateParticipantError);
        
    });

    test("should disassociate participant by participantType, participantId and participantSubId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[1];
        const participantId = mockedParticipantIds[1];
        const participantSubId = mockedParticipantSubIds[0];

        //Act
        const association= await aggregate.disassociateParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId);

        //Assert
        expect(association).toBeUndefined();
  
    });

    test("should throw error if is unable to disassociate participant by participantType, participantId and participantSubId", async () => {
        //Arrange 
        const participantType = mockedParticipantTypes[2];
        const participantId = mockedParticipantIds[2];
        const participantSubId = mockedParticipantSubIds[1];

        // Act && Assert
        await expect(
            async () => {
                await aggregate.disassociateParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId);
            }
        ).rejects.toThrow(UnableToDisassociateParticipantError);
        
    });
});
