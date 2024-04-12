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

import request from "supertest";
import {
  MemoryOracleFinder,
  MemoryMessageProducer,
  MemoryOracleProviderFactory,
  MemoryMessageConsumer,
  MemoryParticipantService,
  MemoryAuthenticatedHttpRequesterMock,
  mockedPartyIds,
  mockedPartyTypes,
  mockedParticipantFspIds,
  mockedPartySubTypes,
  MemoryAuthorizationClient,
  MemoryTokenHelper,
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import {
  IOracleFinder,
  IOracleProviderFactory,
  IParticipantServiceAdapter,
} from "@mojaloop/account-lookup-bc-domain-lib";
import { IMessageConsumer, IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { CallSecurityContext, IAuthenticatedHttpRequester, IAuthorizationClient, ITokenHelper } from "@mojaloop/security-bc-public-types-lib";
import { Service } from "../../src/service";
import { IMetrics, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer: IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService: IParticipantServiceAdapter = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const mockedAuthRequester: IAuthenticatedHttpRequester = new MemoryAuthenticatedHttpRequesterMock(logger, "fake token");

const mockedMetrics: IMetrics = new MetricsMock();

const mockedAuthorizationClient: IAuthorizationClient = new MemoryAuthorizationClient(logger);

const mockedTokenHelper: ITokenHelper = new MemoryTokenHelper(logger);

const serverBaseUrl = (process.env["ACCOUNT_LOOKUP_URL"] || "http://localhost:3030") + "/account-lookup";

const CURRENCY = {
	USD: "USD",
	EUR: "EUR",
};

const accessToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkR1RVNzRFdmb2JjRURQODR4c2hjU2sxUFJsMnMwMUN0RW9ibkNoRUVFT2cifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbImh1Yl9vcGVyYXRvciJdLCJpYXQiOjE2OTgwMjEwNTksImV4cCI6MTY5ODYyNTg1OSwiYXVkIjoibW9qYWxvb3Audm5leHQuZGV2LmRlZmF1bHRfYXVkaWVuY2UiLCJpc3MiOiJtb2phbG9vcC52bmV4dC5kZXYuZGVmYXVsdF9pc3N1ZXIiLCJzdWIiOiJ1c2VyOjp1c2VyIiwianRpIjoiYzFkNjdkMTEtYzExNS00MTU0LTlmZDEtZThlNDI5M2E3YjFkIn0.QK6QVblcaKldvdbCH6sWSa7kqrOjJ1urWcp6dyMWo0Ln7Faq29bPE4t4Mcd-WQVhO3a1sE-YhBrcpUNI0YCbbS5rRdI1SRqnCMWv3g9vyDKEnIFFu_6LM7K1Ct_JGpT4fP4KMVnT03mMeobIESbVu8Ep1zSfLWv2TAB4EzZUlh-HeJMDaUj8ESM91PdXmCHieM1br3JLwuy2WSxMJSbjYrH1G68TW38U4CPBTyhRwiwlB8Ro5MTjHqdH8EQC7A_E4iwwe-GkuoP63qOSPA0ZZ0O7Ry-dRhyips_S3cSjGWAgwXDyylh5Q4OjAtTpD1di1bm2uj1lXXkFC3cDQiV94Q";

const securityContext:CallSecurityContext = {
	"accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkR1RVNzRFdmb2JjRURQODR4c2hjU2sxUFJsMnMwMUN0RW9ibkNoRUVFT2cifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbImFkbWluIl0sImlhdCI6MTY5ODE1NDUzNSwiZXhwIjoxNjk4NzU5MzM1LCJhdWQiOiJtb2phbG9vcC52bmV4dC5kZXYuZGVmYXVsdF9hdWRpZW5jZSIsImlzcyI6Im1vamFsb29wLnZuZXh0LmRldi5kZWZhdWx0X2lzc3VlciIsInN1YiI6InVzZXI6OmFkbWluIiwianRpIjoiZTg1MGY1NmItMDM2Yi00YTE0LWI5ZjUtNWUyZWM1NzFlMjdmIn0.kkdTEy1ISNu_nwHRpwg0iaK1aWPfMChZF1Lpbkne5LackYGXCnjnIY5Xt2fY0pJK2awEbduxPM7RWLKoZcKbw_9Vq63OupFqqr8s69q3EjLMZLSeGMTVVNWWEKKm16NM1LSD_z7Em7RcgeQFMcEtU2tOZvFpnvZpXk_-r-mL7AuYAy2ZVI05F0SMczInVAg_3s13yPs_oEPa-zeY9q-nU0d-pvNm7f0USZpZYULjcTmUkdNiM_rZsjdJxI4vrTmumTdts5JV7Qirt4Jk-kf-sFKRpnwQ_ORosBrQiW_B8usqqQb3qWkS4wXOgxnUMqoTneJzXHy_2L4AeDcrS_r6Dw",
	"clientId": "1",
	"platformRoleIds": ["2"],
	"username": "admin"
}

describe("Account Lookup Routes - Unit Test", () => {
	beforeAll(async () => {
		await Service.start(
			logger,
			mockedConsumer,
			mockedProducer,
			mockedOracleFinder,
			mockedOracleProviderFactory,
			mockedAuthRequester,
			mockedParticipantService,
			mockedMetrics,
			mockedAuthorizationClient,
			mockedTokenHelper
		);
	});

	afterAll(async () => {
		await Service.stop();
	});

	test("GET - should fetch fspId for partyId and partyType and partySubType", async () => {
		// Arrange
		const partyId = mockedPartyIds[0];
		const partyType = mockedPartyTypes[0];

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.get(`/${partyType}/${partyId}?currency=USD`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(200);
        expect(response.body?.fspId).toEqual(mockedParticipantFspIds[0]);
	});

	test("GET - should receive 404 when fsp id not found", async () => {
		// Arrange
		const partyId = mockedPartyIds[4];
		const partyType = mockedPartyTypes[4];

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.get(`/${partyType}/${partyId}?currency=USD`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(404);
	});

	test("GET - should fetch fspId for partyId ,partyType, partySubType and currency", async () => {
		// Arrange
		const partyId = mockedPartyIds[0];
		const partyType = mockedPartyTypes[0];
		const partySubType = mockedPartySubTypes[0];
		const currency = CURRENCY.USD;

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.get(`/${partyType}/${partyId}?currency=${currency}&partySubType=${partySubType}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(200);
        expect(response.body?.fspId).toEqual(mockedParticipantFspIds[0]);
	});

	test("GET - should get not found when url is invalid", async () => {
		// Arrange
		const partyId = "";
		const partyType = mockedPartyTypes[2];

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.get(`/${partyType}/${partyId}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(404);
	});

	test("GET - should throw a 500 when the request got wrong on server", async () => {
		// Arrange
		const partyId = mockedPartyIds[3];
		const partyType = mockedPartyTypes[3];

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.get(`/${partyType}/${partyId}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(500);
	});
});
