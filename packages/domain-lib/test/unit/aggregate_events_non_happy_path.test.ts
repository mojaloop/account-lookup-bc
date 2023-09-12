import {AccountLookUpUnableToGetParticipantFromOracleErrorPayload, AccountLookupBCInvalidDestinationParticipantErrorPayload, AccountLookupBCInvalidMessageErrorPayload, AccountLookupBCInvalidMessageTypeErrorPayload, AccountLookupBCInvalidRequesterParticipantErrorPayload, ParticipantQueryReceivedEvt, ParticipantQueryReceivedEvtPayload, PartyQueryReceivedEvt, PartyQueryReceivedEvtPayload} from "@mojaloop/platform-shared-lib-public-messages-lib";
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

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
**/
import { IMessage, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IMetrics, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { logger, messageProducer, oracleFinder, oracleProviderFactory, participantService } from "../utils/mocked_variables";
import { mockedParticipantIds, mockedPartyIds, mockedPartySubTypes, mockedPartyTypes } from "@mojaloop/account-lookup-bc-shared-mocks-lib";

import { AccountLookupAggregate } from "../../src";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";

"use strict";


//TODO: Correct non happy path for tests. Below you will find the original tests for the non happy path. We were just using a single error to test the non happy path.
//TODO: We need to add the new errors and replace all the tests with the new errors.If necessary more tests can be added.

let aggregate: AccountLookupAggregate;

describe("Domain - Unit Tests for aggregate events with non happy path", () => {

    beforeAll(() => {
        const metricsMock :IMetrics = new MetricsMock();
        aggregate = new AccountLookupAggregate(logger, oracleFinder,oracleProviderFactory, messageProducer,participantService, metricsMock);

    });



    test("should publish InvalidMessageErrorPayload message if payload is invalid", async () => {
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

        const errorPayload: AccountLookupBCInvalidMessageErrorPayload = {
            partyId: null as any,
            partyType: null as any,
            partySubType: null,
            requesterFspId: null,
            errorDescription: "Message payload is null or undefined",
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("PartyQuery - should publish InvalidMessageTypeErrorEvent message if type is invalid", async () => {
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
            msgType: "Invalid type" as unknown as MessageTypes.DOMAIN_EVENT,
            payload: {
                partyId: "1",
                partyType: "type",
                partySubType: null,
                requesterFspId: "2" ,
                destinationFspId: null,
                currency: null,
            }
        };

        const errorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
            partyId: "1",
            partyType: "type",
            requesterFspId: "2",
            partySubType: null as any,
            errorDescription: `Message type is invalid ${message.msgType}`,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEvent(message);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": errorPayload,
        }));

    });

    test("PartyQuery - should send InvalidRequesterParticipantErrorEvent if no participant id is provided", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];

        const payload:PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId: null as any,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload : AccountLookupBCInvalidRequesterParticipantErrorPayload= {
           errorDescription: "Fsp Id is null or undefined",
           requesterFspId: null as any,
           partyId,
           partySubType,
           partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": responsePayload,
        }));

    });

    test("PartyQuery - should send UnableToGetParticipantFromOracleErrorPayload if oracle finder throws error when destination fspId is not provided", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload:PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload : AccountLookUpUnableToGetParticipantFromOracleErrorPayload= {
            errorDescription: `Unable to get oracle for partyType: ${partyType} and currency: USD`,
            currency: "USD",
            partyId,
            partySubType,
            partyType
        };

        const event = new PartyQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: requesterFspId, type: partyType, isActive: true} as IParticipant as any);
        jest.spyOn(oracleFinder, "getOracle").mockRejectedValueOnce(new Error("Error"));

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": responsePayload,
        }));

    });

    test("PartyQuery - should send UnableToGetParticipantFromOracleErrorPayload if oracle finder throws error when destination fspId is not provided", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload:PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload : AccountLookUpUnableToGetParticipantFromOracleErrorPayload= {
            errorDescription: `Unable to get oracle for partyType: ${partyType} and currency: USD`,
            currency: "USD",
            partyId,
            partySubType,
            partyType
        };

        const event = new PartyQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: requesterFspId, type: partyType, isActive: true} as IParticipant as any);
        jest.spyOn(oracleFinder, "getOracle").mockRejectedValueOnce(new Error("Error"));

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": responsePayload,
        }));

    });

    test("PartyQuery - should send UnableToGetParticipantFromOracleErrorPayload if oracle finder doesn't find a oracle when destination fspId is not provided", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload:PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload : AccountLookUpUnableToGetParticipantFromOracleErrorPayload= {
            errorDescription: `Oracle for partyType: ${partyType} and currency: USD not found`,
            currency: "USD",
            partyId,
            partySubType,
            partyType
        };

        const event = new PartyQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: requesterFspId, type: partyType, isActive: true} as IParticipant as any);
        jest.spyOn(oracleFinder, "getOracle").mockResolvedValueOnce(null);

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": responsePayload,
        }));

    });

    test("PartyQuery - should send UnableToGetParticipantFromOracleErrorPayload if oracle finder returns a oracle that don't belong to the adapter", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const fakeOracleId = "fake oracle id";

        const payload:PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload : AccountLookUpUnableToGetParticipantFromOracleErrorPayload= {
            errorDescription: `Oracle adapter for ${partyType} and id: ${fakeOracleId} not present in oracle list`,
            currency: "USD",
            partyId,
            partySubType,
            partyType
        };

        const event = new PartyQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({id: requesterFspId, type: partyType, isActive: true} as IParticipant as any);
        jest.spyOn(oracleFinder, "getOracle").mockResolvedValueOnce({
            id: fakeOracleId,
            type: "builtin",
            currency: "USD",
            endpoint: "http://oracle.com",
            name: "oracle",
            partyType
        });

        // Act
        await aggregate.handleAccountLookUpEvent(event);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": responsePayload,
        }));

    });


// test("should publish error message if message Name is invalid", async () => {
//     // Arrange
//     const payload:PartyQueryReceivedEvtPayload = {
//         partyId:"1",
//         partyType:"type",
//         requesterFspId:"2" ,
//         destinationFspId:null,
//         currency: null,
//         partySubType: null,
//     }

//     const message: IMessage = {
//         fspiopOpaqueState: "fake opaque state",
//         msgId: "fake msg id",
//         msgKey: "fake msg key",
//         msgTopic: "fake msg topic",
//         msgName: "fake msg name",
//         msgOffset: 0,
//         msgPartition: 0,
//         msgTimestamp: 0,
//         msgType: MessageTypes.DOMAIN_EVENT,
//         payload: payload
//     };

//     const errorMsg = InvalidMessageTypeError.name;

//     const errorPayload: AccountLookUpErrorEvtPayload = {
// 		errorMsg,
// 		partyId:"1",
//         sourceEvent: "fake msg name",
//         partySubType: null,
//         partyType: "type",
//         requesterFspId: "2"
// 	};

//     jest.spyOn(messageProducer, "send");

//     // Act
//     await aggregate.handleAccountLookUpEvent(message);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload
//     }));

// });

// test("should publish error message if message Type is invalid", async () => {
//     // Arrange
//     const payload:PartyQueryReceivedEvtPayload = {
//         partyId: "1",
//         partyType: "type",
//         requesterFspId: "2" ,
//         destinationFspId: null,
//         currency: null,
//         partySubType: null,
//     }

//     const message: IMessage = {
//         fspiopOpaqueState: "fake opaque state",
//         msgId: "fake msg id",
//         msgKey: "fake msg key",
//         msgTopic: "fake msg topic",
//         msgName: "fake msg name",
//         msgOffset: 0,
//         msgPartition: 0,
//         msgTimestamp: 0,
//         msgType: "invalid message type" as unknown as MessageTypes.DOMAIN_EVENT,
//         payload :payload,
//     };

//     const errorMsg = InvalidMessageTypeError.name;

//     const errorPayload: AccountLookUpErrorEvtPayload = {
// 		errorMsg,
// 		partyId: "1",
//         sourceEvent: "fake msg name",
//         partyType: "type",
//         partySubType: null,
//         requesterFspId: "2",
// 	};

//     jest.spyOn(messageProducer, "send");

//     // Act
//     await aggregate.handleAccountLookUpEvent(message);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });

//#region handlePartyQueryReceivedEvt

// test("handlePartyQueryReceivedEvt - should publish error message if is unable to find IParticipant on oracle", async () => {
//     //Arrange
//     const partyId = mockedPartyIds[0];
//     const requesterFspId = mockedParticipantIds[0];
//     const partyType = mockedPartyTypes[0];
//     const partySubType = mockedPartySubTypes[1];
//     const payload :PartyQueryReceivedEvtPayload = {
//         partyId,
//         partyType:partyType,
//         requesterFspId,
//         destinationFspId: null,
//         currency: null,
//         partySubType: partySubType,
//     };

//     const IParticipant: Partial<IParticipant> = {
//         id: requesterFspId,
//         type: "DFSP",
//         isActive: true,
//     }

//     jest.spyOn(messageProducer, "send");
//     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(IParticipant as IParticipant as any);

//     const event = new PartyQueryReceivedEvt(payload);

//     const errorMsg = NoSuchParticipantFspIdError.name;

//     const errorPayload: AccountLookUpErrorEvtPayload = {
// 		errorMsg,
// 		partyId,
//         sourceEvent: event.msgName,
//         partySubType,
//         partyType,
//         requesterFspId,
// 	};

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

//  });

// test("handlePartyQueryReceivedEvt - should publish error message if is unable to get an oracle from oracle finder", async () => {
//    //Arrange
//    const partyId = mockedPartyIds[0];
//    const requesterFspId = mockedParticipantIds[0];
//    const partyType = "no oracle";
//    const payload :PartyQueryReceivedEvtPayload = {
//         partyId,
//         partyType,
//         requesterFspId ,
//         destinationFspId:null,
//         currency: null,
//         partySubType: null,
//   };

//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce({id: requesterFspId, type: "DFSP", isActive: true} as IParticipant as any);
//     jest.spyOn(messageProducer, "send");

//     const event = new PartyQueryReceivedEvt(payload);

//     const errorMsg = NoSuchOracleError.name;

//     const errorPayload: AccountLookUpErrorEvtPayload = {
// 		errorMsg,
// 		partyId,
//         sourceEvent: event.msgName,
//         partySubType: null,
//         partyType,
//         requesterFspId,
// 	};

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });

// test("handlePartyQueryReceivedEvt - should publish error message if is unable to get an oracle from oracle provider list", async () => {
//     //Arrange
//     const partyId = mockedPartyIds[0];
//     const requesterFspId = mockedParticipantIds[0];
//     const partyType = mockedPartyTypes[3];
//     const partySubType = mockedPartySubTypes[0];
//     const payload:PartyQueryReceivedEvtPayload = {
//          partyId,
//          partyType,
//          requesterFspId ,
//          destinationFspId:null,
//          currency: null,
//          partySubType,
//    };

//      jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce({id: requesterFspId, type: "DFSP", isActive: true} as IParticipant as any);
//      jest.spyOn(aggregate, "oracleProvidersAdapters","get").mockReturnValue([]);
//      jest.spyOn(messageProducer, "send");

//      const event = new PartyQueryReceivedEvt(payload);

//      const errorMsg = NoSuchOracleAdapterError.name;

//      const errorPayload: AccountLookUpErrorEvtPayload = {
//          errorMsg,
//          partyId,
//          sourceEvent: event.msgName,
//          partySubType,
//          partyType,
//          requesterFspId,
//      };

//      // Act
//      await aggregate.handleAccountLookUpEvent(event);

//      // Assert
//      expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//          "payload": errorPayload,
//     }));

//  });

//  test("handlePartyQueryReceivedEvt - should publish error message if oracle returns no IParticipant", async () => {
//     // Arrange
//     const partyType = mockedPartyTypes[0];
//     const partySubType = mockedPartySubTypes[1];

//     const partyId = mockedPartyIds[0];
//     const requesterFspId = mockedParticipantIds[0];
//     const payload :PartyQueryReceivedEvtPayload = {
//         partyId,
//         partyType,
//         requesterFspId ,
//         destinationFspId:null,
//         currency: null,
//         partySubType,
//     };

//     const IParticipant: Partial<IParticipant> = {
//         id: requesterFspId,
//         type: "DFSP",
//         isActive: true,
//     }

//     jest.spyOn(messageProducer, "send");
//     jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(IParticipant as IParticipant as any);

//     const event = new PartyQueryReceivedEvt(payload);

//     const errorMsg = NoSuchParticipantFspIdError.name;

//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType,
//         partyType,
//         requesterFspId,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));
//  });

// test("handlePartyQueryReceivedEvt - should publish error message if IParticipant info not found", async () => {
//     //Arrange
//     const partyType = mockedPartyTypes[0];
//     const partyId = mockedPartyIds[0];
//     const requesterFspId = mockedParticipantIds[0];
//     const destinationFspId = mockedParticipantFspIds[0];
//     const payload :PartyQueryReceivedEvtPayload = {
//         partyId,
//         partyType,
//         requesterFspId ,
//         destinationFspId,
//         currency: null,
//         partySubType: null,
//     };

//     jest.spyOn(messageProducer, "send");
//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce(null);

//     const event = new PartyQueryReceivedEvt(payload);
//     const errorMsg = NoSuchParticipantError.name;

//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType: null,
//         partyType,
//         requesterFspId,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });
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

// test("handlePartyQueryReceivedEvt - should publish error message if IParticipant id received from client service isnt equal to the requester", async () => {
//     //Arrange
//     const partyType = mockedPartyTypes[0];
//     const partyId = mockedPartyIds[0];
//     const requesterFspId = mockedParticipantIds[0];
//     const destinationFspId = mockedParticipantFspIds[0];
//     const payload :PartyQueryReceivedEvtPayload = {
//         partyId,
//         partyType,
//         requesterFspId ,
//         destinationFspId,
//         currency: null,
//         partySubType: null,
//     };

//     jest.spyOn(messageProducer, "send");
//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce({ id: "no matching", type: "HUB", isActive: true} as IParticipant as any);

//     const event = new PartyQueryReceivedEvt(payload);
//     const errorMsg = InvalidParticipantIdError.name;

//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType: null,
//         partyType,
//         requesterFspId,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert
//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });

//#endregion

//#region handlePartyInfoAvailableEvt

// test("handlePartyInfoAvailableEvt - should publish error message if information from source is invalid", async () => {
//     // Arrange
//     const partyType = mockedPartyTypes[0];
//     const partyId = "no party";
//     const requesterFspId = mockedParticipantIds[0];
//     const payload :PartyInfoAvailableEvtPayload = {
//         partyId,
//         partyType,
//         requesterFspId ,
//         destinationFspId:null,
//         currency: null,
//         partySubType: null,
//         ownerFspId: "ownerId",
//         partyDoB:new Date(),
//         partyName:"name",
//     };

//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce(null);
//     jest.spyOn(messageProducer, "send");

//     const event = new PartyInfoAvailableEvt(payload);

//     const errorMsg = NoSuchParticipantError.name;
//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType: null,
//         partyType,
//         requesterFspId,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert

//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

//     });

// test("handlePartyInfoAvailableEvt - should publish error message if information from destination is invalid", async () => {
//     //Arrange
//         const partyType = mockedPartyTypes[0];
//         const partyId = "no party";
//         const requesterFspId = mockedParticipantIds[0];
//         const payload :PartyInfoAvailableEvtPayload = {
//             partyId,
//             partyType,
//             requesterFspId ,
//             destinationFspId:"2",
//             currency: null,
//             partySubType: null,
//             ownerFspId: "ownerId",
//             partyDoB:new Date(),
//             partyName:"name",
//         };

//         jest.spyOn(participantService, "getParticipantInfo")
//             .mockResolvedValueOnce({id: requesterFspId, type: "DFSP", isActive: true} as IParticipant as any)
//             .mockResolvedValueOnce(null);
//         jest.spyOn(messageProducer, "send");

//         const event = new PartyInfoAvailableEvt(payload);

//         const errorMsg = NoSuchParticipantError.name;
//         const errorPayload: AccountLookUpErrorEvtPayload = {
//             errorMsg,
//             partyId,
//             sourceEvent: event.msgName,
//             partySubType: null,
//             partyType,
//             requesterFspId,
//         };

//         // Act
//         await aggregate.handleAccountLookUpEvent(event);

//         // Assert

//         expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//             "payload": errorPayload,
//     }));
//     });

//#endregion

//#region handleParticipantQueryReceivedEvt

// test("handleParticipantQueryReceivedEvt - should publish error message if information from requester is invalid", async () => {
//     // Arrange
//     const partyType = mockedPartyTypes[0];
//     const partyId = "no party";
//     const requesterFspId = mockedParticipantIds[0];
//     const payload :ParticipantQueryReceivedEvtPayload = {
//         partyId,
//         partyType,
//         requesterFspId ,
//         currency: null,
//         partySubType: null,
//     };

//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce(null);
//     jest.spyOn(messageProducer, "send");

//     const event = new ParticipantQueryReceivedEvt(payload);

//     const errorMsg = NoSuchParticipantError.name;
//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType: null,
//         partyType,
//         requesterFspId,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert

//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });

// test("handleParticipantQueryReceivedEvt - should publish error message if oracle provider is not found", async () => {
//     //Arrange
//     const partyType = mockedPartyTypes[0];
//     const partyId = mockedPartyIds[0];
//     const requesterFspId = mockedParticipantIds[0];

//     const payload :ParticipantQueryReceivedEvtPayload = {
//         partyId,
//         partyType,
//         requesterFspId ,
//         currency: null,
//         partySubType: null,
//     };

//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce({id: requesterFspId, type: "DFSP", isActive: true} as IParticipant as any);
//     jest.spyOn(oracleFinder, "getOracle").mockResolvedValueOnce(null);
//     jest.spyOn(messageProducer, "send");

//     const event = new ParticipantQueryReceivedEvt(payload);

//     const errorMsg = NoSuchOracleError.name;
//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType: null,
//         partyType,
//         requesterFspId,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert

//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));
// });

// test("handleParticipantQueryReceivedEvt - should publish error message if oracle cant get a IParticipant", async () => {
//     //Arrange
//     const partyType = mockedPartyTypes[0];
//     const partySubType = mockedPartySubTypes[1];
//     const partyId = mockedPartyIds[0];
//     const requesterFspId = mockedParticipantIds[0];

//     const payload :ParticipantQueryReceivedEvtPayload = {
//         partyId,
//         partyType,
//         requesterFspId ,
//         currency: null,
//         partySubType,
//     };

//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce({id: requesterFspId, type: partyType, isActive: true} as IParticipant as any);
//     jest.spyOn(messageProducer, "send");
//     const event = new ParticipantQueryReceivedEvt(payload);

//     const errorMsg = NoSuchParticipantFspIdError.name;
//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType,
//         partyType,
//         requesterFspId,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert

//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));
// });

//#endregion

//#region handleParticipantAssociationRequestReceivedEvt

// test("handleParticipantAssociationRequestReceivedEvt - should publish error message if information from owner is invalid", async () => {
//     // Arrange
//     const partyType = mockedPartyTypes[0];

//     const partyId = mockedPartyIds[0];
//     const ownerFspId = mockedParticipantIds[0];
//     const payload :ParticipantAssociationRequestReceivedEvtPayload = {
//         partyId,
//         partyType,
//         ownerFspId,
//         partySubType: null,
//         currency: null,
//     };

//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce(null);
//     jest.spyOn(messageProducer, "send");

//     const event = new ParticipantAssociationRequestReceivedEvt(payload);

//     const errorMsg = NoSuchParticipantError.name;
//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType: null,
//         partyType,
//         requesterFspId: null,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert

//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));
// });

// test("handleParticipantAssociationRequestReceivedEvt - should publish error message if couldnt associate IParticipant", async () => {
//     // Arrange
//     const partyType = mockedPartyTypes[1];
//     const partyId = mockedPartyIds[0];
//     const ownerFspId = mockedParticipantIds[0];

//     const payload :ParticipantAssociationRequestReceivedEvtPayload = {
//         partyId,
//         partyType,
//         ownerFspId,
//         partySubType: null,
//         currency: null,
//     };

//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce({id: ownerFspId, type: partyType, isActive: true} as IParticipant as any);
//     jest.spyOn(messageProducer, "send");

//     const event = new ParticipantAssociationRequestReceivedEvt(payload);

//     const errorMsg = UnableToAssociateParticipantError.name;

//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType: null,
//         partyType,
//         requesterFspId: null,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert

//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });

//#endregion

//#region handleParticipantDisassociateRequestReceivedEvt

// test("handleParticipantDisassociateRequestReceivedEvt - should publish error message if information from owner is invalid", async () => {
//     // Arrange
//     const partyType = mockedPartyTypes[0];
//     const partyId = mockedPartyIds[0];
//     const ownerFspId = mockedParticipantIds[0];
//     const payload :ParticipantDisassociateRequestReceivedEvtPayload = {
//         partyId,
//         partyType,
//         ownerFspId,
//         partySubType: null,
//         currency: null,
//     };

//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce(null);
//     jest.spyOn(messageProducer, "send");

//     const event = new ParticipantDisassociateRequestReceivedEvt(payload);

//     const errorMsg = NoSuchParticipantError.name;
//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType: null,
//         partyType,
//         requesterFspId:null,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert

//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));
// });

// test("handleParticipantDisassociateRequestReceivedEvt - should publish error message if couldnt disassociate IParticipant", async () => {
//     // Arrange
//     const partyType = mockedPartyTypes[0];
//     const partyId = mockedPartyIds[0];
//     const ownerFspId = mockedParticipantIds[0];

//     const payload :ParticipantDisassociateRequestReceivedEvtPayload = {
//         partyId,
//         partyType,
//         ownerFspId,
//         partySubType: null,
//         currency: null,
//     };

//     const returnedParticipant: Partial<IParticipant> = {
//         id: ownerFspId,
//         type: "DFSP",
//         isActive: true,
//     };

//     jest.spyOn(participantService, "getParticipantInfo")
//         .mockResolvedValueOnce(returnedParticipant as IParticipant as any);
//     jest.spyOn(messageProducer, "send");

//     const event = new ParticipantDisassociateRequestReceivedEvt(payload);

//     const errorMsg = UnableToDisassociateParticipantError.name;

//     const errorPayload: AccountLookUpErrorEvtPayload = {
//         errorMsg,
//         partyId,
//         sourceEvent: event.msgName,
//         partySubType: null,
//         partyType,
//         requesterFspId:null,
//     };

//     // Act
//     await aggregate.handleAccountLookUpEvent(event);

//     // Assert

//     expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
//         "payload": errorPayload,
//     }));

// });
//#endregion

});