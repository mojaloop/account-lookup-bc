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

import {AccountLookupAggregate, IOracleFinder, IOracleProvider} from "@mojaloop/account-lookup-bc-domain";
import { mockedOracleList } from "@mojaloop/account-lookup-bc-domain/test/unit/mocks/data";
import { MemoryOracleFinder } from "@mojaloop/account-lookup-bc-domain/test/unit/mocks/memory_oracle_finder";
import { MemoryOracleProvider } from "@mojaloop/account-lookup-bc-domain/test/unit/mocks/memory_oracle_providers";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IEventAccountLookUpServiceHandler, AccountLookUpServiceEventHandler } from "../../src/event_handler";
import { AccountLookUpEventsType } from "../../src/types";


const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const oracleFinder: IOracleFinder = new MemoryOracleFinder(
    logger,
);
const oracleProviderList: IOracleProvider[] = [];

for(let i=0 ; i<mockedOracleList.length ; i+=1) {
    const oracleProvider: IOracleProvider = new MemoryOracleProvider(
        logger,
    );
    oracleProvider.id = mockedOracleList[i].id;
    oracleProviderList.push(oracleProvider);
}

const mockedAggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    oracleFinder,
    oracleProviderList
);

const eventHandler: IEventAccountLookUpServiceHandler = new AccountLookUpServiceEventHandler(logger, mockedAggregate);

 describe("Account Lookup Service", () => {

    afterEach(async () => {
        jest.restoreAllMocks();
    });


    test("should add all events for account lookup when init is called", async()=>{
        // Arrange
        const eventNames = Object.values(AccountLookUpEventsType);

        // Act
        eventHandler.init();

        // Assert
        expect(eventHandler.handler().eventNames()).toEqual(eventNames);

    });

    test("should remove all events for account lookup when destroy is called", async()=>{
        // Arrange
        const eventNames = Object.values(AccountLookUpEventsType);
        
        // Act
        eventHandler.destroy();

        // Assert
        eventNames.forEach(eventName => {
            expect(eventHandler.handler().listenerCount(eventName)).toBe(0);
        });
        expect(eventHandler.handler().eventNames().length).toEqual(0);
        
    });



 });