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
     InvalidParticipantIdError,
     InvalidParticipantTypeError,
     InvalidPartyIdError,
     InvalidPartyTypeError,
     IOracleFinder,
     IOracleProvider,
     IParticipant,
     IParticipantService,
     NoSuchOracleProviderError,
     NoSuchParticipantFspIdError,
     RequiredParticipantIsNotActive,
     UnableToAssociatePartyError,
     UnableToDisassociatePartyError,
     UnableToGetOracleError,
 } from "../../src";
import { MemoryOracleFinder } from "./mocks/memory_oracle_finder";
import { MemoryMessageProducer } from "./mocks/memory_message_producer";
import { mockedOracleList, mockedParticipantIds, mockedPartyIds, mockedPartyTypes } from "./mocks/data";
import { MemoryOracleProvider } from "./mocks/memory_oracle_providers";
import { MemoryParticipantService } from "./mocks/memory_participant_service";
import { AccountLookUperrorEvtPayload, PartyInfoRequestedEvt, PartyInfoRequestedEvtPayload } from "@mojaloop/platform-shared-lib-public-messages-lib";

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


// Domain.
const aggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    oracleFinder,
    oracleProviderList,
    messageProducer,
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

    test("getParty - should throw error if is unable to find participant", async () => {
        //Arrange
        const payload :PartyInfoRequestedEvtPayload = {
            partyId : mockedPartyIds[0],
            partyType : "error",
            requesterFspId : mockedParticipantIds[0],
            destinationFspId:null,
            currency:null,
            partySubType: null,
        };
        const event = new PartyInfoRequestedEvt(payload);
       
         // Act && Assert
         await expect(
             async () => {
                 await aggregate.publishAccountLookUpEvent(event);
             }
         ).rejects.toThrow(NoSuchParticipantFspIdError);
         
     });

    test("getParty - should publish error message if is unable to get an oracle", async () => {
       //Arrange 
       const partyId = mockedPartyIds[0];
       const requesterFspId = mockedParticipantIds[0];
       const partyType = "error";
       const payload :PartyInfoRequestedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId:null,
            currency:null,
            partySubType: null,
      };
       
       const participant: IParticipant = {
            id: requesterFspId,
            type: partyType,
            isActive: true,
            subId: null
        }
        
        const event = new PartyInfoRequestedEvt(payload);
        
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
        jest.spyOn(messageProducer, "send");

        const errorMsg = UnableToGetOracleError.name;

        const errorPayload: AccountLookUperrorEvtPayload = {
			errorMsg,
			partyId,
            sourceEvent : event.msgName
		};

        // Act
        await aggregate.publishAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload, 
           }));
        
    });

    // test("getParty - should throw error if is unable to find participant for partyType", async () => {
    //     //Arrange 
    //     const partyType = "non-exisiting-participant-type";
    //     const partyId = mockedPartyIds[0];
    //     const requesterFspId = mockedParticipantIds[0];
    //     const payload :PartyInfoRequestedEvtPayload = {
    //         partyId,
    //         partyType,
    //         requesterFspId ,
    //         destinationFspId:null,
    //         currency:null,
    //         partySubType: null,
    //   };

    //      // Act && Assert
    //      await expect(
    //          async () => {
    //              await aggregate.getParty(payload);
    //          }
    //      ).rejects.toThrow(NoSuchParticipantFspIdError);
         
    //  });

    //  test("getParty - should throw error if oracle returned is not present in the oracle providers list", async () => {
    //     //Arrange 
    //     const partyType = "not_found_oracle";
    //     const partyId = mockedPartyIds[0];
    //     const requesterFspId =mockedParticipantIds[0];
    //     const payload :PartyInfoRequestedEvtPayload = {
    //         partyId,
    //         partyType,
    //         requesterFspId ,
    //         destinationFspId:null,
    //         currency:null,
    //         partySubType: null,
    //   };

    //     const participant: IParticipant = {
    //         id: requesterFspId,
    //         type: partyType,
    //         isActive: true,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(null);

    //      // Act && Assert
    //      await expect(
    //          async () => {
    //              await aggregate.getParty(payload);
    //          }
    //      ).rejects.toThrow(NoSuchOracleProviderError);
         
    //  });

    //  test("getParty - should throw error if oracle returns an empty list of participants", async () => {
    //     //Arrange 
    //     const partyType = mockedPartyTypes[0];
    //     const partyId = mockedPartyIds[0];
    //     const requesterFspId = mockedParticipantIds[0];
    //     const payload :PartyInfoRequestedEvtPayload = {
    //         partyId,
    //         partyType,
    //         requesterFspId ,
    //         destinationFspId:null,
    //         currency:null,
    //         partySubType: null,
    //   };

    //     const participant: IParticipant = {
    //         id: requesterFspId,
    //         type: partyType,
    //         isActive: true,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);

    //      // Act && Assert
    //      await expect(
    //          async () => {
    //              await aggregate.getParty(payload);
    //          }
    //      ).rejects.toThrow(NoSuchParticipantFspIdError);
         
    //  });

    //  test("getParty - should throw error if oracle fails to return a participant", async () => {
    //     //Arrange 
    //     const partyType = mockedPartyTypes[0];
    //     const partyId = mockedPartyIds[0];
    //     const requesterFspId = mockedParticipantIds[0];
    //     const payload :PartyInfoRequestedEvtPayload = {
    //         partyId,
    //         partyType,
    //         requesterFspId ,
    //         destinationFspId:null,
    //         currency:null,
    //         partySubType: null,
    //   };

    //     const participant: IParticipant = {
    //         id: requesterFspId,
    //         type: partyType,
    //         isActive: true,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
    //     jest.spyOn(oracleProviderList[0], "getParticipant").mockResolvedValueOnce(null);

    //      // Act && Assert
    //      await expect(
    //          async () => {
    //              await aggregate.getParty(payload);
    //          }
    //      ).rejects.toThrow(NoSuchParticipantFspIdError);
         
    //  });

    //  test("getParty - should return PartyInfoRequestedEvt", async () => {
    //     //Arrange 
    //     const partyType = mockedPartyTypes[0];
    //     const partyId = mockedPartyIds[0];
    //     const requesterFspId = mockedParticipantIds[0];
    //     const payload :PartyInfoRequestedEvtPayload = {
    //         partyId,
    //         partyType,
    //         requesterFspId ,
    //         destinationFspId:null,
    //         currency:null,
    //         partySubType: null,
    //   };

    //     const participant: IParticipant = {
    //         id: requesterFspId,
    //         type: partyType,
    //         isActive: true,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
    //     jest.spyOn(oracleProviderList[0], "getParticipant").mockResolvedValueOnce(requesterFspId);
    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);

    //     //Act
    //     const result = await aggregate.getParty(payload);

    //     //Assert
    //     expect(result).toBeInstanceOf(PartyInfoRequestedEvt);
    //     expect(result.payload).toMatchObject({
    //         partyId,
    //     });
         
    //  });

    //  // Participant
    //  test("should create a new participant entity", async()=>{
    //     // Arrange 
    //     const id="fakeId";
	//     const type="fake type";
    //     const isActive = true;
    //     const currency= "fake currency";
	//     const subId="fake sub id";

    //     // Act
    //     const participant = new Participant(id, type, isActive, currency, subId);

    //     // Assert

    //     expect(participant.id).toBe(id);
    //     expect(participant.type).toBe(type);
    //     expect(participant.isActive).toBe(isActive);
    //     expect(participant.subId).toBe(subId);
        
    // });

    // test("should throw error if participant id is not valid", async()=>{
    //     // Arrange 
    //     const id="";
	//     const type="fake type";
    //     const isActive = true;
    //     const currency= "fake currency";
    //     const subId="fake sub id";

    //     // Act
    //     const participant = new Participant(id, type, isActive, currency, subId);


    //     // Assert
    //     expect(() => {
    //         Participant.validateParticipant(participant);
    //       }).toThrowError(InvalidParticipantIdError);
        
        
    // });


    // test("should throw error if participant type is not valid", async()=>{
    //     // Arrange 
    //     const id="fake id";
	//     const type="";
    //     const isActive= true;
    //     const currency= "fake currency";
    //     const subId="fake sub id";

    //     // Act
    //     const participant = new Participant(id, type, isActive, currency, subId);


    //     // Assert

    //     expect(() => {
    //         Participant.validateParticipant(participant);
    //       }).toThrowError(InvalidParticipantTypeError);
        
    // });

    // test("should throw error if participant type is not valid", async()=>{
    //     // Arrange 
    //     const id="fake id";
	//     const type="";
    //     const isActive= "fake boolean" as unknown as boolean;
    //     const currency= "fake currency";
    //     const subId="fake sub id";

    //     // Act
    //     const participant = new Participant(id, type, isActive, currency, subId);


    //     // Assert

    //     expect(() => {
    //         Participant.validateParticipant(participant);
    //       }).toThrowError(InvalidParticipantTypeError);
        
    // });

    // test("should be able to publish as messages all the valid participants found", async () => {
    //     //Arrange 
    //     const partyType = mockedPartyTypes[0];
    //     const partyId = mockedPartyIds[0];
    //     const sourceFspId = mockedParticipantIds[0];

    //     const participant: IParticipant = {
    //         id: sourceFspId,
    //         type: partyType,
    //         isActive: true,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
    //     jest.spyOn(oracleProviderList[0], "getParticipant").mockResolvedValueOnce(sourceFspId);
    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);

    //     const messageProducerSpy = jest.spyOn(messageProducer, "send");

    //     //Act
    //     await aggregate.getParticipant({ sourceFspId, partyType, partyId });

    //     //Assert
    //     expect(messageProducerSpy).toHaveBeenCalledTimes(1);
         
    //  });

    //  test("should be able to publish as message all the valid participants found with a destinationId", async () => {
    //     //Arrange 
    //     const partyType = mockedPartyTypes[0];
    //     const partyId = mockedPartyIds[0];
    //     const sourceFspId = mockedParticipantIds[0];
    //     const destinationFspId = mockedParticipantIds[1];

    //     const participant: IParticipant = {
    //         id: sourceFspId,
    //         type: partyType,
    //         isActive: true,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValue(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
    //     jest.spyOn(oracleProviderList[0], "getParticipant").mockResolvedValueOnce(sourceFspId);

    //     const messageProducerSpy = jest.spyOn(messageProducer, "send");

    //     //Act
    //     await aggregate.getParticipant({ sourceFspId, partyType, partyId, destinationFspId });

    //     //Assert
    //     expect(messageProducerSpy).toHaveBeenCalledTimes(1);
         
    //  });

    //  // Party Association
    //  test("should throw an error trying to associate a party", async () => {
    //     //Arrange 
    //     const partyType = mockedPartyTypes[2];
    //     const partyId = mockedPartyIds[2];
    //     const requesterFspId = mockedParticipantIds[0];

    //     const participant: IParticipant = {
    //         id: requesterFspId,
    //         type: partyType,
    //         isActive: true,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
    //     jest.spyOn(oracleProviderList[0], "getParticipant").mockResolvedValueOnce(requesterFspId);
    //     jest.spyOn(participantService, "getParticipantsInfo").mockResolvedValueOnce([participant, participant]);
        
    //     // Act && Assert
    //     await expect(
    //         async () => {
    //             await aggregate.associateParty({ requesterFspId, partyType, partyId });
    //         }
    //     ).rejects.toThrow(UnableToAssociatePartyError);
         
    //  });
     
    //  test("should be able to associate a party", async () => {
    //     //Arrange 
    //     const partyType = mockedPartyTypes[0];
    //     const partyId = mockedPartyIds[0];
    //     const requesterFspId = mockedParticipantIds[0];

    //     const participant: IParticipant = {
    //         id: requesterFspId,
    //         type: partyType,
    //         isActive: true,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);

    //     const messageProducerSpy = jest.spyOn(messageProducer, "send");

    //     //Act
    //     await aggregate.associateParty({ requesterFspId, partyType, partyId });

    //     //Assert
    //     expect(messageProducerSpy).toHaveBeenCalledTimes(1);
         
    //  });

    //  test("should throw an error if a required participant that needs to be valid is invalid", async () => {
    //     //Arrange 
    //     const partyType = mockedPartyTypes[0];
    //     const partyId = mockedPartyIds[0];
    //     const requesterFspId = mockedParticipantIds[0];

    //     const participant: IParticipant = {
    //         id: requesterFspId,
    //         type: partyType,
    //         isActive: false,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);

    //     // Act && Assert
    //     await expect(
    //         async () => {
    //             await aggregate.associateParty({ requesterFspId, partyType, partyId });
    //         }
    //     ).rejects.toThrow(RequiredParticipantIsNotActive);
         
    //  });

    // // Party Disassociation
    //  test("should throw an error trying to disassociate a party", async () => {
    //     //Arrange 
    //     const partyType = mockedPartyTypes[2];
    //     const partyId = mockedPartyIds[2];
    //     const requesterFspId = mockedParticipantIds[0];

    //     const participant: IParticipant = {
    //         id: requesterFspId,
    //         type: partyType,
    //         isActive: true,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
    //     jest.spyOn(oracleProviderList[0], "getParticipant").mockResolvedValueOnce(requesterFspId);
    //     jest.spyOn(participantService, "getParticipantsInfo").mockResolvedValueOnce([participant, participant]);
        
    //     // Act && Assert
    //     await expect(
    //         async () => {
    //             await aggregate.disassociateParty({ requesterFspId, partyType, partyId });
    //         }
    //     ).rejects.toThrow(UnableToDisassociatePartyError);
         
    //  });

    //  test("should be able to disassociate a party", async () => {
    //     //Arrange 
    //     const partyType = mockedPartyTypes[0];
    //     const partyId = mockedPartyIds[0];
    //     const requesterFspId = mockedParticipantIds[0];

    //     const participant: IParticipant = {
    //         id: requesterFspId,
    //         type: partyType,
    //         isActive: true,
    //         subId: null
    //     }

    //     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);
    //     jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
    //     jest.spyOn(oracleProviderList[0], "getParticipant").mockResolvedValueOnce(requesterFspId);
    //     jest.spyOn(participantService, "getParticipantsInfo").mockResolvedValueOnce([participant, participant]);

    //     const messageProducerSpy = jest.spyOn(messageProducer, "send");

    //     //Act
    //     await aggregate.disassociateParty({ requesterFspId, partyType, partyId });

    //     //Assert
    //     expect(messageProducerSpy).toHaveBeenCalledTimes(1);
         
    //  });

    // // Event emitter
    // test("should log error if getParticipant aggregate method for GetParticipant Event throws error", async()=>{
    //     // Arrange
    //     const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
    //     const message = {
    //         key: "account-lookup",
    //         timestamp: 12,
    //         topic: "account-lookup",
    //         headers: [],
    //     } as unknown as IAccountLookUpMessage;
        
    //     const errorMessage = "message as an invalid format or value";
        
    //     jest.spyOn(aggregate, "associateParty").mockRejectedValueOnce(errorMessage);
    //     jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
    //     // Act
    //     await Promise.resolve(aggregate.publishAccountLookUpEvent(message));

    //     // Assert
    //     expect(logger.error).toBeCalledWith(`AccountLookUpEventHandler: publishAccountLookUpEvent: message as an invalid format or value`);
    
    // });

    // test("should log error if getParticipant aggregate method for GetParticipant Event throws error", async()=>{
    //     // Arrange
    //     const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
    //     const message:IAccountLookUpMessage = {
    //         key: "account-lookup",
    //         timestamp: 12,
    //         topic: "account-lookup",
    //         headers: [],
    //         value: {
    //             payload: fakePayload
    //         }
    //     } as unknown as IAccountLookUpMessage;
    //     const errorMessage = "execution error";
        
    //     jest.spyOn(aggregate, "associateParty").mockRejectedValueOnce(errorMessage);
    //     jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
    //     // Act
    //     await Promise.resolve(aggregate.publishAccountLookUpEvent(message));

    //     // Assert
    //     expect(logger.error).toBeCalledWith(`AccountLookUpEventHandler: publishAccountLookUpEvent: message type undefined is not a valid event type`);
    
    // });

    // test("should call getParty aggregate method for GetParty Event", async()=>{
    //     // Arrange
    //     const fakePayload = {                  
    //         sourceFspId: "sourceFspId1", 
    //         partyType: "partyType1", 
    //         partyId: "partyId1", 
    //         partySubType: "partySubType1", 
    //         currency: "currency1",
    //         destinationFspId: "destinationFspId1" 
    //     };
    //     const message:IAccountLookUpMessage = {
    //         key: "account-lookup",
    //         timestamp: 12,
    //         topic: "account-lookup",
    //         headers: [],
    //         value: {
    //             type:AccountLookUpEventsType.GetParty,
    //             payload: fakePayload
    //         }
    //     };
        
    //     const aggregateSpy = jest.spyOn(aggregate, "getPartyRequest");

    //     jest.spyOn(aggregate, "getPartyRequest").mockResolvedValueOnce({} as any);
        
    //     // Act
    //     aggregate.publishAccountLookUpEvent(message);

    //     // Assert
    //    expect(aggregateSpy).toBeCalledWith(fakePayload);
        
    // });
    
    // test("should call getParticipant aggregate method for GetParticipant Event", async()=>{
    //     // Arrange
    //     const fakePayload = {                  
    //         sourceFspId: "sourceFspId1", 
    //         partyType: "partyType1", 
    //         partyId: "partyId1", 
    //         partySubType: "partySubType1", 
    //         currency: "currency1",
    //         destinationFspId: "destinationFspId1" 
    //     };
    //     const message:IAccountLookUpMessage = {
    //         key: "account-lookup",
    //         timestamp: 12,
    //         topic: "account-lookup",
    //         headers: [],
    //         value: {
    //             type:AccountLookUpEventsType.GetParticipant,
    //             payload: fakePayload
    //         }
    //     };
        
    //     const aggregateSpy = jest.spyOn(aggregate, "getParticipant");

    //     jest.spyOn(aggregate, "getParticipant").mockResolvedValueOnce({} as any);
        
    //     // Act
    //     aggregate.publishAccountLookUpEvent(message);

    //     // Assert
    //    expect(aggregateSpy).toBeCalledWith(fakePayload);
        
    // });

    // test("should call associateParty aggregate method for AssociateParty Event", async()=>{
    //     // Arrange
    //     const fakePayload = { requesterFspId:"fspIdRequester", partyType: "partyType1", partyId: "partyId1", partySubType:"partySubType1" };
    //     const message:IAccountLookUpMessage = {
    //         key: "account-lookup",
    //         timestamp: 12,
    //         topic: "account-lookup",
    //         headers: [],
    //         value: {
    //             type:AccountLookUpEventsType.AssociateParty,
    //             payload: fakePayload
    //         }
    //     };
        
    //     const aggregateSpy = jest.spyOn(aggregate, "associateParty");

    //     jest.spyOn(aggregate, "associateParty").mockResolvedValueOnce({} as any);
        
    //     // Act
    //     aggregate.publishAccountLookUpEvent(message);

    //     // Assert
    //    expect(aggregateSpy).toBeCalledWith(fakePayload);
        
    // });

    // test("should call disassociateParty aggregate method for DisassociateParty Event", async()=>{
    //     // Arrange
    //     const fakePayload = { requesterFspId:"fspIdRequester", partyType: "partyType1", partyId: "partyId1", partySubType:"partySubType1" };
    //     const message:IAccountLookUpMessage = {
    //         key: "account-lookup",
    //         timestamp: 12,
    //         topic: "account-lookup",
    //         headers: [],
    //         value: {
    //             type:AccountLookUpEventsType.DisassociateParty,
    //             payload: fakePayload
    //         }
    //     };
        
    //     const aggregateSpy = jest.spyOn(aggregate, "disassociateParty");

    //     jest.spyOn(aggregate, "disassociateParty").mockResolvedValueOnce({} as any);
        
    //     // Act
    //     aggregate.publishAccountLookUpEvent(message);

    //     // Assert
    //    expect(aggregateSpy).toBeCalledWith(fakePayload);
        
    // });

    // test("should not call any event on an non-existing event type", async()=>{
    //     // Arrange
    //     const fakePayload = { requesterFspId:"fspIdRequester", partyType: "partyType1", partyId: "partyId1", partySubType:"partySubType1" };
    //     const message:IAccountLookUpMessage = {
    //         key: "account-lookup",
    //         timestamp: 12,
    //         topic: "account-lookup",
    //         headers: [],
    //         value: {
    //             type:"" as AccountLookUpEventsType,
    //             payload: fakePayload
    //         }
    //     };
        
    //     const loggerSpy = jest.spyOn(logger, "error");
       
    //     // Act
    //     aggregate.publishAccountLookUpEvent(message);

    //     // Assert
    //    expect(loggerSpy).toBeCalledWith("AccountLookUpEventHandler: publishAccountLookUpEvent: message type  is not a valid event type");
        
    // });
    
    // test("should log error if message is on a invalid format", async()=>{
    //         // Arrange
    //         const invalidMessage:any = {
    //             type: "invalid",
    //         };
    //         jest.spyOn(logger, "error").mockImplementationOnce(() => { });
            
    //         // Act
    //         aggregate.publishAccountLookUpEvent(invalidMessage);
    
    //         // Assert
    //         expect(logger.error).toBeCalledWith(`AccountLookUpEventHandler: publishAccountLookUpEvent: message as an invalid format or value`);
            
    //     });
    
    //     test("should log error if message has invalid type", async()=>{
    //         // Arrange
    //         const invalidMessage:any = {
    //             value: {
    //                 type:"invalid type",
    //                 payload: {"test":"test"}
    //             }
    //         };
    //         jest.spyOn(logger, "error").mockImplementationOnce(() => { });
            
    //         // Act
    //         aggregate.publishAccountLookUpEvent(invalidMessage);
    
    //         // Assert
    //         expect(logger.error).toBeCalledWith(`AccountLookUpEventHandler: publishAccountLookUpEvent: message type ${invalidMessage.value.type} is not a valid event type`);
            
    //     });
    
    //     // // Participant
    //     test("should call getParticipant aggregate method for GetParticipant Event", async()=>{
    //         // Arrange
    //         const fakePayload = {                  
    //             sourceFspId: "sourceFspId1", 
    //             partyType: "partyType1", 
    //             partyId: "partyId1", 
    //             partySubType: "partySubType1", 
    //             currency: "currency1",
    //             destinationFspId: "destinationFspId1" 
    //         };
    //         const message:IAccountLookUpMessage = {
    //             key: "account-lookup",
    //             timestamp: 12,
    //             topic: "account-lookup",
    //             headers: [],
    //             value: {
    //                 type:AccountLookUpEventsType.GetParticipant,
    //                 payload: fakePayload
    //             }
    //         };
            
    //         jest.spyOn(aggregate, "getParticipant").mockResolvedValueOnce({} as any);
            
    //         // Act
    //         aggregate.publishAccountLookUpEvent(message);
    
    //         // Assert
    //        expect(aggregate.getParticipant).toBeCalledWith(fakePayload);
            
    //     });
    
    //     test("should call getParty aggregate method for GetParty Event", async()=>{
    //         // Arrange
    //         const fakePayload = {                  
    //             sourceFspId: "sourceFspId1", 
    //             partyType: "partyType1", 
    //             partyId: "partyId1", 
    //             partySubType: "partySubType1", 
    //             currency: "currency1",
    //             destinationFspId: "destinationFspId1" 
    //         };
    //         const message:IAccountLookUpMessage = {
    //             key: "account-lookup",
    //             timestamp: 12,
    //             topic: "account-lookup",
    //             headers: [],
    //             value: {
    //                 type:AccountLookUpEventsType.GetParty,
    //                 payload: fakePayload
    //             }
    //         };
            
    //         jest.spyOn(aggregate, "getPartyRequest").mockResolvedValueOnce({} as any);
            
    //         // Act
    //         aggregate.publishAccountLookUpEvent(message);
    
    //         // Assert
    //        expect(aggregate.getPartyRequest).toBeCalledWith(fakePayload);
            
    //     });
    
    //     test("should call associateParty aggregate method for AssociateParty Event", async()=>{
    //         // Arrange
    //         const fakePayload = { requesterFspId:"fspIdRequester", partyType: "partyType1", partyId: "partyId1", partySubType:"partySubType1" };
    //         const message:IAccountLookUpMessage = {
    //             key: "account-lookup",
    //             timestamp: 12,
    //             topic: "account-lookup",
    //             headers: [],
    //             value: {
    //                 type:AccountLookUpEventsType.AssociateParty,
    //                 payload: fakePayload
    //             }
    //         };
            
    //         jest.spyOn(aggregate, "associateParty").mockResolvedValueOnce({} as any);
            
    //         // Act
    //         aggregate.publishAccountLookUpEvent(message);
    
    //         // Assert
    //        expect(aggregate.associateParty).toBeCalledWith(fakePayload);
            
    //     });
    
    //     test("should call disassociateParty aggregate method for DisassociateParty Event", async()=>{
    //         // Arrange
    //         const fakePayload = { requesterFspId:"fspIdRequester", partyType: "partyType1", partyId: "partyId1", partySubType:"partySubType1" };
    //         const message:IAccountLookUpMessage = {
    //             key: "account-lookup",
    //             timestamp: 12,
    //             topic: "account-lookup",
    //             headers: [],
    //             value: {
    //                 type:AccountLookUpEventsType.DisassociateParty,
    //                 payload: fakePayload
    //             }
    //         };
            
    //         jest.spyOn(aggregate, "disassociateParty").mockResolvedValueOnce({} as any);
            
    //         // Act
    //         aggregate.publishAccountLookUpEvent(message);
    
    //         // Assert
    //        expect(aggregate.disassociateParty).toBeCalledWith(fakePayload);
            
    //     });

});
