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

import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { BC_NAME, APP_NAME, APP_VERSION } from "..";

export interface IEventAccountLookUpLogger{
    init(logLevel?:LogLevel):Promise<void>;
    get(): ILogger;
}

export class EventAccountLookupLogger implements IEventAccountLookUpLogger{

    private KAFKA_LOGS_TOPIC = "logs";
    private KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
    private DEFAULT_LOGLEVEL = LogLevel.DEBUG;

    private logger: ILogger;

    get(): ILogger {
        return this.logger;
    }

    async init(logLevel: LogLevel = this.DEFAULT_LOGLEVEL): Promise<void> {
        try{
            const kafkaProducerOptions = {
              kafkaBrokerList: this.KAFKA_URL
            };
            
            this.logger = new KafkaLogger(
              BC_NAME,
              APP_NAME,
              APP_VERSION,
              kafkaProducerOptions,
              this.KAFKA_LOGS_TOPIC,
              logLevel
            );
            
            await (this.logger as KafkaLogger).start();
            this.logger.info("kafka logger initialised");
          }
          catch(err){
            this.logger = new ConsoleLogger();
            this.logger.error("Unable to start logger");
            throw err;
          }
    }


}