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
import {
  AccountLookupAggregate,
  IOracleFinder,
  IOracleProviderFactory,
  IParticipantServiceAdapter,
  AccountLookupPrivilegesDefinition
} from "@mojaloop/account-lookup-bc-domain-lib";
import { IMessageProducer, IMessageConsumer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import {
  MLKafkaJsonConsumer,
  MLKafkaJsonProducer,
  MLKafkaJsonConsumerOptions,
  MLKafkaJsonProducerOptions,
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { MongoOracleFinderRepo, OracleAdapterFactory } from "@mojaloop/account-lookup-bc-implementations-lib";
import {
  AccountLookupBCTopics,
  ACCOUNT_LOOKUP_BOUNDED_CONTEXT_NAME,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import express, { Express } from "express";
import { Server } from "net";
import process from "process";
import { OracleAdminExpressRoutes } from "./routes/oracle_admin_routes";
import { AccountLookupExpressRoutes } from "./routes/account_lookup_routes";
import { IMetrics } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { PrometheusMetrics } from "@mojaloop/platform-shared-lib-observability-client-lib";
import { ParticipantAdapter } from "@mojaloop/account-lookup-bc-implementations-lib";
import { AuthenticatedHttpRequester, AuthorizationClient, TokenHelper } from "@mojaloop/security-bc-client-lib";
import { IAuthenticatedHttpRequester, IAuthorizationClient, ITokenHelper } from "@mojaloop/security-bc-public-types-lib";

// Global vars
const BC_NAME = "account-lookup-bc";
const APP_NAME = "account-lookup-svc";
const APP_VERSION = process.env.npm_package_version || "0.0.0";

// Logger
// service constants
// const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL: LogLevel = (process.env["LOG_LEVEL"] as LogLevel) || LogLevel.DEBUG;

// Message Consumer/Publisher
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
//const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";
const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";

//Oracles
const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_NAME ?? "account-lookup";
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";

const PARTICIPANTS_SVC_URL = process.env["PARTICIPANTS_SVC_URL"] || "http://localhost:3010";
const PARTICIPANTS_CACHE_TIMEOUT_MS =
  (process.env["PARTICIPANTS_CACHE_TIMEOUT_MS"] && parseInt(process.env["PARTICIPANTS_CACHE_TIMEOUT_MS"])) ||
  5 * 60 * 1000;

// Express Server
const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3030;

// Auth Requester
// let authRequester: IAuthenticatedHttpRequester;
const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "account-lookup-bc-account-lookup-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_ID"] || "superServiceSecret";

const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix
const AUTH_N_TOKEN_ISSUER_NAME = process.env["AUTH_N_TOKEN_ISSUER_NAME"] || "mojaloop.vnext.dev.default_issuer";
const AUTH_N_TOKEN_AUDIENCE = process.env["AUTH_N_TOKEN_AUDIENCE"] || "mojaloop.vnext.dev.default_audience";
const AUTH_N_SVC_JWKS_URL = process.env["AUTH_N_SVC_JWKS_URL"] || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;
const AUTH_Z_SVC_BASEURL = process.env["AUTH_Z_SVC_BASEURL"] || "http://localhost:3202";

const consumerOptions: MLKafkaJsonConsumerOptions = {
  kafkaBrokerList: KAFKA_URL,
  kafkaGroupId: `${BC_NAME}_${APP_NAME}`,
};

const producerOptions: MLKafkaJsonProducerOptions = {
  kafkaBrokerList: KAFKA_URL,
  producerClientId: `${BC_NAME}_${APP_NAME}`,
};

// kafka logger
export class Service {
  static logger: ILogger;
  static app: Express;
  static messageConsumer: IMessageConsumer;
  static messageProducer: IMessageProducer;
  static oracleFinder: IOracleFinder;
  static oracleProviderFactory: IOracleProviderFactory;
  static authRequester: IAuthenticatedHttpRequester;
  static participantsServiceAdapter: IParticipantServiceAdapter;
  static aggregate: AccountLookupAggregate;
  static expressServer: Server;
  static metrics: IMetrics;
  static authorizationClient: IAuthorizationClient;
  static tokenHelper: ITokenHelper;

  static async start(
    logger?: ILogger,
    messageConsumer?: IMessageConsumer,
    messageProducer?: IMessageProducer,
    oracleFinder?: IOracleFinder,
    oracleProviderFactory?: IOracleProviderFactory,
    authRequester?: IAuthenticatedHttpRequester,
    participantsServiceAdapter?: IParticipantServiceAdapter,
    metrics?: IMetrics,
    authorizationClient?: IAuthorizationClient,
    tokenHelper?: ITokenHelper
  ): Promise<void> {
    console.log(`Account-lookup-svc - service starting with PID: ${process.pid}`);

    if (!logger) {
      logger = new KafkaLogger(
        ACCOUNT_LOOKUP_BOUNDED_CONTEXT_NAME,
        APP_NAME,
        APP_VERSION,
        kafkaProducerOptions,
        KAFKA_LOGS_TOPIC,
        LOG_LEVEL
      );
      await (logger as KafkaLogger).init();
    }
    globalLogger = this.logger = logger.createChild("Service");

    if (!oracleFinder) {
      oracleFinder = new MongoOracleFinderRepo(logger, MONGO_URL, DB_NAME);
    }
    this.oracleFinder = oracleFinder;

    if (!oracleProviderFactory) {
      oracleProviderFactory = new OracleAdapterFactory(MONGO_URL, DB_NAME, logger);
    }
    this.oracleProviderFactory = oracleProviderFactory;

    if (!messageProducer) {
      const producerLogger = logger.createChild("producerLogger");
      producerLogger.setLogLevel(LogLevel.INFO);
      messageProducer = new MLKafkaJsonProducer(producerOptions, producerLogger);
    }
    this.messageProducer = messageProducer;

    if (!messageConsumer) {
      messageConsumer = new MLKafkaJsonConsumer(consumerOptions, logger);
    }
    this.messageConsumer = messageConsumer;

    if (!authRequester) {
      authRequester = new AuthenticatedHttpRequester(logger, AUTH_N_SVC_TOKEN_URL);
      authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);
    }
    this.authRequester = authRequester;

    if (!participantsServiceAdapter) {
      const authRequester: IAuthenticatedHttpRequester = new AuthenticatedHttpRequester(logger, AUTH_N_SVC_TOKEN_URL);
      authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);
      participantsServiceAdapter = new ParticipantAdapter(
        this.logger,
        PARTICIPANTS_SVC_URL,
        authRequester,
        PARTICIPANTS_CACHE_TIMEOUT_MS
      );
    }
    this.participantsServiceAdapter = participantsServiceAdapter;

    if (!metrics) {
      const labels: Map<string, string> = new Map<string, string>();
      labels.set("bc", BC_NAME);
      labels.set("app", APP_NAME);
      labels.set("version", APP_VERSION);
      PrometheusMetrics.Setup({ prefix: "", defaultLabels: labels }, this.logger);
      metrics = PrometheusMetrics.getInstance();
    }
    this.metrics = metrics;

    // all inits done

    this.messageConsumer.setTopics([AccountLookupBCTopics.DomainRequests]);
    await this.messageConsumer.connect();
    await this.messageConsumer.startAndWaitForRebalance();
    logger.info("Kafka Consumer Initialized");

    await this.messageProducer.connect();

    this.logger.info("Kafka Producer Initialized");

    // authorization client
    if (!authorizationClient) {
        // setup privileges - bootstrap app privs and get priv/role associations
        authorizationClient = new AuthorizationClient(BC_NAME, APP_NAME, APP_VERSION, AUTH_Z_SVC_BASEURL, logger);
        authorizationClient.addPrivilegesArray(AccountLookupPrivilegesDefinition);
        await (authorizationClient as AuthorizationClient).bootstrap(true);
        await (authorizationClient as AuthorizationClient).fetch();
    }
    this.authorizationClient = authorizationClient;

    // token helper
    if (!tokenHelper) {    
      this.tokenHelper = new TokenHelper(AUTH_N_SVC_JWKS_URL, logger, AUTH_N_TOKEN_ISSUER_NAME, AUTH_N_TOKEN_AUDIENCE);
    }
    this.tokenHelper = tokenHelper as TokenHelper;
    await this.tokenHelper.init();

    this.aggregate = new AccountLookupAggregate(
      this.logger,
      this.oracleFinder,
      this.oracleProviderFactory,
      this.messageProducer,
      this.participantsServiceAdapter,
      this.metrics
    );

    await this.aggregate.init();

    await this.setupAndStartExpress();

    this.messageConsumer.setCallbackFn(this.aggregate.handleAccountLookUpEvent.bind(this.aggregate));
    this.logger.info("Aggregate Initialized");
  }

  static async setupAndStartExpress(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Start express server
      this.app = express();
      this.app.use(express.json()); // for parsing application/json
      this.app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

      // Add admin and client http routes
      const oracleAdminRoutes = new OracleAdminExpressRoutes(this.aggregate, this.logger, this.tokenHelper, this.authorizationClient);
      const accountLookupClientRoutes = new AccountLookupExpressRoutes(this.aggregate, this.logger, this.tokenHelper, this.authorizationClient);
      this.app.use("/admin", oracleAdminRoutes.mainRouter);
      this.app.use("/account-lookup", accountLookupClientRoutes.mainRouter);

      // Add health and metrics http routes
      this.app.get("/health", (req: express.Request, res: express.Response) => {
        return res.send({ status: "OK" });
      });
      this.app.get("/metrics", async (req: express.Request, res: express.Response) => {
        const strMetrics = await (this.metrics as PrometheusMetrics).getMetricsForPrometheusScrapper();
        return res.send(strMetrics);
      });

      this.app.use((req, res) => {
        // catch all
        res.send(404);
      });

      this.expressServer = this.app.listen(SVC_DEFAULT_HTTP_PORT, () => {
        this.logger.info(`🚀 Server ready on port ${SVC_DEFAULT_HTTP_PORT}`);
        this.logger.info(`Oracle Admin and Account Lookup server v: ${APP_VERSION} started`);

        resolve();
      });
    });
  }

  static async stop(): Promise<void> {
    this.logger.debug("Tearing down aggregate");
    await this.aggregate.destroy();
    this.logger.debug("Tearing down message consumer");
    await this.messageConsumer.destroy(true);
    this.logger.debug("Tearing down message producer");
    await this.messageProducer.destroy();
    this.logger.debug("Tearing down express server");
    if (this.expressServer) {
      this.expressServer.close();
    }
  }
}

const kafkaProducerOptions = {
  kafkaBrokerList: KAFKA_URL,
};

let globalLogger: ILogger;

/**
 * process termination and cleanup
 */

/* istanbul ignore next */
async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
  console.info(`Service - ${signal} received - cleaning up...`);
  let clean_exit = false;
  setTimeout(() => {
    clean_exit || process.abort();
  }, 5000);

  // call graceful stop routine
  await Service.stop();

  clean_exit = true;
  process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals.bind(this));
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals.bind(this));

//do something when app is closing
/* istanbul ignore next */
process.on("exit", async () => {
  globalLogger.info("Microservice - exiting...");
});

/* istanbul ignore next */
process.on(
  "uncaughtException",
  /* istanbul ignore next */ (err: Error) => {
    globalLogger.error(err);
    console.log("UncaughtException - EXITING...");
    process.exit(999);
  }
);
