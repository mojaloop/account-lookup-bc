// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
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
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import {
    IOracleFinder,
    IOracleProviderFactory,
    IParticipantServiceAdapter,
} from "@mojaloop/account-lookup-bc-domain-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IAuthenticatedHttpRequester } from "@mojaloop/security-bc-client-lib";
import { Service } from "../../src/service";
import {IMetrics, MetricsMock} from "@mojaloop/platform-shared-lib-observability-types-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService:IParticipantServiceAdapter = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const mockedAuthRequester: IAuthenticatedHttpRequester = new MemoryAuthenticatedHttpRequesterMock(logger,"fake token");

const mockedMetrics :IMetrics = new MetricsMock();

const serverBaseUrl = (process.env["ACCOUNT_LOOKUP_URL"] || "http://localhost:3030") + "/account-lookup";

const CURRENCY = {
    USD: "USD",
    EUR: "EUR"
};

describe("Account Lookup Routes - Unit Test", () => {
    beforeAll(async () => {
        await Service.start(logger, mockedConsumer, mockedProducer, mockedOracleFinder, mockedOracleProviderFactory,
            mockedAuthRequester, mockedParticipantService, mockedMetrics);
    });

    afterAll(async () => {
        await Service.stop();
    });

    test("GET - should fetch fspId for partyId and partyType", async () => {
        // Arrange
        const partyId = mockedPartyIds[2];
        const partyType = mockedPartyTypes[2];

        // Act
        const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedParticipantFspIds[2]);
    });

    test("GET - should receive 404 when fsp id not found", async () => {
        // Arrange
        const partyId = "non-existent-party-id";
        const partyType = mockedPartyTypes[2];

        // Act
        const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`);

        // Assert
        expect(response.status).toBe(404);
    });

    test("GET - should fetch fspId for partyId and partyType and currency", async () => {
        // Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];
        const currency = CURRENCY.USD;

        // Act
        const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}?currency=${currency}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedParticipantFspIds[0]);
    });

    test("GET - should return not found when currency not provided", async () => {
        // Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];

        // Act
        const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`);

        // Assert
        // TODO: This should be a 404
        expect(response.status).toBe(404);
    });

    test("GET - should receive error when request is not valid", async () => {
        // Arrange
        const partyId = "";
        const partyType = mockedPartyTypes[2];

        // Act
        const response = await request(serverBaseUrl).get(`/${partyType}/${partyId}`);

        // Assert
        expect(response.status).toBe(404);
    });

});
