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
import { IMessage, IMessageProducer, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {Party} from "../../src/entities/party";
import {
     AccountLookupAggregate,
     InvalidMessagePayloadError,
     InvalidMessageTypeError,
     InvalidParticipantIdError,
     InvalidPartyIdError,
     InvalidPartyTypeError,
     IOracleFinder,
     IParticipantService,
     NoSuchOracleAdapterError,
     NoSuchOracleError,
     NoSuchParticipantError,
     NoSuchParticipantFspIdError,
     Oracle,
     RequiredParticipantIsNotActive,
     UnableToAssociateParticipantError,
     UnableToDisassociateParticipantError,
 } from "../../src";
import { MemoryOracleFinder,MemoryMessageProducer,MemoryOracleProviderFactory, MemoryParticipantService, MemoryOracleProviderAdapter } from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { getParticipantFspIdForOracleTypeAndSubType as getParticipantFspIdForOracleTypeAndSubType, mockedOracleAdapters, mockedParticipantFspIds, mockedParticipantIds, mockedPartyIds, mockedPartySubTypes, mockedPartyTypes } from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { AccountLookUpErrorEvtPayload, ParticipantAssociationCreatedEvtPayload, ParticipantAssociationRemovedEvtPayload, ParticipantAssociationRequestReceivedEvt, ParticipantAssociationRequestReceivedEvtPayload, ParticipantDisassociateRequestReceivedEvt, ParticipantDisassociateRequestReceivedEvtPayload, ParticipantQueryReceivedEvt, ParticipantQueryReceivedEvtPayload, ParticipantQueryResponseEvtPayload, PartyInfoAvailableEvt, PartyInfoAvailableEvtPayload, PartyInfoRequestedEvt, PartyInfoRequestedEvtPayload, PartyQueryReceivedEvt, PartyQueryReceivedEvtPayload, PartyQueryResponseEvtPayload } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const oracleFinder: IOracleFinder = new MemoryOracleFinder(
    logger,
);

const oracleProviderFactory = new MemoryOracleProviderFactory(logger);

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
    oracleProviderFactory,
    messageProducer,
    participantService
);

describe("Domain - Unit Tests for event handler and entities", () => {

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
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


    //#region Init and Destroy
    test("should throw error if couldnt init oracle finder on init", async () => {
        // Arrange
        jest.spyOn(oracleFinder, "init").mockImplementation(() => {throw new Error();});

        // Act && Assert

        await expect(aggregate.init()).rejects.toThrowError();


    });

    test("should throw error if couldnt create oracle adapter on init", async () => {
        // Arrange
        jest.spyOn(oracleProviderFactory, "create").mockImplementationOnce(() => {throw new Error('Not supported oracle');});

        // Act && Assert

        await expect(aggregate.init()).rejects.toThrowError();


    });

    test("should be able to init aggregate", async () => {
        // Act && Assert
        expect(aggregate.init()).resolves;

    });

    test("should be able to get oracle adapters", async () => {
        // Arrange
        const expectedArrayLength = mockedOracleAdapters.length;

        // Act
        const oracleAdapters = aggregate.oracleProvidersAdapters;

        // Assert
        expect(oracleAdapters).toBeDefined();
        expect(oracleAdapters.length).toBe(expectedArrayLength);

    });

    test("shouldnt be able to get change original oracle adapter array", async () => {
        // Arrange
        const expectedArrayLength = mockedOracleAdapters.length;
        const mockedOracle: Oracle = {
            id: "mockedOracle",
            partySubType: "mockedPartySubType",
            partyType: "mockedPartyType",
            name: "mockedOracle",
            endpoint: null,
            type: "builtin"
        }
        const oracleAdapters = aggregate.oracleProvidersAdapters;
        oracleAdapters.push(new MemoryOracleProviderAdapter(logger, mockedOracle));

        // Act
        const oracleAdaptersAfterPush = aggregate.oracleProvidersAdapters;

        // Assert
        expect(oracleAdaptersAfterPush.length).toBe(expectedArrayLength);

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

    //#region Publish Event
    test("should publish error message if payload is invalid", async () => {
        // Arrange
        const message: IMessage = {
            fspiopOpaqueState: "fake opaque state",
            msgId: "fake msg id",
            msgKey: "fake msg key",
            msgTopic: "fake msg topic",
            msgName: "fake msg name",
            msgOffset: 0,
            msgPartition: 0,
            msgTimestamp: 0,
            msgType: MessageTypes.DOMAIN_EVENT,
            payload: null,
        };

        const errorMsg = InvalidMessagePayloadError.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
			errorMsg,
			partyId: null as unknown as string,
            sourceEvent: "fake msg name",
            partySubType:  null,
            partyType:  null,
            requesterFspId:  null,
		};

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("should publish error message if message Name is invalid", async () => {
        // Arrange
        const payload:PartyQueryReceivedEvtPayload = {
            partyId:"1",
            partyType:"type",
            requesterFspId:"2" ,
            destinationFspId:null,
            currency: null,
            partySubType: null,
        }

        const message: IMessage = {
            fspiopOpaqueState: "fake opaque state",
            msgId: "fake msg id",
            msgKey: "fake msg key",
            msgTopic: "fake msg topic",
            msgName: "fake msg name",
            msgOffset: 0,
            msgPartition: 0,
            msgTimestamp: 0,
            msgType: MessageTypes.DOMAIN_EVENT,
            payload: payload
        };

        const errorMsg = InvalidMessageTypeError.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
			errorMsg,
			partyId:"1",
            sourceEvent: "fake msg name",
            partySubType: null,
            partyType: "type",
            requesterFspId: "2"
		};

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload
        }));

    });


    test("should publish error message if message Type is invalid", async () => {
        // Arrange
        const payload:PartyQueryReceivedEvtPayload = {
            partyId: "1",
            partyType: "type",
            requesterFspId: "2" ,
            destinationFspId: null,
            currency: null,
            partySubType: null,
        }

        const message: IMessage = {
            fspiopOpaqueState: "fake opaque state",
            msgId: "fake msg id",
            msgKey: "fake msg key",
            msgTopic: "fake msg topic",
            msgName: "fake msg name",
            msgOffset: 0,
            msgPartition: 0,
            msgTimestamp: 0,
            msgType: "invalid message type" as unknown as MessageTypes.DOMAIN_EVENT,
            payload :payload,
        };

        const errorMsg = InvalidMessageTypeError.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
			errorMsg,
			partyId: "1",
            sourceEvent: "fake msg name",
            partyType: "type",
            partySubType: null,
            requesterFspId: "2",
		};

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });


    test("should publish opaque state when publishing error event", async () => {
        // Arrange
        const payload:PartyQueryReceivedEvtPayload = {
            partyId: "1",
            partyType: "type",
            requesterFspId: "2" ,
            destinationFspId: null,
            currency: null,
            partySubType: null,
        }

        const message: IMessage = {
            fspiopOpaqueState: {
                fake: "fake opaque state"
            },
            msgId: "fake msg id",
            msgKey: "fake msg key",
            msgTopic: "fake msg topic",
            msgName: "invalid name",
            msgOffset: 0,
            msgPartition: 0,
            msgTimestamp: 0,
            msgType: MessageTypes.DOMAIN_EVENT,
            payload: payload,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "fspiopOpaqueState": {
                fake: "fake opaque state"
            },
        }));

    });


    test("should publish opaque state when publishing successful event", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const destinationFspId = "destinationFspId";
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId,
            currency: null,
            partySubType: null,
        };

        const message: IMessage = {
            fspiopOpaqueState: "fake opaque state",
            msgId: "fake msg id",
            msgKey: "fake msg key",
            msgTopic: "fake msg topic",
            msgName: PartyQueryReceivedEvt.name,
            msgOffset: 0,
            msgPartition: 0,
            msgTimestamp: 0,
            msgType: MessageTypes.DOMAIN_EVENT,
            payload :payload,
        };

        const responsePayload : PartyInfoRequestedEvtPayload= {
            partyId,
            partyType,
            requesterFspId,
            destinationFspId,
            currency: null,
            partySubType: null
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({ id: requesterFspId, type: partyType, isActive: true} as IParticipant as any)
            .mockResolvedValueOnce({ id:destinationFspId,type: partyType, isActive: true} as IParticipant as any);


        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "fspiopOpaqueState": "fake opaque state",
            "payload": responsePayload,
        }));

    });


    //#endregion

    //#region handlePartyInfoAvailableEvt
    test("handlePartyQueryReceivedEvt - should publish error message if is unable to find IParticipant on oracle", async () => {
        //Arrange
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[1];
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType:partyType,
            requesterFspId,
            destinationFspId: null,
            currency: null,
            partySubType: partySubType,
        };

        const IParticipant: Partial<IParticipant> = {
            id: requesterFspId,
            type: "DFSP",
            isActive: true,
        }

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(IParticipant as IParticipant as any);

        const event = new PartyQueryReceivedEvt(payload);

        const errorMsg = NoSuchParticipantFspIdError.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
			errorMsg,
			partyId,
            sourceEvent: event.msgName,
            partySubType,
            partyType,
            requesterFspId,
		};

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

     });

    test("handlePartyQueryReceivedEvt - should publish error message if is unable to get an oracle from oracle finder", async () => {
       //Arrange
       const partyId = mockedPartyIds[0];
       const requesterFspId = mockedParticipantIds[0];
       const partyType = "no oracle";
       const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId:null,
            currency: null,
            partySubType: null,
      };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: requesterFspId, type: "DFSP", isActive: true} as IParticipant as any);
        jest.spyOn(messageProducer, "send");

        const event = new PartyQueryReceivedEvt(payload);

        const errorMsg = NoSuchOracleError.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
			errorMsg,
			partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId,
		};

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("handlePartyQueryReceivedEvt - should publish error message if is unable to get an oracle from oracle provider list", async () => {
        //Arrange
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const partyType = mockedPartyTypes[3];
        const partySubType = mockedPartySubTypes[0];
        const payload :PartyQueryReceivedEvtPayload = {
             partyId,
             partyType,
             requesterFspId ,
             destinationFspId:null,
             currency: null,
             partySubType,
       };

         jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: requesterFspId, type: "DFSP", isActive: true} as IParticipant as any);
         jest.spyOn(aggregate, "oracleProvidersAdapters","get").mockReturnValue([]);
         jest.spyOn(messageProducer, "send");

         const event = new PartyQueryReceivedEvt(payload);

         const errorMsg = NoSuchOracleAdapterError.name;

         const errorPayload: AccountLookUpErrorEvtPayload = {
             errorMsg,
             partyId,
             sourceEvent: event.msgName,
             partySubType,
             partyType,
             requesterFspId,
         };

         // Act
         await aggregate.handleAccountLookUpEvent(event);

         // Assert
         expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
             "payload": errorPayload,
        }));

     });

     test("handlePartyQueryReceivedEvt - should publish error message if oracle returns no IParticipant", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[1];

        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId:null,
            currency: null,
            partySubType,
        };

        const IParticipant: Partial<IParticipant> = {
            id: requesterFspId,
            type: "DFSP",
            isActive: true,
        }

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(IParticipant as IParticipant as any);

        const event = new PartyQueryReceivedEvt(payload);

        const errorMsg = NoSuchParticipantFspIdError.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType,
            partyType,
            requesterFspId,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));
     });

     test("handlePartyQueryReceivedEvt - should publish error message if IParticipant info not found", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const destinationFspId = mockedParticipantFspIds[0];
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId,
            currency: null,
            partySubType: null,
        };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce(null);

        const event = new PartyQueryReceivedEvt(payload);
        const errorMsg = NoSuchParticipantError.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });
/*
     test("handlePartyQueryReceivedEvt - should publish error message if IParticipant is not active", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const destinationFspId = mockedParticipantFspIds[0];
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId,
            currency: null,
            partySubType: null,
        };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({ id: requesterFspId, type: "HUB", isActive: false} as IParticipant as any);

        const event = new PartyQueryReceivedEvt(payload);
        const errorMsg = RequiredParticipantIsNotActive.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });*/

    test("handlePartyQueryReceivedEvt - should publish error message if IParticipant id received from client service isnt equal to the requester", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const destinationFspId = mockedParticipantFspIds[0];
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId,
            currency: null,
            partySubType: null,
        };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({ id: "no matching", type: "HUB", isActive: true} as IParticipant as any);

        const event = new PartyQueryReceivedEvt(payload);
        const errorMsg = InvalidParticipantIdError.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });


     test("handlePartyQueryReceivedEvt - should publish response with PartyInfoRequestedEvt", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const destinationFspId = "destinationFspId";
        const payload :PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId,
            currency: null,
            partySubType: null,
      };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({ id: requesterFspId, type: "DFSP", isActive: true} as IParticipant as any)
            .mockResolvedValueOnce({ id:destinationFspId,type: "HUB", isActive: true} as IParticipant as any);

        const event = new PartyQueryReceivedEvt(payload);
        const responsePayload : PartyInfoRequestedEvtPayload= {
            partyId,
            partyType,
            requesterFspId,
            destinationFspId,
            currency: null,
            partySubType: null
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": responsePayload,
        }));

    });

    //#endregion

    //#region handlePartyInfoAvailableEvt
    test("handlePartyInfoAvailableEvt - should publish error message if information from source is invalid", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = "no party";
        const requesterFspId = mockedParticipantIds[0];
        const payload :PartyInfoAvailableEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            destinationFspId:null,
            currency: null,
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
        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

        });

        test("handlePartyInfoAvailableEvt - should publish error message if information from destination is invalid", async () => {
            //Arrange
            const partyType = mockedPartyTypes[0];
            const partyId = "no party";
            const requesterFspId = mockedParticipantIds[0];
            const payload :PartyInfoAvailableEvtPayload = {
                partyId,
                partyType,
                requesterFspId ,
                destinationFspId:"2",
                currency: null,
                partySubType: null,
                ownerFspId: "ownerId",
                partyDoB:new Date(),
                partyName:"name",
            };

            jest.spyOn(participantService, "getParticipantInfo")
                .mockResolvedValueOnce({id: requesterFspId, type: "DFSP", isActive: true} as IParticipant as any)
                .mockResolvedValueOnce(null);
            jest.spyOn(messageProducer, "send");

            const event = new PartyInfoAvailableEvt(payload);

            const errorMsg = NoSuchParticipantError.name;
            const errorPayload: AccountLookUpErrorEvtPayload = {
                errorMsg,
                partyId,
                sourceEvent: event.msgName,
                partySubType: null,
                partyType,
                requesterFspId,
            };

            // Act
            await aggregate.handleAccountLookUpEvent(event);

            // Assert

            expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
                "payload": errorPayload,
        }));
        });

        test("handlePartyInfoAvailableEvt - should publish event with party info requested", async () => {
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
                currency: null,
                partySubType: null,
                ownerFspId: "ownerId",
                partyDoB,
                partyName:"name",
            };

            jest.spyOn(participantService, "getParticipantInfo")
                .mockResolvedValueOnce({id: requesterFspId, type: "HUB", isActive: true} as IParticipant as any)
                .mockResolvedValueOnce({id: "2", type: "HUB", isActive: true} as IParticipant as any);
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
            const result = await aggregate.handleAccountLookUpEvent(event);

            // Assert

            expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
                "payload": responsePayload,
        }));
        });

    //#endregion

    //#region handleParticipantQueryReceivedEvt
    test("handleParticipantQueryReceivedEvt - should publish error message if information from requester is invalid", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = "no party";
        const requesterFspId = mockedParticipantIds[0];
        const payload :ParticipantQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            currency: null,
            partySubType: null,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce(null);
        jest.spyOn(messageProducer, "send");

        const event = new ParticipantQueryReceivedEvt(payload);

        const errorMsg = NoSuchParticipantError.name;
        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("handleParticipantQueryReceivedEvt - should publish event with IParticipant query response", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload :ParticipantQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            currency:"USD",
            partySubType,
        };

        const oracleParticipantFspId = getParticipantFspIdForOracleTypeAndSubType(partyType, partySubType) as string;

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: requesterFspId, type: "DFSP", isActive: true} as IParticipant as any)
            .mockResolvedValueOnce({id: oracleParticipantFspId, type: "DFSP", isActive: true} as IParticipant as any);
        jest.spyOn(messageProducer, "send");

        const event = new ParticipantQueryReceivedEvt(payload);
        const responsePayload : ParticipantQueryResponseEvtPayload= {
            requesterFspId,
            partyType,
            partyId,
            partySubType,
            currency: "USD",
            ownerFspId: oracleParticipantFspId,
        };

        // Act

        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": responsePayload,
        }));
    });

    test("handleParticipantQueryReceivedEvt - should publish error message if oracle provider is not found", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload :ParticipantQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            currency: null,
            partySubType: null,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: requesterFspId, type: "DFSP", isActive: true} as IParticipant as any);
        jest.spyOn(oracleFinder, "getOracle").mockResolvedValueOnce(null);
        jest.spyOn(messageProducer, "send");

        const event = new ParticipantQueryReceivedEvt(payload);

        const errorMsg = NoSuchOracleError.name;
        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));
    });

    test("handleParticipantQueryReceivedEvt - should publish error message if oracle cant get a IParticipant", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[1];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload :ParticipantQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId ,
            currency: null,
            partySubType,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: requesterFspId, type: partyType, isActive: true} as IParticipant as any);
        jest.spyOn(messageProducer, "send");
        const event = new ParticipantQueryReceivedEvt(payload);

        const errorMsg = NoSuchParticipantFspIdError.name;
        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType,
            partyType,
            requesterFspId,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));
    });

    //#endregion

    //#region handleParticipantAssociationRequestReceivedEvt

    test("handleParticipantAssociationRequestReceivedEvt - should publish error message if information from owner is invalid", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];

        const partyId = mockedPartyIds[0];
        const ownerFspId = mockedParticipantIds[0];
        const payload :ParticipantAssociationRequestReceivedEvtPayload = {
            partyId,
            partyType,
            ownerFspId,
            partySubType: null,
            currency: null,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce(null);
        jest.spyOn(messageProducer, "send");

        const event = new ParticipantAssociationRequestReceivedEvt(payload);

        const errorMsg = NoSuchParticipantError.name;
        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId: null,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));
    });

    test("handleParticipantAssociationRequestReceivedEvt - should publish error message if couldnt associate IParticipant", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const ownerFspId = mockedParticipantIds[0];

        const payload :ParticipantAssociationRequestReceivedEvtPayload = {
            partyId,
            partyType,
            ownerFspId,
            partySubType: null,
            currency: null,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: ownerFspId, type: partyType, isActive: true} as IParticipant as any);
        jest.spyOn(messageProducer, "send");

        const event = new ParticipantAssociationRequestReceivedEvt(payload);

        const errorMsg = UnableToAssociateParticipantError.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId: null,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("handleParticipantAssociationRequestReceivedEvt - should associate IParticipant and publish message", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const ownerFspId = mockedParticipantIds[0];

        const payload :ParticipantAssociationRequestReceivedEvtPayload = {
            partyId,
            partyType,
            ownerFspId,
            partySubType,
            currency: null,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: ownerFspId, type: partyType, isActive: true} as IParticipant as any);
        jest.spyOn(messageProducer, "send");

        const event = new ParticipantAssociationRequestReceivedEvt(payload);

        const expectedPayload: ParticipantAssociationCreatedEvtPayload = {
            partyId,
            partyType,
            ownerFspId,
            partySubType,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": expectedPayload,
        }));

    });

    //#endregion

    //#region handleParticipantDisassociateRequestReceivedEvt

    test("handleParticipantDisassociateRequestReceivedEvt - should publish error message if information from owner is invalid", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const ownerFspId = mockedParticipantIds[0];
        const payload :ParticipantDisassociateRequestReceivedEvtPayload = {
            partyId,
            partyType,
            ownerFspId,
            partySubType: null,
            currency: null,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce(null);
        jest.spyOn(messageProducer, "send");

        const event = new ParticipantDisassociateRequestReceivedEvt(payload);

        const errorMsg = NoSuchParticipantError.name;
        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId:null,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));
    });

    test("handleParticipantDisassociateRequestReceivedEvt - should publish error message if couldnt disassociate IParticipant", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partyId = mockedPartyIds[0];
        const ownerFspId = mockedParticipantIds[0];

        const payload :ParticipantDisassociateRequestReceivedEvtPayload = {
            partyId,
            partyType,
            ownerFspId,
            partySubType: null,
            currency: null,
        };

        const returnedParticipant: Partial<IParticipant> = {
            id: ownerFspId,
            type: "DFSP",
            isActive: true,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce(returnedParticipant as IParticipant as any);
        jest.spyOn(messageProducer, "send");

        const event = new ParticipantDisassociateRequestReceivedEvt(payload);

        const errorMsg = UnableToDisassociateParticipantError.name;

        const errorPayload: AccountLookUpErrorEvtPayload = {
            errorMsg,
            partyId,
            sourceEvent: event.msgName,
            partySubType: null,
            partyType,
            requesterFspId:null,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("handleParticipantDisassociateRequestReceivedEvt - should disassociate IParticipant and publish message", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const ownerFspId = mockedParticipantIds[0];

        const payload :ParticipantDisassociateRequestReceivedEvtPayload = {
            partyId,
            partyType,
            ownerFspId,
            partySubType,
            currency: null,
        };

        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: ownerFspId, type: partyType, isActive: true} as IParticipant as any);
        jest.spyOn(messageProducer, "send");

        const event = new ParticipantDisassociateRequestReceivedEvt(payload);

        const expectedPayload: ParticipantAssociationRemovedEvtPayload = {
            partyId,
            partyType,
            ownerFspId,
            partySubType,
        };

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert

        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": expectedPayload,
        }));

    });
//#endregion

});

