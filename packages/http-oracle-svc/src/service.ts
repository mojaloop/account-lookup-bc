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

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import express, {Express} from "express";
import { Server } from "net";
import { RemoteOracle } from "./remote_oracle";
import { RemoteOracleExpressRoutes } from "./server/remote_oracle_routes";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";

// Oracle routes
const BC_NAME = "account-lookup-bc";
const APP_NAME = "http-oracle-svc";
const APP_VERSION = process.env.npm_package_version || "0.0.0";

const REMOTE_ORACLE_PORT = process.env["REMOTE_ORACLE_PORT"] || 3031;
const ORACLE_DB_FILE_PATH = process.env["ORACLE_DB_FILE_PATH"] || "/app/data/db.json";

let logger: ILogger;
let expressApp: Express;
let remoteOracleServer: Server;
let remoteOracle: RemoteOracle;

export async function start(){
    try{
        logger = new DefaultLogger(BC_NAME, APP_NAME, APP_VERSION);
        remoteOracle = new RemoteOracle(ORACLE_DB_FILE_PATH, logger);
        await remoteOracle.init();

        // Start oracle http routes
        expressApp = express();
        expressApp.use(express.json()); // for parsing application/json
        expressApp.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

        const routes = new RemoteOracleExpressRoutes(logger, remoteOracle);

        expressApp.use("/", routes.MainRouter);

        expressApp.use((req, res) => {
            // catch all
            res.send(404);
        });

        remoteOracleServer = expressApp.listen(REMOTE_ORACLE_PORT, () => {
            logger.info(`🚀 Server ready at port: ${REMOTE_ORACLE_PORT}`);
            logger.info(`Remote Oracle Service v: ${APP_VERSION} started`);
        });

    }
    catch(err){
        logger.error(err);
        await stop();
    }   
}

export async function stop(): Promise<void> {
    logger.debug("Tearing down oracle");
    await remoteOracle.destroy();
    logger.debug("Tearing down oracle routes");
    remoteOracleServer.close();
}
