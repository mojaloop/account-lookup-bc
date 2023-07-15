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

import { ACCOUNT_LOOKUP_BOUNDED_CONTEXT_NAME, AccountLookupBCTopics } from "@mojaloop/platform-shared-lib-public-messages-lib";
//TODO re-enable configs
//import appConfigs from "./config";
import {
	AccountLookupAggregate,
	IOracleFinder,
	IOracleProviderFactory,
	IParticipantServiceAdapter,
	Privileges
} from "@mojaloop/account-lookup-bc-domain-lib";
import { AuditClient, KafkaAuditClientDispatcher, LocalAuditClientCryptoProvider } from "@mojaloop/auditing-bc-client-lib";
import {
	AuthenticatedHttpRequester,
	AuthorizationClient,
	IAuthenticatedHttpRequester,
	LoginHelper,
	TokenHelper
} from "@mojaloop/security-bc-client-lib";
import {IAuthorizationClient, ILoginHelper} from "@mojaloop/security-bc-public-types-lib";
import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
	MLKafkaJsonConsumer,
	MLKafkaJsonConsumerOptions,
	MLKafkaJsonProducer,
	MLKafkaJsonProducerOptions
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {
	MongoOracleFinderRepo,
	OracleAdapterFactory
} from "@mojaloop/account-lookup-bc-implementations-lib";
import express, { Express } from "express";

import { AccountLookupExpressRoutes } from "./routes/account_lookup_routes";
import { IAuditClient } from "@mojaloop/auditing-bc-public-types-lib";
import { IMetrics } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { OracleAdminExpressRoutes } from "./routes/oracle_admin_routes";
import {
	ParticipantAdapter
} from "@mojaloop/account-lookup-bc-implementations-lib/dist/external_adapters/participant_adapter";
import { PrometheusMetrics } from "@mojaloop/platform-shared-lib-observability-client-lib";
import { Server } from "net";
import { existsSync } from "fs";
import process from "process";

// Global vars
const BC_NAME = "account-lookup-bc";
const APP_NAME = "account-lookup-svc";
const APP_VERSION = process.env.npm_package_version || "0.0.0";
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;

// Logger
// service constants
// const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

// Message Consumer/Publisher
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
//const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";
const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";

//Oracles
const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_NAME ?? "account-lookup";
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";

const PARTICIPANTS_SVC_URL = process.env["PARTICIPANTS_SVC_URL"] || "http://localhost:3010";
const PARTICIPANTS_CACHE_TIMEOUT_MS = (process.env["PARTICIPANTS_CACHE_TIMEOUT_MS"] && parseInt(process.env["PARTICIPANTS_CACHE_TIMEOUT_MS"])) || 5*60*1000;

// Express Server
const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3030;

// Auth Requester
const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "account-lookup-bc-account-lookup-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_ID"] || "superServiceSecret";

const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix

// Token
const AUTH_N_SVC_JWKS_URL = process.env["AUTH_N_SVC_JWKS_URL"] || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;
const AUTH_N_TOKEN_ISSUER_NAME = process.env["AUTH_N_TOKEN_ISSUER_NAME"] || "mojaloop.vnext.dev.default_issuer";
const AUTH_N_TOKEN_AUDIENCE = process.env["AUTH_N_TOKEN_AUDIENCE"] || "mojaloop.vnext.dev.default_audience";


// Audit
const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";
const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";

//Authorization
const AUTH_Z_SVC_BASEURL = process.env["AUTH_Z_SVC_BASEURL"] || "http://localhost:3202";


const consumerOptions: MLKafkaJsonConsumerOptions = {
	kafkaBrokerList: KAFKA_URL,
	kafkaGroupId: `${BC_NAME}_${APP_NAME}`
};

const producerOptions: MLKafkaJsonProducerOptions = {
	kafkaBrokerList: KAFKA_URL,
	producerClientId: `${BC_NAME}_${APP_NAME}`,
};

// kafka logger
export class Service {
	static aggregate: AccountLookupAggregate;
	static app: Express;
	static auditingClient: IAuditClient;
	static authorizationClient: IAuthorizationClient;
	static authRequester: IAuthenticatedHttpRequester;
	static expressServer: Server;
	static logger: ILogger;
	static loginHelper: ILoginHelper;
	static messageConsumer: IMessageConsumer;
	static messageProducer: IMessageProducer;
	static metrics:IMetrics;
	static oracleFinder: IOracleFinder;
	static oracleProviderFactory: IOracleProviderFactory;
	static participantsServiceAdapter: IParticipantServiceAdapter;
	static tokenHelper: TokenHelper;

	static async start(
		auditingClient?: IAuditClient,
		authorizationClient?: IAuthorizationClient,
		authRequester?: IAuthenticatedHttpRequester,
		logger?: ILogger,
		loginHelper?: ILoginHelper,
		messageConsumer?: IMessageConsumer,
		messageProducer?: IMessageProducer,
		metrics?:IMetrics,
		oracleFinder?: IOracleFinder,
		oracleProviderFactory?: IOracleProviderFactory,
		participantsServiceAdapter?: IParticipantServiceAdapter,
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

		// start auditClient
        if (!auditingClient) {
            if (!existsSync(AUDIT_KEY_FILE_PATH)) {
                if (PRODUCTION_MODE){
					process.exit(9);
				}
                // create e tmp file
                LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDIT_KEY_FILE_PATH, 2048);
            }
            const auditLogger = logger.createChild("AuditLogger");
            auditLogger.setLogLevel(LogLevel.INFO);
            const cryptoProvider = new LocalAuditClientCryptoProvider(AUDIT_KEY_FILE_PATH);
            const auditDispatcher = new KafkaAuditClientDispatcher(kafkaProducerOptions, KAFKA_AUDITS_TOPIC, auditLogger);

            // NOTE: to pass the same kafka logger to the audit client, make sure the logger is started/initialized already
            auditingClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, auditDispatcher);
            await auditingClient.init();
        }
        this.auditingClient = auditingClient;

		// authorization client
		if (!authorizationClient) {
			// setup privileges - bootstrap app privs and get priv/role associations
			authorizationClient = new AuthorizationClient(
				BC_NAME, APP_NAME, APP_VERSION, AUTH_Z_SVC_BASEURL, this.logger.createChild("AuthorizationClient")
			);
			addPrivileges(authorizationClient as AuthorizationClient);
			await (authorizationClient as AuthorizationClient).bootstrap(true);
			await (authorizationClient as AuthorizationClient).fetch();

		}
		this.authorizationClient = authorizationClient;


		if (!participantsServiceAdapter) {
			const authRequester:IAuthenticatedHttpRequester = new AuthenticatedHttpRequester(logger, AUTH_N_SVC_TOKEN_URL);
			authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);
			participantsServiceAdapter = new ParticipantAdapter(this.logger, PARTICIPANTS_SVC_URL, authRequester, PARTICIPANTS_CACHE_TIMEOUT_MS);
		}
		this.participantsServiceAdapter = participantsServiceAdapter;

		if(!metrics){
			const labels: Map<string, string> = new Map<string, string>();
			labels.set("bc", BC_NAME);
			labels.set("app", APP_NAME);
			labels.set("version", APP_VERSION);
			PrometheusMetrics.Setup({prefix:"", defaultLabels: labels}, this.logger);
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

		if(!loginHelper){
			loginHelper = new LoginHelper(AUTH_N_SVC_TOKEN_URL, this.logger);
			(loginHelper as LoginHelper).setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);
		}
		this.loginHelper = loginHelper;

		// token helper
		this.tokenHelper = new TokenHelper(AUTH_N_SVC_JWKS_URL, logger, AUTH_N_TOKEN_ISSUER_NAME, AUTH_N_TOKEN_AUDIENCE);
		await this.tokenHelper.init();

		this.aggregate = new AccountLookupAggregate(
			this.auditingClient,
			this.authorizationClient,
            this.logger,
			this.loginHelper,
			this.messageProducer,
			this.metrics,
			this.oracleFinder,
			this.oracleProviderFactory,
			this.participantsServiceAdapter,
		);

		await this.aggregate.init();

		await this.setupAndStartExpress();

		this.messageConsumer.setCallbackFn(this.aggregate.handleAccountLookUpEvent.bind(this.aggregate));
		this.logger.info("Aggregate Initialized");
	}


	static async setupAndStartExpress(): Promise<void> {
		return new Promise<void>(resolve => {
			// Start express server
			this.app = express();
			this.app.use(express.json()); // for parsing application/json
			this.app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

			// Add admin and client http routes
			const oracleAdminRoutes = new OracleAdminExpressRoutes(this.aggregate, this.authorizationClient, this.logger, this.tokenHelper);
			const accountLookupClientRoutes = new AccountLookupExpressRoutes(this.aggregate, this.authorizationClient, this.logger, this.tokenHelper);
			this.app.use("/admin", oracleAdminRoutes.mainRouter);
			this.app.use("/account-lookup", accountLookupClientRoutes.mainRouter);

			// Add health and metrics http routes
			this.app.get("/health", (req: express.Request, res: express.Response) => {return res.send({ status: "OK" }); });
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
		if (this.expressServer){
			this.expressServer.close();
		}
	}

}

function addPrivileges(authorizationClient: AuthorizationClient): void {
	authorizationClient.addPrivilege(
		Privileges.VIEW_PARTICIPANT.id,
		Privileges.VIEW_PARTICIPANT.labelName,
		Privileges.VIEW_PARTICIPANT.description
	);
}

const kafkaProducerOptions = {
	kafkaBrokerList: KAFKA_URL
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
process.on("exit", /* istanbul ignore next */async () => {
	globalLogger.info("Microservice - exiting...");
});
process.on("uncaughtException", /* istanbul ignore next */(err: Error) => {
	globalLogger.error(err);
	console.log("UncaughtException - EXITING...");
	process.exit(999);
});

