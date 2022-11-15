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

import {
    IOracleFinder, Oracle
} from "@mojaloop/account-lookup-bc-domain";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { mockedOracleAdapters, notIncludedOracleAdapters } from "./mocked_data";

export class MemoryOracleFinder implements IOracleFinder {
    private readonly _logger: ILogger;
    private readonly _oraclesThatBelongToAggregate: Oracle[] ;
    private readonly _oraclesThatDontBelongToAggregate: Oracle[];
    
    constructor(
        logger: ILogger,
        startWithPredefinedOracles: boolean = true
    ) {
        this._logger = logger;
        this._oraclesThatBelongToAggregate = startWithPredefinedOracles ? mockedOracleAdapters : [];
        this._oraclesThatDontBelongToAggregate = startWithPredefinedOracles ? notIncludedOracleAdapters : [];
    }
    public get oracles(): Oracle[] {
        return this._oraclesThatBelongToAggregate;
    }

    init(): Promise<void> {
        return Promise.resolve();
    }
    destroy(): Promise<void> {
        return Promise.resolve();
    }
    addOracle(oracle: Oracle): Promise<void> {
        this._oraclesThatBelongToAggregate.push(oracle);
        return Promise.resolve();
    }
    removeOracle(id: string): Promise<void> {
        this._oraclesThatBelongToAggregate.splice(this._oraclesThatBelongToAggregate.findIndex(o => o.id === id), 1);
        return Promise.resolve();
    }
    getAllOracles(): Promise<Oracle[]> {
        return Promise.resolve(this._oraclesThatBelongToAggregate);
    }
    getOracleById(id: string): Promise<Oracle | null> {
        return Promise.resolve(this._oraclesThatBelongToAggregate.find(o => o.id === id) || null);
    }
    getOracleByName(name: string): Promise<Oracle | null> {
        return Promise.resolve(this._oraclesThatBelongToAggregate.find(o => o.name === name) || null);
    }    
    getOracle(partyType: string, partySubtype: string | null): Promise<Oracle | null> {
        let oracle = this._oraclesThatBelongToAggregate.find(o => o.partyType === partyType && o.partySubType === partySubtype);
        if(!oracle) {
            oracle = this._oraclesThatDontBelongToAggregate.find(o => o.partyType === partyType && o.partySubType === null);
        }
        return Promise.resolve(oracle || null);
    }

}
