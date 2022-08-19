/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

 "use strict";

 // Logger.
 import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
 import {
     AccountLookupAggregate,
     IOracleFinder,
     IOracleProvider,
     IParty,
     UnableToGetOracleProviderError
 } from "../../src";
import { MemoryOracleFinder } from "./mocks/memory_oracle_finder_mock";
import { MemoryOracleProvider } from "./mocks/memory_oracle_providers_mock";

 
/* Constants. */
const logger: ILogger = new ConsoleLogger();

// Infrastructure.
const oracleFinder: IOracleFinder = new MemoryOracleFinder(
    logger,
);
const oracleProvider1: IOracleProvider = new MemoryOracleProvider(
    logger,
);
// Domain.
const aggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    oracleFinder,
    [oracleProvider1]
);

describe("party lookup service - unit tests", () => {
    beforeAll(async () => {
        await aggregate.init();
    });

    afterAll(async () => {
        await aggregate.destroy();
    });

    // Create party.
    test("create party", async () => {
        const partyIdExpected: string = Date.now().toString();
        const party: IParty = {
            id: partyIdExpected,
            type: "bank",
            currency: "EUR",
            subId: null
            };
        const partyReceived = await aggregate.createParty(party.type, party.id);
        expect(partyReceived).toEqual(party);
    });
    test("create party should throw error of oracle provider not found", async () => {
        const partyIdExpected: string = Date.now().toString();
        const party: IParty = {
            id: partyIdExpected,
            type: "bank",
            currency: "EUR",
            subId: null
            };
        await expect(
            async () => {
                await aggregate.createParty(party.type, party.id);
            }
        ).rejects.toThrow(UnableToGetOracleProviderError);
    });

});
