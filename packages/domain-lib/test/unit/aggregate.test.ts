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
import {IMessage, MessageTypes} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {AccountLookupAggregate, Oracle,} from "../../src";
import {
    getParticipantFspIdForOracleTypeAndSubType,
    MemoryOracleProviderAdapter,
    mockedOracleAdapters,
    mockedParticipantIds,
    mockedPartyIds,
    mockedPartySubTypes,
    mockedPartyTypes
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import {
    ParticipantAssociationCreatedEvtPayload,
    ParticipantAssociationRemovedEvtPayload,
    ParticipantAssociationRequestReceivedEvt,
    ParticipantAssociationRequestReceivedEvtPayload,
    ParticipantDisassociateRequestReceivedEvt,
    ParticipantDisassociateRequestReceivedEvtPayload,
    ParticipantQueryReceivedEvt,
    ParticipantQueryReceivedEvtPayload,
    ParticipantQueryResponseEvtPayload,
    PartyInfoAvailableEvt,
    PartyInfoAvailableEvtPayload,
    PartyInfoRequestedEvtPayload,
    PartyQueryReceivedEvt,
    PartyQueryReceivedEvtPayload,
    PartyQueryResponseEvtPayload
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {IParticipant} from "@mojaloop/participant-bc-public-types-lib";
import {
    logger,
    messageProducer,
    oracleFinder,
    oracleProviderFactory,
    participantService
} from "../utils/mocked_variables";
import {IMetrics, MetricsMock} from "@mojaloop/platform-shared-lib-observability-types-lib";

let aggregate: AccountLookupAggregate;

// Domain.

describe("Domain - Unit Tests for aggregate events", () => {

    beforeAll(async () => {
        const metricsMock :IMetrics = new MetricsMock();
        aggregate = new AccountLookupAggregate(logger, oracleFinder,oracleProviderFactory, messageProducer,participantService, metricsMock);
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
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
            partyType: "mockedPartyType",
            name: "mockedOracle",
            endpoint: null,
            type: "builtin",
            currency: "USD",
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
                merchantClassificationCode:"18",
                name:"name",
                firstName: "Maria",
                middleName: "P",
                lastName: "Lee"
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
                merchantClassificationCode:"18",
                name:"name",
                firstName: "Maria",
                middleName: "P",
                lastName: "Lee"
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

    test("handleParticipantQueryReceivedEvt - should publish event with IParticipant query response", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload:ParticipantQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType
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

    //#endregion


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

