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

import {AccountLookupAggregate, Oracle, ParticipantLookup,} from "../../src";
import {IMessage, MessageTypes} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {IMetrics, MetricsMock} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {
    MemoryOracleProviderAdapter,
    mockedOracleAdapters,
    mockedParticipantFspIds,
    mockedParticipantIds,
    mockedPartyIds,
    mockedPartyTypes
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import {
    PartyInfoRequestedEvtPayload,
    PartyQueryReceivedEvt,
    PartyQueryReceivedEvtPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {
    logger,
    messageProducer,
    oracleFinder,
    oracleProviderFactory,
    participantService
} from "../utils/mocked_variables";

import {IParticipant} from "@mojaloop/participant-bc-public-types-lib";

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


    test("getAccountLookUp - should return null if its unable to get an oracle", async () => {
        // Arrange
        const accountLookupRequest : ParticipantLookup = {
            currency: "USD",
            partyId: "123456789",
            partyType: "DFSP",
        }

        // Act
       const result = aggregate.getAccountLookUp(accountLookupRequest);

       // Assert
       await expect(result).rejects.toThrowError();
    });

    test("getAccountLookUp - should throw error if its unable to get an oracle due to error", async () => {
        // Arrange
        const accountLookupRequest : ParticipantLookup = {
            currency: "USD",
            partyId: "123456789",
            partyType: "DFSP",
        };

        jest.spyOn(oracleFinder, "getOracle").mockImplementationOnce(() => {
            throw new Error("Error");
        });

        // Act
        const result = aggregate.getAccountLookUp(accountLookupRequest);

        // Assert
        await expect(result).rejects.toThrowError();

    });


    test("getAccountLookUp - should throw error if couldnt get a fspId", async () => {
        // Arrange
        const accountLookupRequest : ParticipantLookup = {
            currency: "USD",
            partyId: mockedPartyIds[1],
            partyType: mockedPartyTypes[2],
        };

        // Act
        const result = aggregate.getAccountLookUp(accountLookupRequest);

        // Assert
        await expect(result).rejects.toThrowError();
    });

    test("getAccountLookUp - should return fspId", async () => {
        // Arrange
        const accountLookupRequest : ParticipantLookup = {
            currency: "USD",
            partyId: mockedPartyIds[0],
            partyType: mockedPartyTypes[0],
        };
        // Act
        const result = await aggregate.getAccountLookUp(accountLookupRequest);

        // Assert
        expect(result).toBe(mockedParticipantFspIds[0]);
    });

});

