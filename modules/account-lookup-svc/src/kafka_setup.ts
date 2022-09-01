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
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { MLKafkaConsumer, MLKafkaConsumerOutputType } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { BC_NAME, APP_NAME, APP_VERSION, LOGLEVEL } from ".";
import { IEventAccountLookUpServiceHandler } from "./event_handler";
import { AccountLookupAggregate } from "@mojaloop/account-lookup-bc-domain";

const KAFKA_ORACLES_TOPIC = "account-lookup";
const KAFKA_LOGS_TOPIC = "logs";
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";


let kafkaConsumer:MLKafkaConsumer;

let logger:ILogger;


export async function setupKafkaConsumer(aggregate: AccountLookupAggregate, accountLookUpEventHandler: IEventAccountLookUpServiceHandler): Promise<void> {
 
  // Kafka Event Handler
  const kafkaConsumerOptions = {
    kafkaBrokerList: KAFKA_URL,
    kafkaGroupId: `${BC_NAME}_${APP_NAME}`,
    outputType: MLKafkaConsumerOutputType.Json
  }
   
    kafkaConsumer = new MLKafkaConsumer(kafkaConsumerOptions, logger);
    kafkaConsumer.setTopics([KAFKA_ORACLES_TOPIC]);
    kafkaConsumer.setCallbackFn(processMessage);
    await kafkaConsumer.connect();
    await kafkaConsumer.start();
  
    logger.info("kafkaConsumer initialised");
    
    // Callback function to process messages
    async function processMessage(message: IMessage): Promise<void> {
        logger.debug(`Got message in handler: ${JSON.stringify(message, null, 2)}`);
        accountLookUpEventHandler.publishAccountLookUpEvent(message);
      }
}


export async function setupKafkaLogger(): Promise<ILogger> {
  const kafkaProducerOptions = {
    kafkaBrokerList: KAFKA_URL
  };
  
  logger = new KafkaLogger(
    BC_NAME,
    APP_NAME,
    APP_VERSION,
    kafkaProducerOptions,
    KAFKA_LOGS_TOPIC,
    LOGLEVEL
  );

  await (logger as KafkaLogger).start();

  return logger;
}

process.on('exit', () => {
  logger.info("Example server - Disconecting Kafka ..."); 
  setTimeout(async ()=>{
    await kafkaConsumer.destroy(true);
  }, 0);
  
});