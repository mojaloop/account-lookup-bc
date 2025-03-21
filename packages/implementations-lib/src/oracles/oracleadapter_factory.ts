/**
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

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

import { IOracleProviderAdapter, IOracleProviderFactory, Oracle } from "@mojaloop/account-lookup-bc-domain-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { OracleTypeNotSupportedError } from "../errors";
import { MongoOracleProviderRepo } from "./adapters/builtin/mongo_oracleprovider";
import { HttpOracleProvider } from "./adapters/remote/http_oracleprovider";

export class OracleAdapterFactory implements IOracleProviderFactory {
    private readonly _logger: ILogger;
    private readonly _builtinOracleMongoUrl: string;
    private readonly _dbName:string;

    private readonly _redisHost:string;
    private readonly _redisPort:number;
    private readonly _redisCacheDurationSecs:number;

    constructor(
        builtinOracleMongoUrl: string, dbName:string, logger: ILogger,
        redisHost: string, redisPort: number, redisCacheDurationSecs: number
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._builtinOracleMongoUrl = builtinOracleMongoUrl;
        this._dbName = dbName;

        this._redisHost = redisHost;
        this._redisPort = redisPort;
        this._redisCacheDurationSecs = redisCacheDurationSecs;
    }

    create(oracle: Oracle): IOracleProviderAdapter {
        if (oracle.type === "builtin") {
            this._logger.info(`Creating Builtin Oracle Provider for Oracle ${oracle.id}`);
            return new MongoOracleProviderRepo(
                oracle, this._logger, this._builtinOracleMongoUrl, this._dbName,
                this._redisHost, this._redisPort, this._redisCacheDurationSecs
            );
        } else if (oracle.type === "remote-http") {
            this._logger.info(`Creating Remote Http Oracle Provider for Oracle ${oracle.id}`);
            return new HttpOracleProvider(oracle, this._logger);
        } else {
            // default is to throw
            const errorMessage = `Oracle type ${oracle.type} not supported`;
            this._logger.error(errorMessage);
            throw new OracleTypeNotSupportedError(errorMessage);
        }
    }
}
