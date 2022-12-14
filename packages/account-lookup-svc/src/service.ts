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
import {AccountLookupAggregate, IOracleFinder, IOracleProviderFactory, IParticipantService} from "@mojaloop/account-lookup-bc-domain";
import {IMessage, IMessageProducer, IMessageConsumer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { MLKafkaJsonConsumer, MLKafkaJsonProducer, MLKafkaJsonConsumerOptions, MLKafkaJsonProducerOptions } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { MongoOracleFinderRepo, OracleAdapterFactory, ParticipantAdapter } from "@mojaloop/account-lookup-bc-implementations";
import express, {Express} from "express";
import { OracleAdminExpressRoutes } from "./routes/oracle_admin_routes";
import { AccountLookupExpressRoutes } from "./routes/account_lookup_routes";
import { Server } from "net";
import { AccountLookupBCTopics } from "@mojaloop/platform-shared-lib-public-messages-lib";

// Global vars
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false; // eslint-disable-line
const BC_NAME = "account-lookup-bc";
const APP_NAME = "account-lookup-svc";
const APP_VERSION = "0.0.1";

// Logger
let logger: ILogger;
const DEFAULT_LOGLEVEL = LogLevel.DEBUG;

// Message Consumer/Publisher 
const KAFKA_LOGS_TOPIC = process.env["ACCOUNT_LOOKUP_KAFKA_LOG_TOPIC"] || "logs";
const KAFKA_URL = process.env["ACCOUNT_LOOKUP_KAFKA_URL"] || "localhost:9092";


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
const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_NAME ?? "account-lookup";
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";

let oracleFinder: IOracleFinder;
let oracleProviderFactory: IOracleProviderFactory;

// Aggregate
let aggregate: AccountLookupAggregate;

// Participant service
const PARTICIPANT_SVC_BASEURL = process.env["PARTICIPANT_SVC_BASEURL"] || "http://127.0.0.1:3010";
const fixedToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InVVbFFjbkpJUk93dDIxYXFJRGpRdnVnZERvUlYzMzEzcTJtVllEQndDbWMifQ.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJwYXJ0aWNpcGFudHMtc3ZjIiwicm9sZXMiOlsiNTI0YTQ1Y2QtNGIwOS00NmVjLThlNGEtMzMxYTVkOTcyNmVhIl0sImlhdCI6MTY2Njc3MTgyOSwiZXhwIjoxNjY3Mzc2NjI5LCJhdWQiOiJtb2phbG9vcC52bmV4dC5kZWZhdWx0X2F1ZGllbmNlIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDozMjAxLyIsInN1YiI6ImFwcDo6cGFydGljaXBhbnRzLXN2YyIsImp0aSI6IjMzNDUyODFiLThlYzktNDcyOC1hZGVkLTdlNGJmMzkyMGZjMSJ9.s2US9fEAE3SDdAtxxttkPIyxmNcACexW3Z-8T61w96iji9muF_Zdj2koKvf9tICd25rhtCkolI03hBky3mFNe4c7U1sV4YUtCNNRgReMZ69rS9xdfquO_gIaABIQFsu1WTc7xLkAccPhTHorartdQe7jvGp-tOSkqA-azj0yGjwUccFhX3Bgg3rWasmJDbbblIMih4SJuWE7MGHQxMzhX6c9l1TI-NpFRRFDTYTg1H6gXhBvtHMXnC9PPbc9x_RxAPBqmMcleIJZiMZ8Cn805OL9Wt_sMFfGPdAQm0l4cdjdesgfQahsrtCOAcp5l7NKmehY0pbLmjvP6zlrDM_D3A";
let participantService: IParticipantService;

// Express Server
const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3030;
let expressApp: Express;
let expressServer: Server;

// Admin routes
let oracleAdminRoutes: OracleAdminExpressRoutes;

// AccountLookupClient routes
let accountLookupClientRoutes: AccountLookupExpressRoutes;


export async function start(loggerParam?:ILogger, messageConsumerParam?:IMessageConsumer, messageProducerParam?:IMessageProducer, oracleFinderParam?:IOracleFinder, 
  oracleProviderFactoryParam?:IOracleProviderFactory,  participantServiceParam?:IParticipantService,
  aggregateParam?:AccountLookupAggregate,
  )
  :Promise<void> {
  console.log(`Account-lookup-svc - service starting with PID: ${process.pid}`);

  try{
    
    await initExternalDependencies(loggerParam, messageConsumerParam, messageProducerParam, oracleFinderParam, oracleProviderFactoryParam, participantServiceParam);

    messageConsumer.setTopics([AccountLookupBCTopics.DomainRequests]);
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
      await aggregate.handleAccountLookUpEvent(message);
    };
    
    messageConsumer.setCallbackFn(callbackFunction);

    // Start express server
    expressApp = express();
    expressApp.use(express.json()); // for parsing application/json
    expressApp.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

    // Add admin and client http routes
    oracleAdminRoutes = new OracleAdminExpressRoutes(aggregate, logger);
    accountLookupClientRoutes = new AccountLookupExpressRoutes(aggregate, logger);
    expressApp.use("/admin", oracleAdminRoutes.mainRouter);
    expressApp.use("/account-lookup", accountLookupClientRoutes.mainRouter);

    expressApp.use((req, res) => {
      // catch all
      res.send(404);
    });

    expressServer = expressApp.listen(SVC_DEFAULT_HTTP_PORT, () => {
      logger.info(`🚀 Server ready at: http://localhost:${SVC_DEFAULT_HTTP_PORT}`);
      logger.info("Oracle Admin and Account Lookup server started");
    });
  }
  catch(err){
    logger.error(err);
    await stop();
  }
}

async function initExternalDependencies(loggerParam?:ILogger, messageConsumerParam?:IMessageConsumer, messageProducerParam?:IMessageProducer, oracleFinderParam?:IOracleFinder, 
  oracleProviderFactoryParam?: IOracleProviderFactory, participantServiceParam?: IParticipantService):Promise<void>  {

  logger = loggerParam ?? new KafkaLogger(BC_NAME, APP_NAME, APP_VERSION,{kafkaBrokerList: KAFKA_URL}, KAFKA_LOGS_TOPIC,DEFAULT_LOGLEVEL);
  
  if (!loggerParam) {
    await (logger as KafkaLogger).init();
    logger.info("Kafka Logger Initialized");
  }
  
  oracleFinder = oracleFinderParam ?? new MongoOracleFinderRepo(logger,MONGO_URL, DB_NAME);
  
  oracleProviderFactory = oracleProviderFactoryParam ?? new OracleAdapterFactory(MONGO_URL, DB_NAME, logger);

  messageProducer = messageProducerParam ?? new MLKafkaJsonProducer(producerOptions, logger);
  
  messageConsumer = messageConsumerParam ?? new MLKafkaJsonConsumer(consumerOptions, logger);

  participantService = participantServiceParam ?? new ParticipantAdapter(logger,PARTICIPANT_SVC_BASEURL, fixedToken);
}

export async function stop(): Promise<void> {
  logger.debug("Tearing down aggregate");
  await aggregate.destroy();
  logger.debug("Tearing down message consumer");
  await messageConsumer.destroy(true);
  logger.debug("Tearing down message producer");
  await messageProducer.destroy();
  logger.debug("Tearing down oracle admin server");
  expressServer.close();
}

/**
 * process termination and cleanup
 */

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
  console.info(`Service - ${signal} received - cleaning up...`);
  let clean_exit = false;
  setTimeout(args => { clean_exit || process.abort();}, 5000);

  // call graceful stop routine
  await stop();

  clean_exit = true;
  process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals.bind(this));
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals.bind(this));

//do something when app is closing
process.on("exit", async () => {
  logger.info("Microservice - exiting...");
});
process.on("uncaughtException", (err: Error) => {
  logger.error(err);
  console.log("UncaughtException - EXITING...");
  process.exit(999);
});
