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

//TODO re-enable configs
//import appConfigs from "./config";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {AccountLookupAggregate, IMessagePublisher, IOracleFinder, IOracleProvider} from "@mojaloop/account-lookup-bc-domain";
import { AccountLookUpEventHandler, IAccountLookUpEventHandler } from "./event_handler";
import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { MLKafkaConsumer, MLKafkaConsumerOptions, MLKafkaConsumerOutputType } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { KafkaMessagePublisher, MongoOracleFinderRepo, MongoOracleProviderRepo } from "@mojaloop/account-lookup-bc-infrastructure";

// Global vars
// eslint-disable-next-line
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const BC_NAME = "account-lookup-bc";
const APP_NAME = "account-lookup-svc";
const APP_VERSION = "0.0.1";

// Logger
let logger: ILogger;
const DEFAULT_LOGLEVEL = LogLevel.DEBUG;

// Kafka Consumer 
const KAFKA_LOGS_TOPIC = "logs";
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
const KAFKA_ORACLES_TOPIC = "account-lookup";

let kafkaConsumer: MLKafkaConsumer;
const kafkaConsumerOptions: MLKafkaConsumerOptions = {
  kafkaBrokerList: KAFKA_URL,
  kafkaGroupId: `${BC_NAME}_${APP_NAME}`,
  outputType: MLKafkaConsumerOutputType.Json
};

// Providers 
const DB_HOST: string = process.env.ACCOUNT_LOOKUP_DB_HOST ?? "localhost";
const DB_PORT_NO: number = parseInt(process.env.ACCOUNT_LOOKUP_DB_PORT_NO ?? "") || 27017;
const DB_URL = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
const DB_NAME = "account-lookup";
const ORACLE_PROVIDERS_COLLECTION_NAME = "oracle-providers";
const ORACLE_PROVIDER_PARTIES_COLLECTION_NAME = "oracle-provider-parties";

let oracleFinder: IOracleFinder;
let oracleProvider: IOracleProvider[];
let messagePublisher: IMessagePublisher;

// Aggregate

let aggregate: AccountLookupAggregate;

let eventHandler: IAccountLookUpEventHandler;


async function start(loggerParam?:ILogger, oracleFinderParam?:IOracleFinder, oracleProviderParam?:IOracleProvider[], messagePublisherParam?:IMessagePublisher, aggregateParam?:AccountLookupAggregate, eventHandlerParam?:IAccountLookUpEventHandler ):Promise<void> {
      
    ({ logger, oracleFinder, oracleProvider, messagePublisher, aggregate, eventHandler } = setup(loggerParam, oracleFinderParam, oracleProviderParam, messagePublisherParam, aggregateParam, eventHandlerParam));

    await (logger as KafkaLogger).start();
    logger.info("kafka logger initialised");

    kafkaConsumer = new MLKafkaConsumer(kafkaConsumerOptions, logger);
    kafkaConsumer.setTopics([KAFKA_ORACLES_TOPIC]);
    
    kafkaConsumer.connect();
    await kafkaConsumer.start();
  
    logger.info("kafka consumer initialised");

    logger.info("Initializing Oracle Finder");
    await oracleFinder.init();
    logger.info("Oracle Finder Initialized");

    oracleProvider.forEach(async oracleProvider => {
      logger.info("Initializing Oracle Provider " + oracleProvider.id);
      await oracleProvider.init();
      logger.info("Oracle Provider " + oracleProvider.id + " Initialized");
    });

    logger.info("Initializing Message Publisher");
    await messagePublisher.init();
    logger.info("Message Publisher Initialized");

    aggregate = new AccountLookupAggregate(logger, oracleFinder, oracleProvider, messagePublisher);
    await aggregate.init();

    eventHandler = new AccountLookUpEventHandler(logger, aggregate);
    eventHandler.init();

    kafkaConsumer.setCallbackFn(async (message:IMessage) => {
      logger.debug(`Got message in handler: ${JSON.stringify(message, null, 2)}`);
      eventHandler.publishAccountLookUpEvent(message);
      Promise.resolve();
    });

   
}

function setup(logger: ILogger | undefined, oracleFinder: IOracleFinder | undefined, oracleProvider: IOracleProvider[] | undefined, messagePublisher: IMessagePublisher | undefined, aggregate: AccountLookupAggregate | undefined, eventHandler: IAccountLookUpEventHandler | undefined) {
  if (!logger) {
    logger = new KafkaLogger(
      BC_NAME,
      APP_NAME,
      APP_VERSION,
      {
        kafkaBrokerList: KAFKA_URL
      },
      KAFKA_LOGS_TOPIC,
      DEFAULT_LOGLEVEL
    );
  }

  if (!oracleFinder) {
    oracleFinder = new MongoOracleFinderRepo(
      logger,
      DB_URL,
      DB_NAME,
      ORACLE_PROVIDERS_COLLECTION_NAME
    );
  }

  if (!oracleProvider) {
    oracleProvider = [new MongoOracleProviderRepo(
      logger,
      DB_URL,
      DB_NAME,
      ORACLE_PROVIDER_PARTIES_COLLECTION_NAME
    )];
  }

  if (!messagePublisher) {
    messagePublisher = new KafkaMessagePublisher(
      logger,
      {
        kafkaBrokerList: KAFKA_URL,
        producerClientId: `${BC_NAME}_${APP_NAME}`,
        skipAcknowledgements: true,
        kafkaTopic: KAFKA_ORACLES_TOPIC
      }
    );
  }

  if (!aggregate) {
    aggregate = new AccountLookupAggregate(logger, oracleFinder, oracleProvider, messagePublisher);
  }

  if (!eventHandler) {
    eventHandler = new AccountLookUpEventHandler(
      logger,
      aggregate
    );
  }
  return { logger, oracleFinder, oracleProvider, messagePublisher, aggregate, eventHandler };
}

async function cleanUpAndExit(exitCode = 0): Promise<void> { 
  eventHandler.destroy();
  await aggregate.destroy();
  await kafkaConsumer.destroy(true);
  process.exitCode = exitCode;
}

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    logger?.info(`Service - ${signal} received - cleaning up...`);
    await cleanUpAndExit();
}


//catches ctrl+c event
process.once("SIGINT", _handle_int_and_term_signals.bind(this));

//catches program termination event
process.once("SIGTERM", _handle_int_and_term_signals.bind(this));

//do something when app is closing
process.on('exit', (code) => {
  logger?.info("Example server - exiting...");
  setTimeout(async ()=>{
    await cleanUpAndExit(code);
  }, 0);
});

start();
