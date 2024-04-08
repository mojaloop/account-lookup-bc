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
"use strict";

import {
    AccountLookUpUnableToGetParticipantFromOracleErrorEvent,
    AccountLookUpUnableToGetParticipantFromOracleErrorPayload,
    AccountLookUpUnknownErrorPayload,
    AccountLookupBCDestinationParticipantNotFoundErrorEvent,
    AccountLookupBCDestinationParticipantNotFoundErrorPayload,
    AccountLookupBCInvalidDestinationParticipantErrorEvent,
    AccountLookupBCInvalidDestinationParticipantErrorPayload,
    AccountLookupBCInvalidMessageErrorPayload,
    AccountLookupBCInvalidMessagePayloadErrorEvent,
    AccountLookupBCInvalidMessageTypeErrorPayload,
    AccountLookupBCInvalidRequesterParticipantErrorEvent,
    AccountLookupBCInvalidRequesterParticipantErrorPayload,
    AccountLookupBCRequesterParticipantNotFoundErrorEvent,
    AccountLookupBCRequesterParticipantNotFoundErrorPayload,
    AccountLookupBCRequiredRequesterParticipantIdMismatchErrorEvent,
    AccountLookupBCRequiredDestinationParticipantIdMismatchErrorEvent,
    AccountLookupBCRequiredDestinationParticipantIdMismatchErrorPayload,
    AccountLookupBCUnableToAssociateParticipantErrorEvent,
    AccountLookupBCUnableToAssociateParticipantErrorPayload,
    AccountLookupBCUnableToDisassociateParticipantErrorEvent,
    AccountLookupBCUnableToDisassociateParticipantErrorPayload,
    AccountLookupBCUnableToGetOracleAdapterErrorEvent,
    AccountLookupBCUnableToGetOracleAdapterErrorPayload,
    GetPartyQueryRejectedEvt,
    GetPartyQueryRejectedEvtPayload,
    ParticipantAssociationCreatedEvt,
    ParticipantAssociationRequestReceivedEvt,
    ParticipantAssociationRequestReceivedEvtPayload,
    ParticipantDisassociateRequestReceivedEvt,
    ParticipantDisassociateRequestReceivedEvtPayload,
    ParticipantQueryReceivedEvt,
    ParticipantQueryReceivedEvtPayload,
    PartyInfoAvailableEvt,
    PartyInfoAvailableEvtPayload,
    PartyQueryReceivedEvt,
    PartyQueryReceivedEvtPayload,
    AccountLookupBCRequiredRequesterParticipantIsNotActiveErrorEvent,
    AccountLookupBCRequiredRequesterParticipantIsNotApprovedErrorEvent,
    AccountLookupBCRequiredDestinationParticipantIsNotApprovedErrorEvent,
    AccountLookupBCRequiredDestinationParticipantIsNotApprovedErrorPayload,
    AccountLookupBCRequiredDestinationParticipantIsNotActiveErrorEvent,
    AccountLookupBCRequiredDestinationParticipantIsNotActiveErrorPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";

import {IMessage, MessageTypes} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {IMetrics, MetricsMock} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {
    logger,
    messageProducer,
    oracleFinder,
    oracleProviderFactory,
    participantService,
} from "../utils/mocked_variables";
import {
    mockedParticipantFspIds,
    mockedParticipantIds,
    mockedPartyIds,
    mockedPartySubTypes,
    mockedPartyTypes,
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";

import {AccountLookupAggregate} from "../../src";
import {IParticipant} from "@mojaloop/participant-bc-public-types-lib";
import {AccountLookupErrorCodeNames} from "@mojaloop/account-lookup-bc-public-types-lib";

let aggregate: AccountLookupAggregate;

describe("Domain - Unit Tests for aggregate events with non happy path", () => {
    beforeAll(async () => {
        const metricsMock: IMetrics = new MetricsMock();
        aggregate = new AccountLookupAggregate(
            logger,
            oracleFinder,
            oracleProviderFactory,
            messageProducer,
            participantService,
            metricsMock
        );
        await aggregate.init();
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    //#region General Error Event Tests
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
            errorCode: AccountLookupErrorCodeNames.INVALID_MESSAGE_PAYLOAD,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEventBatch([message]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: errorPayload,
                msgName: AccountLookupBCInvalidMessagePayloadErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("should publish InvalidMessageTypeErrorEvent message if type is invalid", async () => {
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
                requesterFspId: "2",
                destinationFspId: null,
                currency: null,
            },
        };

        const errorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
            partyId: "1",
            partyType: "type",
            requesterFspId: "2",
            partySubType: null as any,
            errorCode: AccountLookupErrorCodeNames.INVALID_MESSAGE_TYPE,
        };

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEventBatch([message]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: errorPayload,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("should publish UnknownErrorEvent if an unhandled error occurs", async () => {
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
            payload: {
                partyId: "1",
                partyType: "type",
                partySubType: null,
                requesterFspId: "2",
                destinationFspId: null,
                currency: null,
            },
        };

        const errorPayload: AccountLookUpUnknownErrorPayload = {
            partyId: "1",
            partyType: "type",
            requesterFspId: "2",
            currency: null,
            errorCode: AccountLookupErrorCodeNames.COMMAND_TYPE_UNKNOWN,
        };

        jest.spyOn(messageProducer, "send");
        jest.spyOn(aggregate as any, "handlePartyQueryReceivedEvt").mockRejectedValueOnce(new Error("Error"));

        // Act
        await aggregate.handleAccountLookUpEventBatch([message]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: errorPayload,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("should publish opaque state when publishing error event", async () => {
        // Arrange
        const payload: PartyQueryReceivedEvtPayload = {
            partyId: "1",
            partyType: "type",
            requesterFspId: "2",
            destinationFspId: null,
            currency: null,
            partySubType: null,
        };

        const message: IMessage = {
            fspiopOpaqueState: {
                fake: "fake opaque state",
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
        await aggregate.handleAccountLookUpEventBatch([message]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                fspiopOpaqueState: {
                    fake: "fake opaque state",
                },
            })])
        );
    });

    //#endregion

    //#region PartyQuery
    test("PartyQuery - should send InvalidRequesterParticipantErrorEvent if no requester participant id is provided", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId: null as any,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCInvalidRequesterParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            requesterFspId: null as any,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCInvalidRequesterParticipantErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send InvalidRequesterParticipantErrorEvent if an error occurs when fetching requester participant from participant service for validation", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCInvalidRequesterParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            requesterFspId,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockRejectedValueOnce(new Error("Error"));

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                    payload: responsePayload,
                    msgName: AccountLookupBCInvalidRequesterParticipantErrorEvent.name,
                })]))
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send RequesterParticipantNotFoundErrorEvent if no requester participant is found from participant service for validation", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCRequesterParticipantNotFoundErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.SOURCE_PARTICIPANT_NOT_FOUND,
            requesterFspId,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(null);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCRequesterParticipantNotFoundErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send RequiredRequesterParticipantIdMismatchErrorEvent if returned participant id mismatches the requester id", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const fakeParticipantId = "fake participant id";

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCInvalidRequesterParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.REQUIRED_SOURCE_PARTICIPANT_ID_MISMATCH,
            requesterFspId,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: fakeParticipantId,
            type: partyType,
            isActive: true,
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCRequiredRequesterParticipantIdMismatchErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send RequiredRequesterParticipantIsNotApprovedErrorEvent if returned participant is not approved", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCInvalidRequesterParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.REQUIRED_SOURCE_PARTICIPANT_NOT_APPROVED,
            requesterFspId,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: false
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCRequiredRequesterParticipantIsNotApprovedErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send RequiredRequesterParticipantIsNotActiveErrorEvent if returned participant is not active", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCInvalidRequesterParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.REQUIRED_SOURCE_PARTICIPANT_NOT_ACTIVE,
            requesterFspId,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: false,
            approved: true
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCRequiredRequesterParticipantIsNotActiveErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send UnableToGetParticipantFromOracleErrorPayload if oracle finder is unable to get an oracle to search the destination fspId", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_GET_PARTICIPANT_FROM_ORACLE,
            currency: "USD",
            partyId,
            partySubType,
            partyType,
        };

        const event = new PartyQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: true
        } as IParticipant as any);
        jest.spyOn(oracleFinder, "getOracle").mockResolvedValueOnce(null);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookUpUnableToGetParticipantFromOracleErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send UnableToGetParticipantFromOracleErrorPayload if oracle finder throws error when searching for destination fspId", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_GET_PARTICIPANT_FROM_ORACLE,
            currency: "USD",
            partyId,
            partySubType,
            partyType,
        };

        const event = new PartyQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: true
        } as IParticipant as any);
        jest.spyOn(oracleFinder, "getOracle").mockRejectedValueOnce(new Error("Error"));

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookUpUnableToGetParticipantFromOracleErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send UnableToGetParticipantFromOracleErrorPayload if oracle finder doesn't find a oracle when searching for destination fspId", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_GET_PARTICIPANT_FROM_ORACLE,
            currency: "USD",
            partyId,
            partySubType,
            partyType,
        };

        const event = new PartyQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: true
        } as IParticipant as any);
        jest.spyOn(oracleFinder, "getOracle").mockResolvedValueOnce(null);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookUpUnableToGetParticipantFromOracleErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send UnableToGetParticipantFromOracleErrorPayload if oracle finder returns a oracle that don't belong to the adapters array", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const fakeOracleId = "fake oracle id";

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_GET_PARTICIPANT_FROM_ORACLE,
            currency: "USD",
            partyId,
            partySubType,
            partyType,
        };

        const event = new PartyQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: true
        } as IParticipant as any);
        jest.spyOn(oracleFinder, "getOracle").mockResolvedValueOnce({
            id: fakeOracleId,
            type: "builtin",
            currency: "USD",
            endpoint: "http://oracle.com",
            name: "oracle",
            partyType,
        });

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookUpUnableToGetParticipantFromOracleErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send UnableToGetParticipantFromOracleErrorPayload if oracle throws error when getting a participant", async () => {
        //Arrange
        const partyType = mockedPartyTypes[3];
        const partySubType = mockedPartySubTypes[3];
        const partyId = mockedPartyIds[3];
        const requesterFspId = mockedParticipantIds[3];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "EUR",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_GET_PARTICIPANT_FROM_ORACLE,
            currency: "EUR",
            partyId,
            partySubType,
            partyType,
        };

        const event = new PartyQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: true
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookUpUnableToGetParticipantFromOracleErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send UnableToGetParticipantFromOracleErrorPayload if oracle doesn't have a participant associated", async () => {
        //Arrange
        const partyType = mockedPartyTypes[4];
        const partySubType = mockedPartySubTypes[4];
        const partyId = mockedPartyIds[4];
        const requesterFspId = mockedParticipantIds[4];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_GET_PARTICIPANT_FROM_ORACLE,
            currency: "USD",
            partyId,
            partySubType,
            partyType,
        };

        const event = new PartyQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: true
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookUpUnableToGetParticipantFromOracleErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send InvalidDestinationParticipantErrorEvent if an error occurs when fetching destination participant for validation", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const expectedDestinationFspId = mockedParticipantFspIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCInvalidDestinationParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
            destinationFspId: expectedDestinationFspId,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest
            .spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: partyType,
                isActive: true,
                approved: true
            } as IParticipant as any)
            .mockRejectedValueOnce(new Error("Error"));

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCInvalidDestinationParticipantErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send InvalidDestinationParticipantErrorEvent if no destination participant is found from participant service for validation", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const expectedDestinationFspId = mockedParticipantFspIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCDestinationParticipantNotFoundErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.DESTINATION_PARTICIPANT_NOT_FOUND,
            destinationFspId: expectedDestinationFspId,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest
            .spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: partyType,
                isActive: true,
                approved: true
            } as IParticipant as any)
            .mockResolvedValueOnce(null);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCDestinationParticipantNotFoundErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyQuery - should send RequiredDestinationParticipantIdMismatchErrorEvent if returned participant id mismatches the destination id", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const expectedDestinationFspId = mockedParticipantFspIds[0];
        const fakeDestinationFspId = "fake destination fsp id";

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCRequiredDestinationParticipantIdMismatchErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.REQUIRED_DESTINATION_PARTICIPANT_ID_MISMATCH,
            destinationFspId: expectedDestinationFspId,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest
            .spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: partyType,
                isActive: true,
                approved: true,
            } as IParticipant as any)
            .mockResolvedValueOnce({
                id: fakeDestinationFspId,
                type: partyType,
                isActive: true,
            } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCRequiredDestinationParticipantIdMismatchErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });


    test("PartyQuery - should send RequiredDestinationParticipantIsNotApprovedErrorEvent if returned participant is not approved", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const expectedDestinationFspId = mockedParticipantFspIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCRequiredDestinationParticipantIsNotApprovedErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.REQUIRED_DESTINATION_PARTICIPANT_NOT_APPROVED,
            destinationFspId: expectedDestinationFspId,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest
            .spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: partyType,
                isActive: true,
                approved: true,
            } as IParticipant as any)
            .mockResolvedValueOnce({
                id: expectedDestinationFspId,
                type: partyType,
                isActive: true,
                approved: false
            } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCRequiredDestinationParticipantIsNotApprovedErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });


    test("PartyQuery - should send RequiredDestinationParticipantIsNotActiveErrorEvent if returned participant is not active", async () => {
        // Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const requesterFspId = mockedParticipantIds[0];
        const expectedDestinationFspId = mockedParticipantFspIds[0];

        const payload: PartyQueryReceivedEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            destinationFspId: null,
        };

        const responsePayload: AccountLookupBCRequiredDestinationParticipantIsNotActiveErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.REQUIRED_DESTINATION_PARTICIPANT_NOT_ACTIVE,
            destinationFspId: expectedDestinationFspId,
            partyId,
            partySubType,
            partyType,
        };
        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest
            .spyOn(participantService, "getParticipantInfo")
            .mockResolvedValueOnce({
                id: requesterFspId,
                type: partyType,
                isActive: true,
                approved: true,
            } as IParticipant as any)
            .mockResolvedValueOnce({
                id: expectedDestinationFspId,
                type: partyType,
                isActive: false,
                approved: true
            } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCRequiredDestinationParticipantIsNotActiveErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });
    //#endregion PartyQuery

    //#region PartyInfoAvailable
    test("PartyInfoAvailable - should send InvalidRequesterParticipantErrorEvent if no requester participant id is provided", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const ownerFspId = mockedParticipantIds[0];
        const destinationFspId = mockedParticipantFspIds[0];

        const payload: PartyInfoAvailableEvtPayload = {
            partyId,
            partyType,
            requesterFspId: null as any,
            currency: "USD",
            partySubType,
            ownerFspId,
            firstName: "John",
            lastName: "Doe",
            middleName: "Middle",
            merchantClassificationCode: "4321",
            partyDoB: new Date(),
            name: "John Doe",
            destinationFspId,
            extensionList: null,
            supportedCurrencies: null,
            kycInfo: null,
        };

        const responsePayload: AccountLookupBCInvalidRequesterParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            requesterFspId: null as any,
            partyId,
            partySubType,
            partyType,
        };
        const event = new PartyInfoAvailableEvt(payload);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCInvalidRequesterParticipantErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("PartyInfoAvailable - should send InvalidDestinationParticipantErrorEvent if no destination participant id is provided", async () => {
        //Arrange
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const partyId = mockedPartyIds[0];
        const ownerFspId = mockedParticipantIds[0];
        const requesterFspId = mockedParticipantFspIds[0];

        const payload: PartyInfoAvailableEvtPayload = {
            partyId,
            partyType,
            requesterFspId,
            currency: "USD",
            partySubType,
            ownerFspId,
            firstName: "John",
            lastName: "Doe",
            middleName: "Middle",
            merchantClassificationCode: "4321",
            partyDoB: new Date(),
            name: "John Doe",
            destinationFspId: null as any,
            extensionList: null,
            supportedCurrencies: null,
            kycInfo: null,
        };

        const responsePayload: AccountLookupBCInvalidDestinationParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
            destinationFspId: null as any,
            partyId,
            partySubType,
            partyType,
        };
        const event = new PartyInfoAvailableEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: true
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCInvalidDestinationParticipantErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });
    //#endregion PartyInfoAvailable

    //#region ParticipantQuery
    test("ParticipantQuery - should send InvalidRequesterParticipantErrorEvent if no requester participant id is provided", async () => {
        //Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const currency = "USD";
        const payload: ParticipantQueryReceivedEvtPayload = {
            currency,
            partyId,
            partySubType,
            partyType,
            requesterFspId: null as any,
        };

        const responsePayload: AccountLookupBCInvalidRequesterParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            partyId,
            partySubType,
            partyType,
            requesterFspId: null as any,
        };

        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCInvalidRequesterParticipantErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("ParticipantQuery - should send UnableToGetParticipantFromOracleError if couldnt fetch the owner fspId from oracle", async () => {
        //Arrange
        const partyId = mockedPartyIds[3];
        const partyType = mockedPartyTypes[3];
        const partySubType = mockedPartySubTypes[3];
        const requesterFspId = mockedParticipantIds[3];
        const currency = "EUR";
        const payload: ParticipantQueryReceivedEvtPayload = {
            currency,
            partyId,
            partySubType,
            partyType,
            requesterFspId,
        };

        const responsePayload: AccountLookUpUnableToGetParticipantFromOracleErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_GET_PARTICIPANT_FROM_ORACLE,
            partyId,
            partySubType,
            partyType,
            currency,
        };

        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: true
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookUpUnableToGetParticipantFromOracleErrorEvent.name,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    test("ParticipantQuery - should send DestinationParticipantNotFoundErrorEvent if owner id doesn't exist on participant service", async () => {
        //Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const requesterFspId = mockedParticipantIds[0];
        const ownerFspId = mockedParticipantFspIds[0];
        const currency = "USD";
        const payload: ParticipantQueryReceivedEvtPayload = {
            currency,
            partyId,
            partySubType,
            partyType,
            requesterFspId,
        };

        const responsePayload: AccountLookupBCDestinationParticipantNotFoundErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.DESTINATION_PARTICIPANT_NOT_FOUND,
            partyId,
            partySubType,
            partyType,
            destinationFspId: ownerFspId,
        };

        const event = new ParticipantQueryReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: true
        } as IParticipant as any);
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce(null);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                msgName: AccountLookupBCDestinationParticipantNotFoundErrorEvent.name,
                payload: responsePayload,
            })])
        );
        expect(messageProducer.send).toBeCalledTimes(1);
    });

    //#endregion ParticipantQuery

    //#region PartyQueryRejected
    test("PartyQueryRejected - should send InvalidRequesterParticipantErrorEvent if no requester participant id is provided", async () => {
        //Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const destinationFspId = mockedParticipantFspIds[0];
        const currency = "USD";
        const payload: GetPartyQueryRejectedEvtPayload = {
            currency,
            partyId,
            partySubType,
            partyType,
            destinationFspId: destinationFspId,
            requesterFspId: null as any,
            errorInformation: {
                errorCode: "3200",
                errorDescription: "Generic party error",
                extensionList: null,
            },
        };

        const responsePayload: AccountLookupBCInvalidRequesterParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            partyId,
            partySubType,
            partyType,
            requesterFspId: null as any,
        };

        const event = new GetPartyQueryRejectedEvt(payload);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledTimes(1);
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCInvalidRequesterParticipantErrorEvent.name,
            })])
        );
    });

    test("PartyQueryRejected - should send InvalidDestinationParticipantErrorEvent if no destination participant id is provided", async () => {
        //Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];
        const partySubType = mockedPartySubTypes[0];
        const requesterFspId = mockedParticipantFspIds[0];
        const currency = "USD";
        const payload: GetPartyQueryRejectedEvtPayload = {
            currency,
            partyId,
            partySubType,
            partyType,
            destinationFspId: null as any,
            requesterFspId,
            errorInformation: {
                errorCode: "3200",
                errorDescription: "Generic party error",
                extensionList: null,
            },
        };

        const responsePayload: AccountLookupBCInvalidDestinationParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.INVALID_DESTINATION_PARTICIPANT,
            partyId,
            partySubType,
            partyType,
            destinationFspId: null as any,
        };

        const event = new GetPartyQueryRejectedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: requesterFspId,
            type: partyType,
            isActive: true,
            approved: true
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledTimes(1);
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCInvalidDestinationParticipantErrorEvent.name,
            })])
        );
    });

    //#endregion

    //#region handleParticipantAssociationRequestReceivedEvt
    test("handleParticipantAssociationRequestReceivedEvt - should send InvalidRequesterParticipantErrorEvent if no requester participant id is provided", async () => {
        // Arrange
        const payload: ParticipantAssociationRequestReceivedEvtPayload = {
            ownerFspId: null as any,
            currency: "USD",
            partyId: mockedPartyIds[0],
            partySubType: mockedPartySubTypes[0],
            partyType: mockedPartyTypes[0],
        };

        const responsePayload: AccountLookupBCInvalidRequesterParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            partyId: mockedPartyIds[0],
            partySubType: mockedPartySubTypes[0],
            partyType: mockedPartyTypes[0],
            requesterFspId: null as any,
        };

        const event = new ParticipantAssociationRequestReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledTimes(1);
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCInvalidRequesterParticipantErrorEvent.name,
            })])
        );
    });

    test("handleParticipantAssociationRequestReceivedEvt - should send UnableToGetOracleAdapterErrorEvent if couldnt get the oracle adapter", async () => {
        // Arrange
        const payload: ParticipantAssociationRequestReceivedEvtPayload = {
            ownerFspId: mockedParticipantFspIds[0],
            currency: "BAD_CURRENCY",
            partyId: mockedPartyIds[0],
            partySubType: mockedPartySubTypes[0],
            partyType: mockedPartyTypes[0],
        };

        const responsePayload: AccountLookupBCUnableToGetOracleAdapterErrorPayload = {
            currency: "BAD_CURRENCY",
            partyId: mockedPartyIds[0],
            partyType: mockedPartyTypes[0],
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_GET_ORACLE_ADAPTER,
        };

        const event = new ParticipantAssociationRequestReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: mockedParticipantFspIds[0],
            type: mockedPartyTypes[0],
            isActive: true,
            approved: true
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledTimes(1);
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCUnableToGetOracleAdapterErrorEvent.name,
            })])
        );
    });

    test("handleParticipantAssociationRequestReceivedEvt - should send UnableToAssociateParticipantErrorEvent if is unable to associate party to participant", async () => {
        // Arrange
        const payload: ParticipantAssociationRequestReceivedEvtPayload = {
            ownerFspId: mockedParticipantFspIds[3],
            currency: "EUR",
            partyId: mockedPartyIds[3],
            partySubType: mockedPartySubTypes[3],
            partyType: mockedPartyTypes[3],
        };

        const responsePayload: AccountLookupBCUnableToAssociateParticipantErrorPayload = {
            currency: "EUR",
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_ASSOCIATE_PARTICIPANT,
            partyId: mockedPartyIds[3],
            partyType: mockedPartyTypes[3],
            fspIdToAssociate: mockedParticipantFspIds[3],
        };

        const event = new ParticipantAssociationRequestReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: mockedParticipantFspIds[3],
            type: mockedPartyTypes[3],
            isActive: true,
            approved: true
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledTimes(1);
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCUnableToAssociateParticipantErrorEvent.name,
            })])
        );
    });
    //#endregion

    //#region handleParticipantDisassociationRequestReceivedEvt
    test("handleParticipantDisassociationRequestReceivedEvt - should send InvalidRequesterParticipantErrorEvent if no requester participant id is provided", async () => {
        // Arrange
        const payload: ParticipantDisassociateRequestReceivedEvtPayload = {
            ownerFspId: null as any,
            currency: "USD",
            partyId: mockedPartyIds[0],
            partySubType: mockedPartySubTypes[0],
            partyType: mockedPartyTypes[0],
        };

        const responsePayload: AccountLookupBCInvalidRequesterParticipantErrorPayload = {
            errorCode: AccountLookupErrorCodeNames.INVALID_SOURCE_PARTICIPANT,
            partyId: mockedPartyIds[0],
            partySubType: mockedPartySubTypes[0],
            partyType: mockedPartyTypes[0],
            requesterFspId: null as any,
        };

        const event = new ParticipantDisassociateRequestReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledTimes(1);
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCInvalidRequesterParticipantErrorEvent.name,
            })])
        );
    });

    test("handleParticipantDisassociationRequestReceivedEvt - should send UnableToGetOracleAdapterErrorEvent if couldnt get the oracle adapter", async () => {
        // Arrange
        const payload: ParticipantDisassociateRequestReceivedEvtPayload = {
            ownerFspId: mockedParticipantFspIds[0],
            currency: "BAD_CURRENCY",
            partyId: mockedPartyIds[0],
            partySubType: mockedPartySubTypes[0],
            partyType: mockedPartyTypes[0],
        };

        const responsePayload: AccountLookupBCUnableToGetOracleAdapterErrorPayload = {
            currency: "BAD_CURRENCY",
            partyId: mockedPartyIds[0],
            partyType: mockedPartyTypes[0],
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_GET_ORACLE_ADAPTER,
        };

        const event = new ParticipantDisassociateRequestReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: mockedParticipantFspIds[0],
            type: mockedPartyTypes[0],
            isActive: true,
            approved: true
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledTimes(1);
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCUnableToGetOracleAdapterErrorEvent.name,
            })])
        );
    });

    test("handleParticipantDisassociationRequestReceivedEvt - should send UnableToDisassociateParticipantErrorEvent if is unable to associate party to participant", async () => {
        // Arrange
        const payload: ParticipantDisassociateRequestReceivedEvtPayload = {
            ownerFspId: mockedParticipantFspIds[3],
            currency: "EUR",
            partyId: mockedPartyIds[3],
            partySubType: mockedPartySubTypes[3],
            partyType: mockedPartyTypes[3],
        };

        const responsePayload: AccountLookupBCUnableToDisassociateParticipantErrorPayload = {
            currency: "EUR",
            errorCode: AccountLookupErrorCodeNames.UNABLE_TO_DISASSOCIATE_PARTICIPANT,
            partyId: mockedPartyIds[3],
            partyType: mockedPartyTypes[3],
            fspIdToDisassociate: mockedParticipantFspIds[3],
        };

        const event = new ParticipantDisassociateRequestReceivedEvt(payload);

        jest.spyOn(messageProducer, "send");
        jest.spyOn(participantService, "getParticipantInfo").mockResolvedValueOnce({
            id: mockedParticipantFspIds[3],
            type: mockedPartyTypes[3],
            isActive: true,
            approved: true
        } as IParticipant as any);

        // Act
        await aggregate.handleAccountLookUpEventBatch([event]);

        // Assert
        expect(messageProducer.send).toHaveBeenCalledTimes(1);
        expect(messageProducer.send).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({
                payload: responsePayload,
                msgName: AccountLookupBCUnableToDisassociateParticipantErrorEvent.name,
            })])
        );
    });
    //#endregion
});
