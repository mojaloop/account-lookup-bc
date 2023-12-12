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

import { AccountLookupAggregate, Oracle, ParticipantLookup } from "../../src";
import {
	GetPartyQueryRejectedEvt,
	GetPartyQueryRejectedEvtPayload,
	GetPartyQueryRejectedResponseEvt,
	GetPartyQueryRejectedResponseEvtPayload,
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
import { IMessage, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IMetrics, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";
import {
	MemoryOracleProviderAdapter,
	mockedOracleAdapters,
	mockedParticipantFspIds,
	mockedParticipantIds,
	mockedPartyIds,
	mockedPartySubTypes,
	mockedPartyTypes
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import {
	logger,
	messageProducer,
	oracleFinder,
	oracleProviderFactory,
	participantService
} from "../utils/mocked_variables";

import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";

let aggregate: AccountLookupAggregate;

describe("Domain - Unit Tests Events for Account Lookup Aggregate", () => {
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
	});

	afterEach(async () => {
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		jest.clearAllMocks();
	});

	//#region Init and Destroy
	test("should throw error if couldnt init oracle finder on init", async () => {
		// Arrange
		jest.spyOn(oracleFinder, "init").mockImplementation(() => {
			throw new Error();
		});

		// Act && Assert

		await expect(aggregate.init()).rejects.toThrowError();
	});

	test("should throw error if couldnt create oracle adapter on init", async () => {
		// Arrange
		jest.spyOn(oracleProviderFactory, "create").mockImplementationOnce(() => {
		throw new Error("Not supported oracle");
		});

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
		};
		const oracleAdapters = aggregate.oracleProvidersAdapters;
		oracleAdapters.push(new MemoryOracleProviderAdapter(logger, mockedOracle));

		// Act
		const oracleAdaptersAfterPush = aggregate.oracleProvidersAdapters;

		// Assert
		expect(oracleAdaptersAfterPush.length).toBe(expectedArrayLength);
	});

	test("should throw error if couldnt destroy aggregate", async () => {
		// Arrange
		jest.spyOn(oracleFinder, "destroy").mockImplementationOnce(() => {
		throw new Error();
		});

		// Act && Assert
		await expect(aggregate.destroy()).rejects.toThrowError();
	});

	test("should be able to destroy aggregate", async () => {
		// Act && Assert
		expect(aggregate.destroy()).resolves;
	});

	//#endregion

	//#region Publish Event

	test("should publish opaque state when publishing successful event", async () => {
		// Arrange
		const partyType = mockedPartyTypes[0];
		const partyId = mockedPartyIds[0];
		const requesterFspId = mockedParticipantIds[0];
		const destinationFspId = "destinationFspId";
		const payload: PartyQueryReceivedEvtPayload = {
		partyId,
		partyType,
		requesterFspId,
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
		payload: payload,
		};

		const responsePayload: PartyInfoRequestedEvtPayload = {
		partyId,
		partyType,
		requesterFspId,
		destinationFspId,
		currency: null,
		partySubType: null,
		};

		jest
		.spyOn(participantService, "getParticipantInfo")
		.mockResolvedValueOnce({ id: requesterFspId, type: partyType, isActive: true, approved: true } as IParticipant as any)
		.mockResolvedValueOnce({ id: destinationFspId, type: partyType, isActive: true, approved: true } as IParticipant as any);

		jest.spyOn(messageProducer, "send");

		// Act
		await aggregate.handleAccountLookUpEvent(message);

		// Assert
		expect(messageProducer.send).toHaveBeenCalledWith(
			expect.objectContaining({
				fspiopOpaqueState: "fake opaque state",
				payload: responsePayload
			})
		);
	});
	//#endregion

	//#region handlePartyQueryReceivedEvt
	test("handlePartyQueryReceivedEvt - should publish response with PartyInfoRequestedEvt", async () => {
		//Arrange
		const partyType = mockedPartyTypes[0];
		const partyId = mockedPartyIds[0];
		const requesterFspId = mockedParticipantIds[0];
		const destinationFspId = "destinationFspId";
		const partySubType = mockedPartySubTypes[0];
		const payload: PartyQueryReceivedEvtPayload = {
			partyId,
			partyType,
			requesterFspId,
			destinationFspId,
			currency: "USD",
			partySubType: partySubType
		};

		jest.spyOn(messageProducer, "send");
		jest.spyOn(participantService, "getParticipantInfo")
			.mockResolvedValueOnce({ id: requesterFspId, type: "DFSP", isActive: true, approved: true } as IParticipant as any)
			.mockResolvedValueOnce({ id: destinationFspId, type: "HUB", isActive: true, approved: true } as IParticipant as any);

		const event = new PartyQueryReceivedEvt(payload);
		const responsePayload: PartyInfoRequestedEvtPayload = {
			partyId,
			partyType,
			requesterFspId,
			destinationFspId,
			currency: "USD",
			partySubType: partySubType,
		};

		// Act
		await aggregate.handleAccountLookUpEvent(event);

		// Assert
		expect(messageProducer.send).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: responsePayload,
			})
		);
	});

	test("handlePartyQueryReceivedEvt - should get destination fspId from oracle if none is provided", async () => {
		//Arrange
		const partyType = mockedPartyTypes[0];
		const partyId = mockedPartyIds[0];
		const requesterFspId = mockedParticipantIds[0];
		const partySubType = mockedPartySubTypes[0];
		const destinationFspIdFromOracle = mockedParticipantFspIds[0];
		const payload: PartyQueryReceivedEvtPayload = {
			partyId,
			partyType,
			requesterFspId,
			destinationFspId: null,
			currency: "USD",
			partySubType: partySubType
		};

		jest.spyOn(messageProducer, "send");
		jest.spyOn(participantService, "getParticipantInfo")
			.mockResolvedValueOnce({ id: requesterFspId, isActive: true, approved: true } as IParticipant as any);
		jest.spyOn(participantService, "getParticipantInfo")
			.mockResolvedValueOnce({ id: destinationFspIdFromOracle, isActive: true, approved: true } as IParticipant as any);

		const event = new PartyQueryReceivedEvt(payload);
		const responsePayload: PartyInfoRequestedEvtPayload = {
			partyId,
			partyType,
			requesterFspId,
			destinationFspId: destinationFspIdFromOracle,
			currency: "USD",
			partySubType: partySubType
		};

		// Act
		await aggregate.handleAccountLookUpEvent(event);

		// Assert
		expect(messageProducer.send).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: responsePayload,
			})
		);
	});
	//#endregion

	//#region handlePartyInfoAvailableEvt
	test("handlePartyInfoAvailableEvt - should publish event with party info requested", async () => {
		//Arrange
		const partyType = mockedPartyTypes[0];
		const partyId = mockedPartyIds[0];
		const requesterFspId = mockedParticipantIds[0];
		const partyDoB = new Date();
		const payload: PartyInfoAvailableEvtPayload = {
			partyId,
			partyType,
			requesterFspId,
			destinationFspId: "2",
			currency: null,
			partySubType: null,
			ownerFspId: "ownerId",
			partyDoB,
			merchantClassificationCode: "18",
			name: "name",
			firstName: "Maria",
			middleName: "P",
			lastName: "Lee",
			extensionList: null
		};

		jest.spyOn(participantService, "getParticipantInfo")
			.mockResolvedValueOnce({ id: requesterFspId, type: "HUB", isActive: true, approved: true } as IParticipant as any)
			.mockResolvedValueOnce({ id: "2", type: "HUB", isActive: true, approved: true } as IParticipant as any);
		jest.spyOn(messageProducer, "send");

		const event = new PartyInfoAvailableEvt(payload);
		const responsePayload: PartyQueryResponseEvtPayload = {
			requesterFspId,
			destinationFspId: "2",
			partyType,
			partyId,
			partySubType: null,
			currency: null,
			ownerFspId: "ownerId",
			partyDoB,
			merchantClassificationCode: "18",
			name: "name",
			firstName: "Maria",
			middleName: "P",
			lastName: "Lee",
			extensionList: null
		};

		// Act
		const result = await aggregate.handleAccountLookUpEvent(event);

		// Assert
		expect(messageProducer.send).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: responsePayload,
			})
		);
	});

	//#endregion

	//#region handleParticipantQueryReceivedEvt

	test("handleParticipantQueryReceivedEvt - should publish event with query response", async () => {
		//Arrange
		const partyType = mockedPartyTypes[0];
		const partySubType = mockedPartySubTypes[0];
		const partyId = mockedPartyIds[0];
		const requesterFspId = mockedParticipantIds[0];

		const payload: ParticipantQueryReceivedEvtPayload = {
			partyId,
			partyType,
			requesterFspId,
			currency: "USD",
			partySubType
		};

		const oracleParticipantFspId = mockedParticipantFspIds[0];

		jest.spyOn(participantService, "getParticipantInfo")
			.mockResolvedValueOnce({ id: requesterFspId, type: "DFSP", isActive: true, approved: true } as IParticipant as any)
			.mockResolvedValueOnce({ id: oracleParticipantFspId, type: "DFSP", isActive: true, approved: true } as IParticipant as any);
		jest.spyOn(messageProducer, "send");

		const event = new ParticipantQueryReceivedEvt(payload);
		const responsePayload: ParticipantQueryResponseEvtPayload = {
			requesterFspId,
			partyType,
			partyId,
			partySubType,
			currency: "USD",
			ownerFspId: oracleParticipantFspId
		};

		// Act
		await aggregate.handleAccountLookUpEvent(event);

		// Assert
		expect(messageProducer.send).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: responsePayload,
			})
		);
	});

	//#endregion

	//#region handleParticipantAssociationRequestReceivedEvt
	test("handleParticipantAssociationRequestReceivedEvt - should associate participant and publish message", async () => {
		// Arrange
		const partyType = mockedPartyTypes[0];
		const partySubType = mockedPartySubTypes[0];
		const partyId = mockedPartyIds[0];
		const ownerFspId = mockedParticipantIds[0];

		const payload: ParticipantAssociationRequestReceivedEvtPayload = {
			partyId,
			partyType,
			ownerFspId,
			partySubType,
			currency: "USD"
		};

		jest.spyOn(participantService, "getParticipantInfo")
			.mockResolvedValueOnce({ id: ownerFspId, type: partyType, isActive: true, approved: true } as IParticipant as any);
			
		jest.spyOn(messageProducer, "send");

		const event = new ParticipantAssociationRequestReceivedEvt(payload);

		const expectedPayload: ParticipantAssociationCreatedEvtPayload = {
			partyId,
			partyType,
			ownerFspId,
			partySubType
		};

		// Act
		await aggregate.handleAccountLookUpEvent(event);

		// Assert
		expect(messageProducer.send).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: expectedPayload,
			})
		);
	});
	//#endregion

	//#region handleParticipantDisassociateRequestReceivedEvt
	test("handleParticipantDisassociateRequestReceivedEvt - should disassociate participant and publish message", async () => {
		// Arrange
		const partyType = mockedPartyTypes[0];
		const partySubType = mockedPartySubTypes[0];
		const partyId = mockedPartyIds[0];
		const ownerFspId = mockedParticipantIds[0];

		const payload: ParticipantDisassociateRequestReceivedEvtPayload = {
			partyId,
			partyType,
			ownerFspId,
			partySubType,
			currency: "USD"
		};

		jest.spyOn(participantService, "getParticipantInfo")
			.mockResolvedValueOnce({ id: ownerFspId, type: partyType, isActive: true, approved: true } as IParticipant as any);
		
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
		expect(messageProducer.send).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: expectedPayload,
			})
		);
	});
	//#endregion

	//#region getPartyQueryRejected

	test("getPartyQueryRejected - should publish event with query response", async () => {
		// Arrange
		const partyType = mockedPartyTypes[0];
		const partyId = mockedPartyIds[0];
		const partySubType = mockedPartySubTypes[0];
		const requesterFspId = mockedParticipantIds[0];
		const destinationFspId = "destinationFspId";
		const errorInformation = {
			errorCode: "3200",
			errorDescription: "Generic ID not found",
			extensionList: {
				extension: [
					{
						key: "key1",
						value: "value1",
					}
				]
			}
		};

		const payload: GetPartyQueryRejectedEvtPayload = {
			partyId,
			currency: "USD",
			requesterFspId: requesterFspId,
			destinationFspId,
			partySubType: partySubType,
			partyType,
			errorInformation
		};

		jest.spyOn(participantService, "getParticipantInfo")
			.mockResolvedValueOnce({ id: requesterFspId, type: "DFSP", isActive: true, approved: true } as IParticipant as any)
			.mockResolvedValueOnce({ id: destinationFspId, type: "DFSP", isActive: true, approved: true } as IParticipant as any);

		jest.spyOn(messageProducer, "send");

		const event = new GetPartyQueryRejectedEvt(payload);

		const expectedPayload: GetPartyQueryRejectedResponseEvtPayload = {
			currency: "USD",
			errorInformation,
			partyId,
			partySubType,
			partyType,
		};

		// Act
		await aggregate.handleAccountLookUpEvent(event);

		// Assert
		expect(messageProducer.send).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: expectedPayload,
			})
		);
	});
	//#endregion

	//#region getAccountLookUp
	test("getAccountLookUp - should return null if its unable to get an oracle", async () => {
		// Arrange
		const accountLookupRequest: ParticipantLookup = {
			currency: "USD",
			partyId: "123456789",
			partyType: "DFSP",
			partySubType: null,
		};

		// Act
		const result = aggregate.getAccountLookUp(accountLookupRequest);

		// Assert
		await expect(result).rejects.toThrowError();
	});

	test("getAccountLookUp - should throw error if its unable to get an oracle due to error", async () => {
		// Arrange
		const accountLookupRequest: ParticipantLookup = {
			currency: "USD",
			partyId: "123456789",
			partyType: "DFSP",
			partySubType: null,
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
		const accountLookupRequest: ParticipantLookup = {
			currency: "USD",
			partyId: mockedPartyIds[1],
			partyType: mockedPartyTypes[2],
			partySubType: null,
		};

		// Act
		const result = aggregate.getAccountLookUp(accountLookupRequest);

		// Assert
		await expect(result).rejects.toThrowError();
	});

	test("getAccountLookUp - should return fspId", async () => {
		// Arrange
		const accountLookupRequest: ParticipantLookup = {
			currency: "USD",
			partyId: mockedPartyIds[0],
			partyType: mockedPartyTypes[0],
			partySubType: mockedPartySubTypes[0],
		};
		// Act
		const result = await aggregate.getAccountLookUp(accountLookupRequest);

		// Assert
		expect(result).toBe(mockedParticipantFspIds[0]);
	});

  	//#endregion
});
