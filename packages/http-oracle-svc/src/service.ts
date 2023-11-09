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

import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import express, {Express} from "express";
import { Server } from "net";
import process from "process";
import { RemoteOracle, IRemoteOracle } from "./remote_oracle";
import { RemoteOracleExpressRoutes } from "./server/remote_oracle_routes";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";

// Oracle routes
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJSON = require("../package.json");

const BC_NAME = "account-lookup-bc";
const APP_NAME = "http-oracle-svc";
const APP_VERSION = packageJSON.version;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

const REMOTE_ORACLE_PORT = process.env["REMOTE_ORACLE_PORT"] || 3031;
const ORACLE_DB_FILE_PATH = process.env["ORACLE_DB_FILE_PATH"] || "/app/data/db.json";

let globalLogger: ILogger;

export class Service {
    static logger: ILogger;
    static app: Express;
    static expressServer: Server;
    static remoteOracleAdapter: IRemoteOracle;

    static async start(
        logger?: ILogger,
        remoteOracleAdapter?: IRemoteOracle
    ){
        if (!logger) {
            logger = new DefaultLogger(
                BC_NAME,
                APP_NAME,
                APP_VERSION,
                LOG_LEVEL
            );
        }
        globalLogger = this.logger = logger;

        if(!remoteOracleAdapter){
            remoteOracleAdapter = new RemoteOracle(ORACLE_DB_FILE_PATH, logger);
            await remoteOracleAdapter.init();
        }
        this.remoteOracleAdapter = remoteOracleAdapter;

        // setup express app
        this.app = express();
        this.app.use(express.json()); // for parsing application/json
        this.app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

        const routes = new RemoteOracleExpressRoutes(this.logger, this.remoteOracleAdapter);
        this.app.use("/", routes.MainRouter);

        this.app.use((req, res) => {
            // catch all
            res.send(404);
        });

        return new Promise<void>(resolve => {
            this.expressServer = this.app.listen(REMOTE_ORACLE_PORT, () => {
                this.logger.info(`🚀 Server ready at port: ${REMOTE_ORACLE_PORT}`);
                this.logger.info(`Remote Oracle Service v: ${APP_VERSION} started`);
                resolve();
            });
        });
    }

    static async stop(): Promise<void> {
        const expressServerCloseProm = new Promise<void>((resolve, reject) => {
             this.expressServer.close((err)=>{
                 if(err)
                    return reject(err);
                resolve();
            });
        });
        this.logger.debug("Tearing down express server");
        await expressServerCloseProm;
        this.logger.debug("Tearing down oracle");
        await this.remoteOracleAdapter.destroy();
        this.logger.debug("Tearing down oracle routes");
    }
}


/**
 * process termination and cleanup
 */


/* istanbul ignore next */
async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    console.info(`Service - ${signal} received - cleaning up...`);
    let clean_exit = false;
    setTimeout(() => {
        clean_exit || process.exit(99);
    }, 5000);

    // call graceful stop routine
    await Service.stop();

    clean_exit = true;
    process.exit();
}

//catches ctrl+c event
/* istanbul ignore next */
process.on("SIGINT", _handle_int_and_term_signals);

//catches program termination event
/* istanbul ignore next */
process.on("SIGTERM", _handle_int_and_term_signals);

//do something when app is closing
/* istanbul ignore next */
process.on("exit", async () => {
    globalLogger.info("Microservice - exiting...");
});

/* istanbul ignore next */
process.on("uncaughtException", (err: Error) => {
    globalLogger.error(err);
    console.log("UncaughtException - EXITING...");
    process.exit(999);
});
