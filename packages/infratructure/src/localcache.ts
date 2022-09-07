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

import { ILocalCache } from "@mojaloop/account-lookup-bc-domain";
import { LocalCacheResult } from "./types";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";

export class LocalCache<T> implements ILocalCache<T>{
    private readonly _cache: Map<string, LocalCacheResult<T>>;
    private readonly _logger: ILogger;
    // in seconds
    private ttl: number;

    constructor(logger:ILogger, ttl: number=320) {
        this._cache = new Map<string, LocalCacheResult<T>>();
        this._logger = logger;
        this.ttl = ttl;
    }
    
    get(key: string): T | null {
        this._logger.debug(`LocalCache: get ${key}`);
        const currentTime = Math.round(Date.now() / 1000);
        const cacheResult = this._cache.get(key);
        if (cacheResult ) {
            this._logger.debug(`LocalCache: get ${key} - found`);
            if(currentTime - cacheResult.timestamp  <= this.ttl)
            {
                this._logger.debug(`LocalCache: get ${key} - found - not expired`);
                return cacheResult.value;
            }
            else{
                this._logger.debug(`LocalCache: get ${key} - found - expired`);
                this._cache.delete(key);
            }
        }
        return null;
    }

    set(key: string, value: T): void {
        if(this._cache.has(key)){
            this._logger.error(`LocalCache: set ${key} - already exists`);
            throw new Error("Key already exists");
        }
        const currentTime = Math.round(Date.now() / 1000);
        this._cache.set(key, {timestamp: currentTime, value: value});
        this._logger.debug(`LocalCache: set ${key} - ${value}`);
    }

    destroy(): void {
       this._cache.clear();
       this._logger.debug(`LocalCache: destroyed`);
    }

}