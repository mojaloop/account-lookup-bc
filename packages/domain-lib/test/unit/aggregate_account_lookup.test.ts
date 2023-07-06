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
    AccountLookupAggregate,
    ParticipantLookup,
} from "../../src";
import {IMetrics, MetricsMock} from "@mojaloop/platform-shared-lib-observability-types-lib";
import { auditClient, authorizationClient, logger, messageProducer, oracleFinder, oracleProviderFactory, participantService } from "../utils/mocked_variables";
import { mockedParticipantFspIds, mockedPartyIds, mockedPartyTypes } from "@mojaloop/account-lookup-bc-shared-mocks-lib";

let aggregate: AccountLookupAggregate;

describe("Domain - Unit Tests Account Lookup", () => {

    beforeAll(async () => {
        const metricsMock :IMetrics = new MetricsMock();
        aggregate = new AccountLookupAggregate(auditClient, authorizationClient, logger, messageProducer, metricsMock, oracleFinder, oracleProviderFactory, participantService);
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
