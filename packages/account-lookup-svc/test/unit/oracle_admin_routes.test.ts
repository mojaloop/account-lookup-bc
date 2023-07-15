import {
    Association,
    IOracleFinder,
    IOracleProviderFactory,
    IParticipantServiceAdapter
} from "@mojaloop/account-lookup-bc-domain-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IAuthorizationClient, ILoginHelper } from "@mojaloop/security-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {IMetrics, MetricsMock} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {
    MemoryAuthenticatedHttpRequester,
    MemoryLoginHelper,
    MemoryMessageConsumer,
    MemoryMessageProducer,
    MemoryOracleFinder,
    MemoryOracleProviderFactory,
    MemoryParticipantService,
    mockedOracleAdapterResults
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";

import { IAuditClient } from "@mojaloop/auditing-bc-public-types-lib";
import { IAuthenticatedHttpRequester } from "@mojaloop/security-bc-client-lib";
import { MemoryAuditClient } from "@mojaloop/account-lookup-bc-shared-mocks-lib/src/memory_audit_client";
import { MemoryAuthorizationClient } from "@mojaloop/account-lookup-bc-shared-mocks-lib/src/memory_authorization_client";
import { Service } from "../../src/service";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import request from "supertest";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService:IParticipantServiceAdapter = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger, true);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const mockedAuthRequester: IAuthenticatedHttpRequester = new MemoryAuthenticatedHttpRequester(logger,"fake token");

const mockedAuthorizationClient: IAuthorizationClient = new MemoryAuthorizationClient(logger);

const mockedAuditClient: IAuditClient = new MemoryAuditClient(logger);

const mockedMetrics :IMetrics = new MetricsMock();

const mockedLoginHelper: ILoginHelper = new MemoryLoginHelper(logger);

const serverBaseUrl = (process.env["ADMIN_URL"] || "http://localhost:3030") + "/admin";


const initTokenHelperSpy = jest.fn();

jest.mock("@mojaloop/security-bc-client-lib", () => {
    return {
        TokenHelper: jest.fn().mockImplementation(() => {
            return {
                init: initTokenHelperSpy,
                verifyToken: jest.fn().mockImplementation(() => {
                    return Promise.resolve(true);
                }),
                decodeToken: jest.fn().mockImplementation(() => {
                    //TODO: return decoded token
                    return "decoded-token"
                })
            }
        }),
        LoginHelper: jest.requireActual('@mojaloop/security-bc-client-lib').LoginHelper,
        AuthorizationClient: jest.requireActual('@mojaloop/security-bc-client-lib').AuthorizationClient,
        AuthenticatedHttpRequester: jest.requireActual('@mojaloop/security-bc-client-lib').AuthenticatedHttpRequester,
        IAuthenticatedHttpRequester: jest.requireActual('@mojaloop/security-bc-client-lib').IAuthenticatedHttpRequester,
    }
});

//TODO: Add valid token
const TOKEN = "token";

describe("Oracle Admin Routes - Unit Test", () => {
    beforeAll(async () => {
        await Service.start(mockedAuditClient, mockedAuthorizationClient, mockedAuthRequester, logger, mockedLoginHelper, mockedConsumer, mockedProducer, mockedMetrics, mockedOracleFinder, mockedOracleProviderFactory, mockedParticipantService);
    });

    afterAll(async () => {
        await Service.stop();
    });

    test("GET - should fetch an array of oracles", async () => {
        // Act
        const response = await request(serverBaseUrl).get("/oracles")
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toEqual(true);
        expect(response.body.length).toBeGreaterThan(0);
    });

    test("GET - should fetch an array of oracle associations available", async () => {
        // Arrange
        const expectedAssociations = mockedOracleAdapterResults[0];

        // Act
        const response = await request(serverBaseUrl).get("/oracles/builtin-associations")
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(200);
        const associationResponse: Association = response.body[0];
        expect(associationResponse.fspId).toEqual(expectedAssociations.fspId);
        expect(associationResponse.currency).toEqual(expectedAssociations.currency);
        expect(associationResponse.partyId).toEqual(expectedAssociations.partyId);
        expect(associationResponse.partyType).toEqual(expectedAssociations.partyType);
    });

    test("POST - should return an error when an invalid payload is passed", async () => {
        // Act
        const response = await request(serverBaseUrl).post("/oracles").send({
            type: "invalid-type",
            name: "oracle msisdn",
            partyType: "MSISDN"
        })
        .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(422);
    });

    test("POST - should add a new oracle", async () => {
        // Act
        const response = await request(serverBaseUrl).post("/oracles").send({
            type: "builtin",
            name: "oracle msisdn",
            partyType: "MSISDN"
        })
        .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(200);
        expect(checkIfValidUUID(response.body.id)).toBe(true);
    });

    test("GET - should fetch the recently added oracle by id", async () => {
        // Arrange
        const oracles = await request(serverBaseUrl).get("/oracles")
            .set("authorization", `Bearer ${TOKEN}`);

        const oracleId = oracles.body[0].id;

        // Act
        const response = await request(serverBaseUrl).get(`/oracles/${oracleId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.name).toEqual("oracle1");
        expect(response.body.type).toEqual("builtin");
        expect(response.body.partyType).toEqual("bank");
    });

    test("GET - should return not found error when fetched with non-existent id", async () => {
        // Arrange
        const oracleId = "non-existent-id";

        // Act
        const response = await request(serverBaseUrl).get(`/oracles/${oracleId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(404);
    });

    test("GET - should return health condition of the specified oracle", async () => {
        // Arrange
        const oracles = await request(serverBaseUrl).get("/oracles");

        const oracleId = oracles.body[0].id;

        // Act
        const response = await request(serverBaseUrl).get(`/oracles/health/${oracleId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(true);
    });

    test("GET - should return not found error when health check with non-existent id", async () => {
        // Arrange
        const oracleId = "non-existent-id";

        // Act
        const response = await request(serverBaseUrl).get(`/oracles/health/${oracleId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(404);
    });

    test("GET - should return an error when an invalid payload is passed", async () => {
        // Arrange
        const oracleId = "";

        // Act
        const response = await request(serverBaseUrl).get(`/oracles/health/${oracleId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(404);
    });

    test("DELETE - should delete the specified oracle", async () => {
        // Arrange
        const oracles = await request(serverBaseUrl).get("/oracles")
            .set("authorization", `Bearer ${TOKEN}`);

        const oracleId = oracles.body[0].id;

        // Act
        const response = await request(serverBaseUrl).delete(`/oracles/${oracleId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(200);
    });

    test("DELETE - should return not found error when try to delete with non-existence id", async () => {
        // Arrange
        const oracleId = "non-existent-id";

        // Act
        const response = await request(serverBaseUrl).delete(`/oracles/${oracleId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(404);
    });

    test("DELETE - should return an error when an invalid payload is passed", async () => {
        // Arrange
        const oracleId = "";

        // Act
        const response = await request(serverBaseUrl).delete(`/oracles/${oracleId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(404);
    });
});


function checkIfValidUUID(str:string): boolean {
    // Regular expression to check if string is a valid UUID
    const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;

    return regexExp.test(str);
}
