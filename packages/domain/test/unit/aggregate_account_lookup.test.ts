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


 // Logger.
import {ConsoleLogger, ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import { IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    AccountLookupAggregate,
    AddOracleDTO,
    DuplicateOracleError,
    IOracleFinder,
    IParticipantService,
    NoSuchOracleError,
    Oracle,
    ParticipantLookup,
} from "../../src";
import { mockedOracleAdapters, MemoryOracleFinder,MemoryMessageProducer,MemoryOracleProviderFactory, MemoryParticipantService, MemoryOracleProviderAdapter, mockedPartyIds, mockedPartySubTypes, mockedPartyTypes, mockedParticipantFspIds } from "@mojaloop/account-lookup-shared-mocks";


const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const oracleFinder: IOracleFinder = new MemoryOracleFinder(
    logger,
);

const oracleProviderFactory = new MemoryOracleProviderFactory(logger);

const messageProducer: IMessageProducer = new MemoryMessageProducer(
    logger,
);


const participantService: IParticipantService = new MemoryParticipantService(
    logger,
);

// Domain.
const aggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    oracleFinder,
    oracleProviderFactory,
    messageProducer,
    participantService
);

describe("Domain - Unit Tests Account LookUp", () => {

    beforeAll(async () => {
        await aggregate.init();
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    test("getAccountLookUp - should return null if its unable to get an oracle", async () => {
        // Arrange
        const accountLookupRequest : ParticipantLookup = {
            currency: "USD",
            partyId: "123456789",
            partySubType: "PERSONAL",
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
            partySubType: "PERSONAL",
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
            partySubType: mockedPartySubTypes[0],
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
            partySubType: mockedPartySubTypes[0],
            partyType: mockedPartyTypes[0],
        };
        // Act
        const result = await aggregate.getAccountLookUp(accountLookupRequest);

        // Assert
        expect(result).toBe(mockedParticipantFspIds[0]);
    });

    test("getBulkAccountLookup - should return null if its unable to get an oracle", async () => {
        // Arrange
        const accountLookupRequest : ParticipantLookup = {
            currency: "USD",
            partyId: "123456789",
            partySubType: "PERSONAL",
            partyType: "DFSP",
        }

        const bulkRequest = {"id":accountLookupRequest};

        // Act
        const result = await aggregate.getBulkAccountLookup(bulkRequest);

        // Assert
        expect(result).toStrictEqual({"id":null});
    });

    test("getBulkAccountLookup - should return null if its unable to get an oracle due to error", async () => {
        // Arrange
        const accountLookupRequest : ParticipantLookup = {
            currency: "USD",
            partyId: "123456789",
            partySubType: "PERSONAL",
            partyType: "DFSP",
        }

        const bulkRequest = {"id":accountLookupRequest};


        jest.spyOn(oracleFinder, "getOracle").mockImplementationOnce(() => {
            throw new Error("Error");
        });

        // Act
        const result = await aggregate.getBulkAccountLookup(bulkRequest);

        // Assert
        expect(result).toStrictEqual({"id":null});
    });

    test("getBulkAccountLookup - should return a list with fspIds", async () => {
        // Arrange
        const accountLookupRequest1 : ParticipantLookup = {
            currency: "USD",
            partyId: mockedPartyIds[0],
            partySubType: mockedPartySubTypes[0],
            partyType: mockedPartyTypes[0],
        }

        const accountLookupRequest2 : ParticipantLookup = {
            currency: "USD",
            partyId: mockedPartyIds[0],
            partySubType: null,
            partyType: mockedPartyTypes[0],
        }

        const accountLookupRequest3 : ParticipantLookup = {
            currency: "EUR",
            partyId: mockedPartyIds[1],
            partySubType: mockedPartySubTypes[1],
            partyType: mockedPartyTypes[1],
        }

        const bulkRequest = {"id1":accountLookupRequest1, "id2":accountLookupRequest2, "id3":accountLookupRequest3};

        // Act
        const result = await aggregate.getBulkAccountLookup(bulkRequest);

        // Assert
        expect(result).toStrictEqual({"id1":mockedParticipantFspIds[0], "id2":mockedParticipantFspIds[0], "id3":mockedParticipantFspIds[1]});
    });

});
