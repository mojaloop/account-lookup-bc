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

* Gates Foundation
- Name Surname <name.surname@gatesfoundation.com>

* Coil
- Jason Bruwer <jason.bruwer@coil.com>

--------------
******/

"use strict";

import {ILogger,ConsoleLogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountLookupClient} from "@mojaloop/account-lookup-bc-client";
import {AccountLookupAggregate, IOracleFinder, IOracleProvider, IParty, UnableToGetOracleError, UnableToGetOracleProviderError} from "@mojaloop/account-lookup-bc-domain";
import * as uuid from "uuid";
import {MongoOracleFinderRepo, MongoOracleProviderRepo} from '../../src';

// Web server.
const WEB_SERVER_HOST: string = process.env.ACCOUNT_LOOKUP_WEB_SERVER_HOST ?? "localhost";
const WEB_SERVER_PORT_NO: number =
    parseInt(process.env.ACCOUNT_LOOKUP_WEB_SERVER_PORT_NO ?? "") || 1234;

// Account Lookup Client.
const ACCOUNT_LOOKUP_URL: string = `http://${WEB_SERVER_HOST}:${WEB_SERVER_PORT_NO}`;
const HTTP_CLIENT_TIMEOUT_MS: number = 10_000;

const DB_HOST: string = process.env.ACCOUNT_LOOKUP_DB_HOST ?? "localhost";
const DB_PORT_NO: number =
    parseInt(process.env.ACCOUNT_LOOKUP_DB_PORT_NO ?? "") || 27017;
const DB_URL: string = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
const DB_NAME: string = "account-lookup";
const ORACLE_PROVIDERS_COLLECTION_NAME: string = "oracle-providers";
const ORACLE_PROVIDER_PARTIES_COLLECTION_NAME: string = "oracle-provider-parties";

 /* ********** Test Interfaces ********** */
 interface IOracleFinderWrite {
    storeNewOracleProvider(partyType: String): Promise<void>;
 }
 interface IOracleFinderTest extends IOracleFinder, IOracleFinderWrite {}


 /* ********** Constants ********** */
 
 const logger: ILogger = new ConsoleLogger();
 const oracleFinderRepo: IOracleFinderTest = new MongoOracleFinderRepo(
	logger,
	DB_URL,
	DB_NAME,
	ORACLE_PROVIDERS_COLLECTION_NAME
);

const oracleProviderRepo: IOracleProvider = new MongoOracleProviderRepo(
	logger,
	DB_URL,
	DB_NAME,
	ORACLE_PROVIDER_PARTIES_COLLECTION_NAME
);

let accountLookupClient: AccountLookupClient;
let aggregate: AccountLookupAggregate;

describe("account lookup - integration tests", () => {
    beforeAll(async () => {
        accountLookupClient = new AccountLookupClient(
            logger,
            ACCOUNT_LOOKUP_URL,
            HTTP_CLIENT_TIMEOUT_MS
        );
        aggregate = new AccountLookupAggregate(
            logger,
            oracleFinderRepo,
            [oracleProviderRepo]
        );
        await aggregate.init();
    });

    afterAll(async () => {
        await aggregate.destroy();
        await oracleFinderRepo.destroy();
    });

    // Get party.
    test("associate party by type and id should throw error of oracle not found", async () => {
        const partyId: string = uuid.v4();
            const party: IParty = {
                id: partyId,
                type: "BANK",
                currency: "EUR",
                subId: null
            };
            
            await expect(
            async () => {
                await aggregate.associatePartyByTypeAndId(party.type, party.id);
            }
        ).rejects.toThrow(UnableToGetOracleError);
    });
    test("associate party by type and id should throw error of oracle provider not found", async () => {
        insertOracleProviderType("BANK")
        const partyId: string = uuid.v4();
            const party: IParty = {
                id: partyId,
                type: "BANK",
                currency: "EUR",
                subId: null
            };
            
            await expect(
            async () => {
                await aggregate.associatePartyByTypeAndId(party.type, party.id);
            }
        ).rejects.toThrow(UnableToGetOracleProviderError);
    });

});


async function insertOracleProviderType(type: String): Promise<void> {
    await oracleFinderRepo.storeNewOracleProvider(type)
}