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
     NoSuchParticipantError,
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
import { AccountLookUperrorEvtPayload, PartyInfoAvailableEvt, PartyInfoAvailableEvtPayload, PartyInfoRequestedEvt, PartyInfoRequestedEvtPayload, PartyQueryReceivedEvt, PartyQueryReceivedEvtPayload, PartyQueryResponseEvtPayload } from "@mojaloop/platform-shared-lib-public-messages-lib";

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

    //#region Party entity
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
    //#endregion

     //#region Participant entity
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

    //#endregion

    //#region Init and Destroy
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

    //#endregion

    //#region PartyQueryReceivedEvent
    test("PartyQueryReceivedEvt - should publish error message if is unable to find participant on oracle", async () => {
        //Arrange
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const partyType = mockedPartyTypes[0];
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType : mockedPartyTypes[0],
            requesterFspId,
            destinationFspId: null,
            currency:null,
            partySubType: null,
        };

        const participant: IParticipant = {
            id: requesterFspId,
            type: partyType,
            isActive: true,
            subId: null
        }
  
        jest.spyOn(messageProducer, "send");        
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(participant);

        const event = new PartyQueryReceivedEvt(payload);

        const errorMsg = NoSuchParticipantFspIdError.name;

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

    test("PartyQueryReceivedEvt - should publish error message if is unable to get an oracle", async () => {
       //Arrange 
       const partyId = mockedPartyIds[0];
       const requesterFspId = mockedParticipantIds[0];
       const partyType = "no oracle";
       const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId:null,
            currency:null,
            partySubType: null,
      };
          
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({id: requesterFspId, type: partyType, isActive: true, subId: null});
        jest.spyOn(messageProducer, "send");

        const event = new PartyQueryReceivedEvt(payload);
     
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

    test("PartyQueryReceivedEvt - should publish error message if is unable to find participant for partyType", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = "no party";
        const requesterFspId = mockedParticipantIds[0];
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId:null,
            currency:null,
            partySubType: null,
      };

     
    jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({isActive:true, subId:null, type:partyType, id:requesterFspId});
    jest.spyOn(messageProducer, "send");

    const event = new PartyQueryReceivedEvt(payload);
   
    const errorMsg = NoSuchParticipantFspIdError.name;

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

     test("PartyQueryReceivedEvt - should publish error message if oracle returned is not present in the oracle providers list", async () => {
        //Arrange 
        const partyType = "not_found_oracle";
        const partyId = mockedPartyIds[0];
        const requesterFspId =mockedParticipantIds[0];
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId:null,
            currency:null,
            partySubType: null,
        };

        
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({id: requesterFspId, type: partyType, isActive: true, subId: null});
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(null);

        const event = new PartyQueryReceivedEvt(payload);
   
        const errorMsg = NoSuchOracleProviderError.name;
    
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

     test("PartyQueryReceivedEvt - should publish error message if oracle returns an empty list of participants", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId:null,
            currency:null,
            partySubType: null,
      };

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({ id: requesterFspId, type: partyType, isActive: true, subId: null});
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);

        const event = new PartyQueryReceivedEvt(payload);
   
        const errorMsg = NoSuchParticipantFspIdError.name;
    
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

   
     test("PartyQueryReceivedEvt - should publish reponse with PartyInfoRequestedEvt", async () => {
        //Arrange 
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId:null,
            currency:null,
            partySubType: null,
      };

        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValue({ id: "1",type: partyType, isActive: true, subId: null});
        jest.spyOn(oracleFinder, "getOracleProvider").mockResolvedValueOnce(oracleProviderList[0]);
        jest.spyOn(oracleProviderList[0], "getParticipant").mockResolvedValueOnce(requesterFspId);

        const event = new PartyQueryReceivedEvt(payload);
        const responsePayload : PartyInfoRequestedEvtPayload= {
            partyId,
            partyType,
            requesterFspId,
            destinationFspId: "1",
            currency: null,
            partySubType: null
        };
    
        // Act
        const result = await aggregate.publishAccountLookUpEvent(event);
    
        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": responsePayload, 
        }));         
         
    });

    //#endregion

    //#region PartyInfoAvailableEvt
    test("PartyInfoAvailableEvt - should publish error message if information from source is invalid", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = "no party";
        const requesterFspId = mockedParticipantIds[0];
        const payload :PartyInfoAvailableEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId:null,
            currency:null,
            partySubType: null,
            ownerFspId: "ownerId",
            partyDoB:new Date(),
            partyName:"name",
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce(null);
        jest.spyOn(messageProducer, "send");

        const event = new PartyInfoAvailableEvt(payload);
        
        const errorMsg = NoSuchParticipantError.name;
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

        test("PartyInfoAvailableEvt - should publish error message if information from destination is invalid", async () => {
            //Arrange
            const partyType = mockedPartyTypes[0];
            const partyId = "no party";
            const requesterFspId = mockedParticipantIds[0];
            const payload :PartyInfoAvailableEvtPayload = {
                partyId,
                partyType,
                requesterFspId ,
                destinationFspId:"2",
                currency:null,
                partySubType: null,
                ownerFspId: "ownerId",
                partyDoB:new Date(),
                partyName:"name",
            };
    
            jest.spyOn(participantService, "getParticipantInfo")
                .mockResolvedValueOnce({id: requesterFspId, type: partyType, isActive: true, subId: null})
                .mockResolvedValueOnce(null);
            jest.spyOn(messageProducer, "send");
    
            const event = new PartyInfoAvailableEvt(payload);
            
            const errorMsg = NoSuchParticipantError.name;
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

        test("PartyInfoAvailableEvt - should publish event with party info requested", async () => {
            //Arrange
            const partyType = mockedPartyTypes[0];
            const partyId = mockedPartyIds[0];
            const requesterFspId = mockedParticipantIds[0];
            const partyDoB = new Date();
            const payload :PartyInfoAvailableEvtPayload = {
                partyId,
                partyType,
                requesterFspId ,
                destinationFspId:"2",
                currency:null,
                partySubType: null,
                ownerFspId: "ownerId",
                partyDoB,
                partyName:"name",
            };

            jest.spyOn(participantService, "getParticipantInfo")
                .mockResolvedValueOnce({id: requesterFspId, type: partyType, isActive: true, subId: null})
                .mockResolvedValueOnce({id: "2", type: partyType, isActive: true, subId: null});
            jest.spyOn(messageProducer, "send");

            const event = new PartyInfoAvailableEvt(payload);
            const responsePayload : PartyQueryResponseEvtPayload= {
                requesterFspId,
                destinationFspId: "2",
                partyType,
                partyId,
                partySubType: null,
                currency: null,
                ownerFspId: "ownerId",
                partyDoB,
                partyName:"name",
            };

            // Act
            const result = await aggregate.publishAccountLookUpEvent(event);

            // Assert

            expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
                "payload": responsePayload,
            }));
        });

    //#endregion

    //#region ParticipantQueryReceivedEvt
    

    //#region PartyInfoRequestedEvt
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



     //#endregion

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

});
