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
import {AccountLookupAggregate, IOracleFinder, IOracleProviderAdapter, IOracleProviderFactory, IParticipantService} from "@mojaloop/account-lookup-bc-domain";
import {IMessage, IMessageProducer, IMessageConsumer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { MLKafkaJsonConsumer, MLKafkaJsonProducer, MLKafkaJsonConsumerOptions, MLKafkaJsonProducerOptions } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { ParticipantClient } from "@mojaloop/account-lookup-bc-client";
import { MongoOracleFinderRepo, MongoOracleProviderRepo, OracleAdapterFactory } from "@mojaloop/account-lookup-bc-infrastructure";
import express, {Express} from "express";
import { ExpressRoutes } from "./server/admin_routes";
import { Server } from "net";

// Global vars
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false; // eslint-disable-line
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
const consumerOptions: MLKafkaJsonConsumerOptions = {
  kafkaBrokerList: KAFKA_URL,
  kafkaGroupId: `${BC_NAME}_${APP_NAME}`
};

let messageProducer: IMessageProducer;
const producerOptions : MLKafkaJsonProducerOptions = {
  kafkaBrokerList: KAFKA_URL,
  producerClientId: `${BC_NAME}_${APP_NAME}`,
  skipAcknowledgements: true,
  
};

//Oracles
const DB_HOST: string = process.env.ACCOUNT_LOOKUP_DB_HOST ?? "localhost";
const DB_PORT_NO: number = parseInt(process.env.ACCOUNT_LOOKUP_DB_PORT_NO ?? "") || 27017;
const DB_URL = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
let oracleFinder: IOracleFinder;
let oracleProviderFactory: IOracleProviderFactory;

// Aggregate
let aggregate: AccountLookupAggregate;

// Participant server
let participantService: IParticipantService;

// Admin server
let expressApp: Express;
let oracleAdminServer: Server;


export async function start(loggerParam?:ILogger, messageConsumerParam?:IMessageConsumer, messageProducerParam?:IMessageProducer, oracleFinderParam?:IOracleFinder, 
  oracleProviderFactoryParam?:IOracleProviderFactory,  participantServiceParam?:IParticipantService, aggregateParam?:AccountLookupAggregate,
  ):Promise<void> {
  
  try{
    
    await initExternalDependencies(loggerParam, messageConsumerParam, messageProducerParam, oracleFinderParam, oracleProviderFactoryParam, participantServiceParam);

    messageConsumer.setTopics([KAFKA_ORACLES_TOPIC]);
    await messageConsumer.connect();
    await messageConsumer.start();
    logger.info("Kafka Consumer Initialized");

    await messageProducer.connect();
   
    logger.info("Kafka Producer Initialized");    
    aggregate = aggregateParam ?? new AccountLookupAggregate(logger, oracleFinder, oracleProviderFactory, messageProducer, participantService);
    
    await aggregate.init();
    logger.info("Aggregate Initialized");


    const callbackFunction = async (message:IMessage):Promise<void> => {
      logger.debug(`Got message in handler: ${JSON.stringify(message, null, 2)}`);
      await aggregate.publishAccountLookUpEvent(message);
    };
    
    messageConsumer.setCallbackFn(callbackFunction);  

  }
  catch(err){
    logger.error(err);
    await tearDown(1);
  }
}

async function initExternalDependencies(loggerParam?:ILogger, messageConsumerParam?:IMessageConsumer, messageProducerParam?:IMessageProducer, oracleFinderParam?:IOracleFinder, 
  oracleProviderFactoryParam?: IOracleProviderFactory, participantServiceParam?: IParticipantService):Promise<void>  {

  logger = loggerParam ?? new KafkaLogger(BC_NAME, APP_NAME, APP_VERSION,{kafkaBrokerList: KAFKA_URL}, KAFKA_LOGS_TOPIC,DEFAULT_LOGLEVEL);
  
  if (!loggerParam) {
    await (logger as KafkaLogger).start();
    logger.info("Kafka Logger Initialized");
  }
  
  oracleFinder = oracleFinderParam ?? new MongoOracleFinderRepo(logger,DB_URL);
  
  oracleProviderFactory = oracleProviderFactoryParam ?? new OracleAdapterFactory(logger);

  messageProducer = messageProducerParam ?? new MLKafkaJsonProducer(producerOptions, logger);
  
  messageConsumer = messageConsumerParam ?? new MLKafkaJsonConsumer(consumerOptions, logger);

  participantService = participantServiceParam ?? new ParticipantClient(logger);
}


export function startOracleAdminServer():void {
  expressApp = express();
  expressApp.use(express.json()); // for parsing application/json
  expressApp.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

  const routes = new ExpressRoutes(aggregate, logger);

  expressApp.use("/admin", routes.MainRouter);

  expressApp.use((req, res) => {
      // catch all
      res.send(404);
  });

  let portNum = 3030;

  oracleAdminServer = expressApp.listen(portNum, () => {
      logger.info(`🚀 Server ready at: http://localhost:${portNum}`);
      logger.info("Oracle Admin Server started");
  });
}



export async function tearDown(code:number): Promise<void> { 
  logger.debug("Tearing down aggregate");
  await aggregate.destroy();
  logger.debug("Tearing down message consumer");
  await messageConsumer.destroy(true);
  logger.debug("Tearing down message producer");
  await messageProducer.destroy();
  logger.debug("Tearing down oracle admin server");
  oracleAdminServer.close();
  process.exit(code);
}

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    logger?.info(`Service - ${signal} received - cleaning up...`);
    await tearDown(0);
}


// catches ctrl+c event
process.once("SIGINT", _handle_int_and_term_signals.bind(this));

//catches program termination event
process.once("SIGTERM", _handle_int_and_term_signals.bind(this));

//do something when app is closing
process.on('exit', (code) => {
  logger?.info("Example server - exiting...");
  setTimeout(async ()=>{
      await tearDown(code);
  }, 0);
});

