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
     AccountLookUpEventsType,
     GetParticipantError,
     GetPartyError,
     IAccountLookUpMessage,
     InvalidParticipantIdError,
     InvalidParticipantTypeError,
     InvalidPartyIdError,
     InvalidPartyTypeError,
     IOracleFinder,
     IOracleProvider,
     IParticipant,
     IParticipantService,
     NoSuchOracleProviderError,
     NoSuchParticipantError,
     NoSuchParticipantFspIdError,
     NoSuchPartyError,
     NoValidParticipantFspIdError,
     RequiredParticipantIsNotActive,
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
import EventEmitter from "events";

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
    oracleProvider.partyType = mockedOracleList[i].type;
    oracleProviderList.push(oracleProvider);
}

const messageProducer: IMessageProducer = new MemoryMessageProducer(
    logger,
);

const participantService: IParticipantService = new MemoryParticipantService(
    logger,
);

const eventEmitter = new EventEmitter();

// Domain.
const aggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    oracleFinder,
    oracleProviderList,
    messageProducer,
    participantService,
    eventEmitter
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

    test("should be able to init aggregate", async () => {
        // Act && Assert
        expect(aggregate.init()).resolves;

        
    });

    test("should throw error if couldnt destroy aggregate", async () => {
        // Arrange
        jest.spyOn(oracleFinder, "destroy").mockImplementationOnce(() => {throw new Error();});

        // Act && Assert

        await expect(aggregate.destroy()).rejects.toThrowError();

        
    });


    test("should be able to destroy aggregate", async () => {
        // Act && Assert
        expect(aggregate.destroy()).resolves;
    });

    // Get Party
    test("should throw error if is unable to find a participant", async () => {
        //Arrange 
        const partyType = "error";
        const partyId = mockedPartyIds[0];
        const sourceFspId = mockedParticipantIds[0]; 

         // Act && Assert
         await expect(
             async () => {
                 await aggregate.getPartyRequest({ sourceFspId, partyType, partyId });
             }
         ).rejects.toThrow(NoSuchParticipantFspIdError);
         
     });

    test("should throw error if is unable to get an oracle", async () => {
       //Arrange 
       const partyType = "error";
       const partyId = mockedPartyIds[0];
       const sourceFspId = mockedParticipantIds[0];

       const participant: IParticipant = {
            id: sourceFspId,
            type: partyType,
            isActive: true,
            subId: null
        }
        
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);

        // Act && Assert
        await expect(
            async () => {
                await aggregate.getPartyRequest({ sourceFspId, partyType, partyId });
            }
        ).rejects.toThrow(UnableToGetOracleError);
        
    });

    test("should throw error if is unable to find participant for partyType", async () => {
        //Arrange 
        const partyType = "non-exisiting-participant-type";
        const partyId = mockedPartyIds[0];
        const sourceFspId = mockedParticipantIds[0];

         // Act && Assert
         await expect(
             async () => {
                 await aggregate.getPartyRequest({ sourceFspId, partyType, partyId });
             }
         ).rejects.toThrow(NoSuchParticipantFspIdError);
         
     });

     test("should throw error if oracle returned is not present in the oracle providers list", async () => {
        //Arrange 
        const partyType = "not_found_oracle";
        const partyId = mockedPartyIds[0];
        const sourceFspId = mockedParticipantIds[0];

        const participant: IParticipant = {
            id: sourceFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(null);

         // Act && Assert
         await expect(
             async () => {
                 await aggregate.getPartyRequest({ sourceFspId, partyType, partyId });
             }
         ).rejects.toThrow(NoSuchOracleProviderError);
         
     });

     test("should throw error if oracle returns an empty list of participants", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const sourceFspId = mockedParticipantIds[0];

        const participant: IParticipant = {
            id: sourceFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);

         // Act && Assert
         await expect(
             async () => {
                 await aggregate.getPartyRequest({ sourceFspId, partyType, partyId });
             }
         ).rejects.toThrow(NoSuchParticipantFspIdError);
         
     });


     test("should throw error if oracle returns an empty list of valid participants", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const sourceFspId = mockedParticipantIds[0];

        const participant: IParticipant = {
            id: sourceFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
        jest.spyOn(oracleProviderList[0], "getParticipants").mockResolvedValueOnce(mockedParticipantIds);

         // Act && Assert
         await expect(
             async () => {
                 await aggregate.getPartyRequest({ sourceFspId, partyType, partyId });
             }
         ).rejects.toThrow(NoValidParticipantFspIdError);
         
     });

     test("should be able to publish as messages all the parties found from the request", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const sourceFspId = mockedParticipantIds[0];

        const participant: IParticipant = {
            id: sourceFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
        jest.spyOn(oracleProviderList[0], "getParticipants").mockResolvedValueOnce([sourceFspId]);
        jest.spyOn(participantService, "getParticipantsInfo").mockResolvedValueOnce([participant, participant]);

        const messageProducerSpy = jest.spyOn(messageProducer, "send");

        //Act
        await aggregate.getPartyRequest({ sourceFspId, partyType, partyId });

        //Assert
        expect(messageProducerSpy).toHaveBeenCalledTimes(2) // the same number as valid participants from getParticipantsInfo mock;
         
     });
     
     test("should be able to publish as messages all the parties found from a response event", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const sourceFspId = mockedParticipantIds[0];
        const destinationFspId = mockedParticipantIds[1];

        const participant: IParticipant = {
            id: sourceFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValue(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
        jest.spyOn(oracleProviderList[0], "getParticipants").mockResolvedValueOnce([sourceFspId]);
        jest.spyOn(participantService, "getParticipantsInfo").mockResolvedValueOnce([participant, participant]);

        const messageProducerSpy = jest.spyOn(messageProducer, "send");

        //Act
        await aggregate.getPartyResponse({ sourceFspId, destinationFspId, partyType, partyId });

        //Assert
        expect(messageProducerSpy).toHaveBeenCalledTimes(1);
         
     });

     // Participant
     test("should create a new participant entity", async()=>{
        // Arrange 
        const id="fakeId";
	    const type="fake type";
        const isActive = true;
        const currency= "fake currency";
	    const subId="fake sub id";

        // Act
        const participant = new Participant(id, type, isActive, currency, subId);

        // Assert

        expect(participant.id).toBe(id);
        expect(participant.type).toBe(type);
        expect(participant.isActive).toBe(isActive);
        expect(participant.subId).toBe(subId);
        
    });

    test("should throw error if participant id is not valid", async()=>{
        // Arrange 
        const id="";
	    const type="fake type";
        const isActive = true;
        const currency= "fake currency";
        const subId="fake sub id";

        // Act
        const participant = new Participant(id, type, isActive, currency, subId);


        // Assert
        expect(() => {
            Participant.validateParticipant(participant);
          }).toThrowError(InvalidParticipantIdError);
        
        
    });


    test("should throw error if participant type is not valid", async()=>{
        // Arrange 
        const id="fake id";
	    const type="";
        const isActive= true;
        const currency= "fake currency";
        const subId="fake sub id";

        // Act
        const participant = new Participant(id, type, isActive, currency, subId);


        // Assert

        expect(() => {
            Participant.validateParticipant(participant);
          }).toThrowError(InvalidParticipantTypeError);
        
    });

    test("should throw error if participant type is not valid", async()=>{
        // Arrange 
        const id="fake id";
	    const type="";
        const isActive= "fake boolean" as unknown as boolean;
        const currency= "fake currency";
        const subId="fake sub id";

        // Act
        const participant = new Participant(id, type, isActive, currency, subId);


        // Assert

        expect(() => {
            Participant.validateParticipant(participant);
          }).toThrowError(InvalidParticipantTypeError);
        
    });

    test("should be able to publish as messages all the valid participants found", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const sourceFspId = mockedParticipantIds[0];

        const participant: IParticipant = {
            id: sourceFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
        jest.spyOn(oracleProviderList[0], "getParticipants").mockResolvedValueOnce([sourceFspId]);
        jest.spyOn(participantService, "getParticipantsInfo").mockResolvedValueOnce([participant, participant]);

        const messageProducerSpy = jest.spyOn(messageProducer, "send");

        //Act
        await aggregate.getParticipant({ sourceFspId, partyType, partyId });

        //Assert
        expect(messageProducerSpy).toHaveBeenCalledTimes(2) // the same number as valid participants from getParticipantsInfo mock;
         
     });

     test("should be able to publish as messages all the valid participants found with a destinationId", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const sourceFspId = mockedParticipantIds[0];
        const destinationFspId = mockedParticipantIds[1];

        const participant: IParticipant = {
            id: sourceFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValue(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
        jest.spyOn(oracleProviderList[0], "getParticipants").mockResolvedValueOnce([sourceFspId]);

        const messageProducerSpy = jest.spyOn(messageProducer, "send");

        //Act
        await aggregate.getParticipant({ sourceFspId, partyType, partyId, destinationFspId });

        //Assert
        expect(messageProducerSpy).toHaveBeenCalledTimes(1) // the same number as valid participants from getParticipantsInfo mock;
         
     });

     // Party Association
     test("should throw an error trying to associate a party", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[2];
        const requesterFspId = mockedParticipantIds[0];

        const participant: IParticipant = {
            id: requesterFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
        jest.spyOn(oracleProviderList[0], "getParticipants").mockResolvedValueOnce([requesterFspId]);
        jest.spyOn(participantService, "getParticipantsInfo").mockResolvedValueOnce([participant, participant]);
        
        // Act && Assert
        await expect(
            async () => {
                await aggregate.associateParty({ requesterFspId, partyType, partyId });
            }
        ).rejects.toThrow(UnableToAssociatePartyError);
         
     });
     
     test("should be able to associate a party", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const participant: IParticipant = {
            id: requesterFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);

        const messageProducerSpy = jest.spyOn(messageProducer, "send");

        //Act
        await aggregate.associateParty({ requesterFspId, partyType, partyId });

        //Assert
        expect(messageProducerSpy).toHaveBeenCalledTimes(1) // the same number as valid participants from getParticipantsInfo mock;
         
     });

     test("should throw an error if a required participant that needs to be valid is invalid", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const participant: IParticipant = {
            id: requesterFspId,
            type: partyType,
            isActive: false,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);

        const messageProducerSpy = jest.spyOn(messageProducer, "send");

        // Act && Assert
        await expect(
            async () => {
                await aggregate.associateParty({ requesterFspId, partyType, partyId });
            }
        ).rejects.toThrow(RequiredParticipantIsNotActive);
         
     });

    // Party Disassociation
     test("should throw an error trying to disassociate a party", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[2];
        const partyId = mockedPartyIds[2];
        const requesterFspId = mockedParticipantIds[0];

        const participant: IParticipant = {
            id: requesterFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
        jest.spyOn(oracleProviderList[0], "getParticipants").mockResolvedValueOnce([requesterFspId]);
        jest.spyOn(participantService, "getParticipantsInfo").mockResolvedValueOnce([participant, participant]);
        
        // Act && Assert
        await expect(
            async () => {
                await aggregate.disassociateParty({ requesterFspId, partyType, partyId });
            }
        ).rejects.toThrow(UnableToDisassociatePartyError);
         
     });

     test("should be able to disassociate a party", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const participant: IParticipant = {
            id: requesterFspId,
            type: partyType,
            isActive: true,
            subId: null
        }

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
        jest.spyOn(oracleProviderList[0], "getParticipants").mockResolvedValueOnce([requesterFspId]);
        jest.spyOn(participantService, "getParticipantsInfo").mockResolvedValueOnce([participant, participant]);

        const messageProducerSpy = jest.spyOn(messageProducer, "send");

        //Act
        await aggregate.disassociateParty({ requesterFspId, partyType, partyId });

        //Assert
        expect(messageProducerSpy).toHaveBeenCalledTimes(1) // the same number as valid participants from getParticipantsInfo mock;
         
     });

    // Event emitter
    test("should log error if getParticipant aggregate method for GetParticipant Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message = {
            key: "account-lookup",
            timestamp: 12,
            topic: "account-lookup",
            headers: [],
        } as unknown as IAccountLookUpMessage;
        
        const errorMessage = "message as an invalid format or value";
        
        jest.spyOn(aggregate, "associateParty").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(aggregate.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`AccountLookUpEventHandler: publishAccountLookUpEvent: message as an invalid format or value`);
    
    });

    test("should log error if getParticipant aggregate method for GetParticipant Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup",
            timestamp: 12,
            topic: "account-lookup",
            headers: [],
            value: {
                payload: fakePayload
            }
        } as unknown as IAccountLookUpMessage;
        const errorMessage = "execution error";
        
        jest.spyOn(aggregate, "associateParty").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(aggregate.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`AccountLookUpEventHandler: publishAccountLookUpEvent: message type undefined is not a valid event type`);
    
    });

    test("should call disassociateParticipantByTypeAndIdAndSubId aggregate method for DisassociateParticipantByTypeAndIdAndSubId Event", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup",
            timestamp: 12,
            topic: "account-lookup",
            headers: [],
            value: {
                type:AccountLookUpEventsType.AssociateParty,
                payload: fakePayload
            }
        };
        
        const eventEmitterSpy = jest.spyOn(eventEmitter, "emit");

        jest.spyOn(aggregate, "associateParty").mockResolvedValueOnce({} as any);
        
        // Act
        aggregate.publishAccountLookUpEvent(message);

        // Assert
       expect(eventEmitterSpy).toBeCalledWith("[Account Lookup] Associate Party", {"participantId": "2", "participantSubId": "3", "participantType": "1"});
        
    });
});
