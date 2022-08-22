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

//TODO re-enable configs
//import appConfigs from "./config";

import {ConsoleLogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {AccountLookupAggregate, IOracleFinder, IOracleProvider} from "@mojaloop/account-lookup-bc-domain";
import {ExampleOracleFinder, ExampleOracleProvider} from "@mojaloop/account-lookup-bc-infrastructure";


const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;


let oracleFinder: IOracleFinder = new ExampleOracleFinder();
let oracleProvider1: IOracleProvider = new ExampleOracleProvider();

let accountLookupAgg: AccountLookupAggregate;

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
  MLKafkaConsumer,
  MLKafkaConsumerOutputType
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {DefaultLogger, KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";

const BC_NAME = "account-lookup-bc";
const APP_NAME = "account-lookup-svc";
const APP_VERSION = "0.0.1";
const LOGLEVEL = LogLevel.DEBUG;

const KAFKA_ORACLES_TOPIC = "audits";
const KAFKA_LOGS_TOPIC = "logs";

const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";



// kafka logger
const kafkaProducerOptions = {
  kafkaBrokerList: KAFKA_URL
}


// Event Handler
const kafkaConsumerOptions = {
  kafkaBrokerList: KAFKA_URL,
  kafkaGroupId: `${BC_NAME}_${APP_NAME}`,
  outputType: MLKafkaConsumerOutputType.Json
}


const logger:ILogger = new KafkaLogger(
        BC_NAME,
        APP_NAME,
        APP_VERSION,
        kafkaProducerOptions,
        KAFKA_LOGS_TOPIC,
        LOGLEVEL
);

let kafkaConsumer: MLKafkaConsumer;

async function processLogMessage (message: IMessage) : Promise<void> {
    const value = message.value;
  
    console.log('processLogMessage: ',value)
  }

async function start():Promise<void> {
  // todo create aggRepo
  await (logger as KafkaLogger).start();

  kafkaConsumer = new MLKafkaConsumer(kafkaConsumerOptions, logger);
  kafkaConsumer.setTopics([KAFKA_ORACLES_TOPIC]);
  kafkaConsumer.setCallbackFn(processLogMessage);
  await kafkaConsumer.connect();
  await kafkaConsumer.start();

  logger.info("kafkaConsumer initialised");
}


function setupKafkaConsumer() {
    async function handler(message: any): Promise<void> {
        logger.debug(`Got message in handler: ${JSON.stringify(message, null, 2)}`)
        return
    }
    
    kafkaConsumer.setCallbackFn(handler)
    kafkaConsumer.setTopics(['myTopic'])
}

// async function start():Promise<void>{
//     /// start logger
//     await logger.start();
//     accountLookupAgg = new AccountLookupAggregate(logger, oracleFinder, [oracleProvider1]);

//     // accountLookupAgg.init();

//     const msgs = []

//     for (let i = 0; i < 5; i++) {
//         msgs.push({
//             topic: 'myTopic',
//             value: { testProp: i },
//             key: null,
//             headers: [
//                 { key1: 'testStr' }
//             ]
//         })
//     }

//     await kafkaProducer.connect()
//     await kafkaProducer.send(msgs)

//     await kafkaConsumer.connect()

//     // Start consuming to handler
//     await kafkaConsumer.start()

// }


async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    logger.info(`Service - ${signal} received - cleaning up...`);
    process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals.bind(this));

//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals.bind(this));

//do something when app is closing
process.on('exit', () => {
    logger.info("Example server - exiting...");
});


start().catch((err:unknown) => {
    logger.fatal(err);
});
