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
    AccountLookupAggregate, 
    IOracleFinder, 
    IOracleProviderFactory, 
    IParticipantService,
    ParticipantLookup
} from "@mojaloop/account-lookup-bc-domain-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IAuthenticatedHttpRequester } from "@mojaloop/security-bc-client-lib";
import { Service } from "../../src/service";


const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService:IParticipantService = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const mockedAuthRequester: IAuthenticatedHttpRequester = new MemoryAuthenticatedHttpRequesterMock(logger,"fake token");

const mockedAggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    mockedOracleFinder,
    mockedOracleProviderFactory,
    mockedProducer,
    mockedParticipantService,
);

const server = (process.env["ACCOUNT_LOOKUP_URL"] || "http://localhost:3030") + "/account-lookup";

const CURRENCY = {
    USD: "USD",
    EUR: "EUR"
};


describe("Account Lookup Routes - Unit Test", () => {
    beforeAll(async () => {
        await Service.start(logger, mockedConsumer, mockedProducer, mockedOracleFinder, mockedOracleProviderFactory, 
            mockedAuthRequester, mockedParticipantService);
    });

    afterAll(async () => {
        await Service.stop();
    });

    test("GET - should fetch fspId for partyId and partyType", async () => {
        // Arrange
        const partyId = mockedPartyIds[2];
        const partyType = mockedPartyTypes[2];

        // Act
        const response = await request(server).get(`/${partyId}/${partyType}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedParticipantFspIds[2]);
    });

    test("GET - should receive error when no match", async () => {
        // Arrange
        const partyId = "non-existent-party-id";
        const partyType = "non-existent-party-type";

        // Act
        const response = await request(server).get(`/${partyId}/${partyType}`);

        // Assert
        expect(response.status).toBe(404);
    });

    test("GET - should fetch fspId for partyId and partyType and currency", async () => {
        // Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];
        const currency = CURRENCY.USD;

        // Act
        const response = await request(server).get(`/${partyId}/${partyType}?currency=${currency}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.text).toEqual(mockedParticipantFspIds[0]);
    });

    test("GET - should return not found when currency not provided", async () => {
        // Arrange
        const partyId = mockedPartyIds[0];
        const partyType = mockedPartyTypes[0];

        // Act
        const response = await request(server).get(`/${partyId}/${partyType}`);

        // Assert
        // TODO: This should be a 404
        expect(response.status).toBe(404);
    });

    test("GET - should receive error when request is not valid", async () => {
        // Arrange
        const partyId = "";
        const partyType = mockedPartyTypes[2];

        // Act
        const response = await request(server).get(`/${partyId}/${partyType}`);

        // Assert
        expect(response.status).toBe(404);
    });

    test("POST - fetch all fspIds for the given requests", async () => {
        // Arrange
        const request1: ParticipantLookup = {
            partyId: mockedPartyIds[0],
            partyType: mockedPartyTypes[0],
            currency: "USD"
        }
        const request2: ParticipantLookup = {
            partyId: mockedPartyIds[1],
            partyType: mockedPartyTypes[1],
            currency: "EUR"
        }

        // Act
        const response = await request(server).post("").send({
            request1,
            request2
        });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            request1: mockedParticipantFspIds[0],
            request2: mockedParticipantFspIds[1]
        });
    });

    test("POST - if no fspId for the respective request, return null", async () => {
        // Arrange
        const request1: ParticipantLookup = {
            partyId: "non-existent-party-id",
            partyType: "non-existent-party-type",
            currency: "EUR"
        }
        const request2: ParticipantLookup = {
            partyId: "non-existent-party-id",
            partyType: "non-existent-party-type",
            currency: "EUR"
        }

        // Act
        const response = await request(server).post("").send({
            request1,
            request2
        });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            request1: null,
            request2: null
        });
    });

    test("POST - should return bad request when request is not valid", async () => {
        // Arrange
        const request1: ParticipantLookup = {
            partyId: "",
            partyType: mockedPartyTypes[0],
            currency: "USD"
        }
        const request2: ParticipantLookup = {
            partyId: mockedPartyIds[1],
            partyType: mockedPartyTypes[1],
            currency: "EUR"
        }

        // Act
        const response = await request(server).post("").send({
            request1,
            request2
        });

        // Assert
        expect(response.status).toBe(422);
    });
});