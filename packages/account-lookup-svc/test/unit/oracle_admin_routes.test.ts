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
  Association,
  IOracleFinder,
  IOracleProviderFactory,
  IParticipantServiceAdapter,
} from "@mojaloop/account-lookup-bc-domain-lib";
import { Service } from "../../src/service";
import {
  MemoryOracleFinder,
  MemoryMessageProducer,
  MemoryOracleProviderFactory,
  MemoryMessageConsumer,
  MemoryParticipantService,
  MemoryAuthenticatedHttpRequesterMock,
  MemoryAuthorizationClient,
  MemoryTokenHelper,
  mockedOracleAssociations
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { CallSecurityContext, IAuthenticatedHttpRequester, IAuthorizationClient, ITokenHelper } from "@mojaloop/security-bc-public-types-lib";
import { IMetrics, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer: IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService: IParticipantServiceAdapter = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger, true);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const mockedAuthRequester: IAuthenticatedHttpRequester = new MemoryAuthenticatedHttpRequesterMock(logger, "fake token");

const mockedMetrics: IMetrics = new MetricsMock();

const mockedAuthorizationClient: IAuthorizationClient = new MemoryAuthorizationClient(logger);

const mockedTokenHelper: ITokenHelper = new MemoryTokenHelper(logger);

const serverBaseUrl = (process.env["ADMIN_URL"] || "http://localhost:3030") + "/admin";

const accessToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkR1RVNzRFdmb2JjRURQODR4c2hjU2sxUFJsMnMwMUN0RW9ibkNoRUVFT2cifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbImh1Yl9vcGVyYXRvciJdLCJpYXQiOjE2OTgwMjEwNTksImV4cCI6MTY5ODYyNTg1OSwiYXVkIjoibW9qYWxvb3Audm5leHQuZGV2LmRlZmF1bHRfYXVkaWVuY2UiLCJpc3MiOiJtb2phbG9vcC52bmV4dC5kZXYuZGVmYXVsdF9pc3N1ZXIiLCJzdWIiOiJ1c2VyOjp1c2VyIiwianRpIjoiYzFkNjdkMTEtYzExNS00MTU0LTlmZDEtZThlNDI5M2E3YjFkIn0.QK6QVblcaKldvdbCH6sWSa7kqrOjJ1urWcp6dyMWo0Ln7Faq29bPE4t4Mcd-WQVhO3a1sE-YhBrcpUNI0YCbbS5rRdI1SRqnCMWv3g9vyDKEnIFFu_6LM7K1Ct_JGpT4fP4KMVnT03mMeobIESbVu8Ep1zSfLWv2TAB4EzZUlh-HeJMDaUj8ESM91PdXmCHieM1br3JLwuy2WSxMJSbjYrH1G68TW38U4CPBTyhRwiwlB8Ro5MTjHqdH8EQC7A_E4iwwe-GkuoP63qOSPA0ZZ0O7Ry-dRhyips_S3cSjGWAgwXDyylh5Q4OjAtTpD1di1bm2uj1lXXkFC3cDQiV94Q";

const securityContext:CallSecurityContext = {
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkR1RVNzRFdmb2JjRURQODR4c2hjU2sxUFJsMnMwMUN0RW9ibkNoRUVFT2cifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbImFkbWluIl0sImlhdCI6MTY5ODE1NDUzNSwiZXhwIjoxNjk4NzU5MzM1LCJhdWQiOiJtb2phbG9vcC52bmV4dC5kZXYuZGVmYXVsdF9hdWRpZW5jZSIsImlzcyI6Im1vamFsb29wLnZuZXh0LmRldi5kZWZhdWx0X2lzc3VlciIsInN1YiI6InVzZXI6OmFkbWluIiwianRpIjoiZTg1MGY1NmItMDM2Yi00YTE0LWI5ZjUtNWUyZWM1NzFlMjdmIn0.kkdTEy1ISNu_nwHRpwg0iaK1aWPfMChZF1Lpbkne5LackYGXCnjnIY5Xt2fY0pJK2awEbduxPM7RWLKoZcKbw_9Vq63OupFqqr8s69q3EjLMZLSeGMTVVNWWEKKm16NM1LSD_z7Em7RcgeQFMcEtU2tOZvFpnvZpXk_-r-mL7AuYAy2ZVI05F0SMczInVAg_3s13yPs_oEPa-zeY9q-nU0d-pvNm7f0USZpZYULjcTmUkdNiM_rZsjdJxI4vrTmumTdts5JV7Qirt4Jk-kf-sFKRpnwQ_ORosBrQiW_B8usqqQb3qWkS4wXOgxnUMqoTneJzXHy_2L4AeDcrS_r6Dw",
  "clientId": "1",
  "platformRoleIds": ["2"],
  "username": "admin"
}

describe("Oracle Admin Routes - Unit Test", () => {
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

	afterEach(async () => {
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await Service.stop();
		jest.clearAllMocks();
	});

	test("GET - should fetch an array of oracles", async () => {
		// Arrange
		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act 
		const response = await request(serverBaseUrl)
			.get("/oracles")
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(200);
		expect(Array.isArray(response.body)).toEqual(true);
		expect(response.body.length).toBeGreaterThan(0);
	});

	test("GET - should throw 500 if an error occurred while fetching oracles", async () => {
		// Arrange
		jest.spyOn(mockedOracleFinder, "getAllOracles").mockRejectedValueOnce(new Error("Error fetching oracles"));

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);
		
		// Act
		const response = await request(serverBaseUrl)
			.get("/oracles")
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(500);
	});

	test("GET - should fetch an array of builtin oracle associations", async () => {
		// Arrange
		const expectedAssociations = mockedOracleAssociations[0];

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.get("/oracles/builtin-associations")
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(200);
		const associationResponse: Association = response.body[0];
		expect(associationResponse.fspId).toEqual(expectedAssociations.fspId);
		expect(associationResponse.currency).toEqual(expectedAssociations.currency);
		expect(associationResponse.partyId).toEqual(expectedAssociations.partyId);
		expect(associationResponse.partyType).toEqual(expectedAssociations.partyType);
	});

	test("GET - should throw 500 if an error occurred while fetching builtin oracle associations", async () => {
		// Arrange
		jest.spyOn(mockedOracleFinder, "getAllOracles")
			.mockRejectedValueOnce(new Error("Error fetching builtin oracle associations"));
		
		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.get("/oracles/builtin-associations")
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(500);
  	});

  	test("POST - should return an error when an invalid payload is passed", async () => {
		// Arrange
		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl).post("/oracles")
			.send({
				type: "invalid-type",
				name: "oracle msisdn",
				partyType: "MSISDN",
			})
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(422);
  	});

  	test("POST - should add a new oracle", async () => {
		// Arrange
		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);
			
		// Act
		const response = await request(serverBaseUrl)
			.post("/oracles").send({
				type: "builtin",
				name: "oracle msisdn",
				partyType: "MSISDN",
			})
			.set(`Authorization`, `Bearer ${accessToken}`);


		// Assert
		expect(response.status).toBe(200);
		expect(checkIfValidUUID(response.body.id)).toBe(true);
  	});

	test("POST - should throw error if couldn't add the oracle", async () => {
		// Arrange
		jest.spyOn(mockedOracleFinder, "addOracle").mockRejectedValueOnce(new Error("Error adding oracle"));

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.post("/oracles").send({
				type: "builtin",
				name: "oracle msisdn",
				partyType: "MSISDN",
			})		
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(500);
	});

	test("GET - should fetch the recently added oracle by id", async () => {
		// Arrange
		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValue(securityContext);

		const oracles = await request(serverBaseUrl)
			.get("/oracles")
			.set(`Authorization`, `Bearer ${accessToken}`);

		const oracleId = oracles.body[0].id;
		
		// Act
		const response = await request(serverBaseUrl)
			.get(`/oracles/${oracleId}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(200);
		expect(response.body.name).toEqual("oracle1");
		expect(response.body.type).toEqual("builtin");
		expect(response.body.partyType).toEqual("bank");
	});

	test("GET - should return not found error when fetched with non-existent id", async () => {
		// Arrange
		const oracleId = "non-existent-id";

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);
		
		// Act
		const response = await request(serverBaseUrl)
			.get(`/oracles/${oracleId}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(404);
	});

	test("GET - should return health condition of the specified oracle", async () => {
		// Arrange
		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValue(securityContext);

		const oracles = await request(serverBaseUrl)
			.get("/oracles")
			.set(`Authorization`, `Bearer ${accessToken}`);

		const oracleId = oracles.body[0].id;

		// Act
		const response = await request(serverBaseUrl)
			.get(`/oracles/health/${oracleId}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(200);
		expect(response.body).toEqual(true);
	});

	test("GET - should return not found error when health check with non-existent id", async () => {
		// Arrange
		const oracleId = "non-existent-id";

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.get(`/oracles/health/${oracleId}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(404);
	});

	test("GET - should return an error when an invalid payload is passed", async () => {
		// Arrange
		const oracleId = "";

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.get(`/oracles/health/${oracleId}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(404);
	});

	test("DELETE - should delete the specified oracle", async () => {
		// Arrange
		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValue(securityContext);

		const oracles = await request(serverBaseUrl)
			.get("/oracles")
			.set(`Authorization`, `Bearer ${accessToken}`);

		const oracleId = oracles.body[0].id;


		// Act
		const response = await request(serverBaseUrl)
			.delete(`/oracles/${oracleId}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(200);
	});

	test("DELETE - should return not found error when try to delete with non-existence id", async () => {
		// Arrange
		const oracleId = "non-existent-id";

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);
		
		// Act
		const response = await request(serverBaseUrl)
			.delete(`/oracles/${oracleId}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(404);
	});

	test("DELETE - should return an error when an invalid payload is passed", async () => {
		// Arrange
		const oracleId = "";

		jest.spyOn(mockedTokenHelper, "getCallSecurityContextFromAccessToken")
			.mockResolvedValueOnce(securityContext);

		// Act
		const response = await request(serverBaseUrl)
			.delete(`/oracles/${oracleId}`)
			.set(`Authorization`, `Bearer ${accessToken}`);

		// Assert
		expect(response.status).toBe(404);
	});
});

function checkIfValidUUID(str: string): boolean {
  // Regular expression to check if string is a valid UUID
  const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;

  return regexExp.test(str);
}
