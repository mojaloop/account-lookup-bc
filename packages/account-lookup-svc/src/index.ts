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
import {AccountLookupAggregate, ILocalCache, IOracleFinder, IOracleProvider, IParticipantService} from "@mojaloop/account-lookup-bc-domain";
import {IMessage, IMessageProducer, IMessageConsumer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { AccountLookUpEventHandler, IAccountLookUpEventHandler } from "./event_handler";
import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { MLKafkaConsumer, MLKafkaConsumerOptions, MLKafkaConsumerOutputType } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { KafkaMessageProducer, LocalCache, MongoOracleFinderRepo, MongoOracleProviderRepo } from "@mojaloop/account-lookup-bc-infrastructure";
import { ParticipantHttpClient } from "@mojaloop/account-lookup-bc-client";
import { ExpressHttpServer } from "./express_http_server";

// Global vars
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const BC_NAME = "account-lookup-bc";
const APP_NAME = "account-lookup-svc";
const APP_VERSION = "0.0.1";

// Logger
let logger: ILogger;
const DEFAULT_LOGLEVEL = LogLevel.DEBUG;

// Message Consumer/Publisher 
const KAFKA_LOGS_TOPIC = "logs";
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
const KAFKA_ORACLES_TOPIC = "account-lookup";

let messageConsumer: IMessageConsumer;
const consumerOptions: MLKafkaConsumerOptions = {
  kafkaBrokerList: KAFKA_URL,
  kafkaGroupId: `${BC_NAME}_${APP_NAME}`,
  outputType: MLKafkaConsumerOutputType.Json
};

let messageProducer: IMessageProducer;


// Providers 
const DB_HOST: string = process.env.ACCOUNT_LOOKUP_DB_HOST ?? "localhost";
const DB_PORT_NO: number = parseInt(process.env.ACCOUNT_LOOKUP_DB_PORT_NO ?? "") || 27017;
const DB_URL = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
const DB_NAME = "account-lookup";
const ORACLE_PROVIDERS_COLLECTION_NAME = "oracle-providers";
const ORACLE_PROVIDER_PARTIES_COLLECTION_NAME = "oracle-provider-parties";


// HTTP server.
const HTTP_SERVER_HOST: string = process.env.PARTICIPANTS_HTTP_SERVER_HOST ?? "localhost";
const HTTP_SERVER_PORT_NO: number =
parseInt(process.env.PARTICIPANTS_HTTP_SERVER_PORT_NO ?? "") || 1234;
const HTTP_SERVER_PATH_ROUTER: string = "/";

// Participants Lookup HTTP client.
const BASE_URL_PARTICIPANTS_HTTP_SERVICE: string = `http://${HTTP_SERVER_HOST}:${HTTP_SERVER_PORT_NO}`;
const TIMEOUT_MS_PARTICIPANTS_HTTP_CLIENT: number = 5000;

let oracleFinder: IOracleFinder;
let oracleProvider: IOracleProvider[];

// Aggregate
let aggregate: AccountLookupAggregate;

// Event Handler
let eventHandler: IAccountLookUpEventHandler;

// Local Cache
let localCache: ILocalCache;

// Local express server
let httpServer: ExpressHttpServer;

let participantsHttpClient: ParticipantHttpClient;


export async function start(loggerParam?:ILogger, messageConsumerParam?:IMessageConsumer, messageProducerParam?:IMessageProducer, oracleFinderParam?:IOracleFinder, 
  oracleProviderParam?:IOracleProvider[], localCacheParam?:ILocalCache, aggregateParam?:AccountLookupAggregate, eventHandlerParam?:IAccountLookUpEventHandler):Promise<void> {
  
  try{
    
    await initExternalDependencies(loggerParam, messageConsumerParam, messageProducerParam, oracleFinderParam, oracleProviderParam);

    messageConsumer.setTopics([KAFKA_ORACLES_TOPIC]);
    await messageConsumer.connect();
    await messageConsumer.start();
    logger.info("Kafka Consumer Initialised");
    
    logger.info("Initializing Message Publisher");
    await messageProducer.connect();
    logger.info("Message Publisher Initialized");

    localCache = localCacheParam ?? new LocalCache(logger);

    participantsHttpClient = new ParticipantHttpClient(
			logger,
			BASE_URL_PARTICIPANTS_HTTP_SERVICE,
			TIMEOUT_MS_PARTICIPANTS_HTTP_CLIENT
		);
    
    aggregate = aggregateParam ?? new AccountLookupAggregate(logger, oracleFinder, oracleProvider, messageProducer, localCache, participantsHttpClient as IParticipantService);
    await aggregate.init();
    logger.info("Aggregate Initialized");

    httpServer = new ExpressHttpServer(
      logger,
      HTTP_SERVER_HOST,
      HTTP_SERVER_PORT_NO,
      HTTP_SERVER_PATH_ROUTER,
    );
	  httpServer.init(); // No need to handle exceptions.

    eventHandler =eventHandlerParam ?? new AccountLookUpEventHandler(logger, aggregate);
    eventHandler.init();
    logger.info("Event Handler Initialized");

    const callbackFunction = async (message:IMessage):Promise<void> => {
      logger.debug(`Got message in handler: ${JSON.stringify(message, null, 2)}`);
      eventHandler.publishAccountLookUpEvent(message);
      Promise.resolve();
    };
    
    messageConsumer.setCallbackFn(callbackFunction);  

  }
  catch(err){
    logger.error(err);
    throw err;
  }
}

async function initExternalDependencies(loggerParam?:ILogger, messageConsumerParam?:IMessageConsumer, messageProducerParam?:IMessageProducer, oracleFinderParam?:IOracleFinder, oracleProviderParam?: IOracleProvider[]):Promise<void>  {

  logger = loggerParam ?? new KafkaLogger(BC_NAME, APP_NAME, APP_VERSION,{kafkaBrokerList: KAFKA_URL}, KAFKA_LOGS_TOPIC,DEFAULT_LOGLEVEL);
  
  if (!loggerParam) {
    await (logger as KafkaLogger).start();
    logger.info("Kafka Logger Initialised");
  }
  
  oracleFinder = oracleFinderParam ?? new MongoOracleFinderRepo(logger,DB_URL, DB_NAME, ORACLE_PROVIDERS_COLLECTION_NAME);

  oracleProvider = oracleProviderParam ?? [new MongoOracleProviderRepo(logger, DB_URL, DB_NAME, ORACLE_PROVIDER_PARTIES_COLLECTION_NAME)];

  messageProducer = messageProducerParam ??  new KafkaMessageProducer(logger,
    {
      kafkaBrokerList: KAFKA_URL,
      producerClientId: `${BC_NAME}_${APP_NAME}`,
      skipAcknowledgements: true,
      kafkaTopic: KAFKA_ORACLES_TOPIC
    }
  );

  messageConsumer = messageConsumerParam ?? new MLKafkaConsumer(consumerOptions, logger);
}

async function cleanUpAndExit(exitCode = 0): Promise<void> { 
  eventHandler.destroy();
  await aggregate.destroy();
  await messageConsumer.destroy(true);
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
