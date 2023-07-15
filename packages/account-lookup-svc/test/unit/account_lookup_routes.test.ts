import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IAuthorizationClient, ILoginHelper } from "@mojaloop/security-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {IMetrics, MetricsMock} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {
    IOracleFinder,
    IOracleProviderFactory,
    IParticipantServiceAdapter,
} from "@mojaloop/account-lookup-bc-domain-lib";
import {
    MemoryAuthenticatedHttpRequester,
    MemoryLoginHelper,
    MemoryMessageConsumer,
    MemoryMessageProducer,
    MemoryOracleFinder,
    MemoryOracleProviderFactory,
    MemoryParticipantService,
    mockedParticipantFspIds,
    mockedPartyIds,
    mockedPartyTypes,
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";

import { IAuditClient } from '@mojaloop/auditing-bc-public-types-lib';
import { IAuthenticatedHttpRequester } from "@mojaloop/security-bc-client-lib";
import { MemoryAuditClient } from './../../../shared-mocks-lib/src/memory_audit_client';
import { MemoryAuthorizationClient } from './../../../shared-mocks-lib/src/memory_authorization_client';
import { Service } from "../../src/service";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import request from "supertest";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService:IParticipantServiceAdapter = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const mockedAuthRequester: IAuthenticatedHttpRequester = new MemoryAuthenticatedHttpRequester(logger,"fake token");

const mockedAuthorizationClient: IAuthorizationClient = new MemoryAuthorizationClient(logger);

const mockedAuditClient: IAuditClient = new MemoryAuditClient(logger);

const mockedLoginHelper: ILoginHelper = new MemoryLoginHelper(logger);

const mockedMetrics :IMetrics = new MetricsMock();

const serverBaseUrl = (process.env["ACCOUNT_LOOKUP_URL"] || "http://localhost:3030") + "/account-lookup";

const CURRENCY = {
    USD: "USD",
    EUR: "EUR"
};

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

describe("Account Lookup Routes - Unit Test", () => {
    beforeAll(async () => {
        await Service.start(mockedAuditClient, mockedAuthorizationClient, mockedAuthRequester, logger, mockedLoginHelper, mockedConsumer,
            mockedProducer, mockedMetrics, mockedOracleFinder, mockedOracleProviderFactory, mockedParticipantService);
    });

    afterAll(async () => {
        await Service.stop();
    });

    test("GET - should fetch fspId for partyId and partyType", async () => {
        // Arrange
        const partyId = mockedPartyIds[2];
        const partyType = mockedPartyTypes[2];

        // Act
        const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedParticipantFspIds[2]);
    });

    test("GET - should receive 404 when fsp id not found", async () => {
        // Arrange
        const partyId = "non-existent-party-id";
        const partyType = mockedPartyTypes[2];

        // Act
        const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(404);
    });

    test("GET - should fetch fspId for partyId and partyType and currency", async () => {
        // Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];
        const currency = CURRENCY.USD;

        // Act
        const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}?currency=${currency}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedParticipantFspIds[0]);
    });

    test("GET - should return not found when currency not provided", async () => {
        // Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];

        // Act
        const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        // TODO: This should be a 404
        expect(response.status).toBe(404);
    });

    test("GET - should receive error when request is not valid", async () => {
        // Arrange
        const partyId = "";
        const partyType = mockedPartyTypes[2];

        // Act
        const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`)
            .set("authorization", `Bearer ${TOKEN}`);

        // Assert
        expect(response.status).toBe(404);
    });

});
