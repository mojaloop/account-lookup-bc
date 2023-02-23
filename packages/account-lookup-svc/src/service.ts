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
	IParticipantService
} from "@mojaloop/account-lookup-bc-domain-lib";
import {IMessage, IMessageProducer, IMessageConsumer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {
	MLKafkaJsonConsumer,
	MLKafkaJsonProducer,
	MLKafkaJsonConsumerOptions,
	MLKafkaJsonProducerOptions
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {
	MongoOracleFinderRepo,
	OracleAdapterFactory,
	ParticipantAdapter
} from "@mojaloop/account-lookup-bc-implementations-lib";
import {AccountLookupBCTopics, BOUNDED_CONTEXT_NAME} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {
	AuthenticatedHttpRequester,
	IAuthenticatedHttpRequester
} from "@mojaloop/security-bc-client-lib";
import express, {Express} from "express";
import {Server} from "net";
import process from "process";
import {OracleAdminExpressRoutes} from "./routes/oracle_admin_routes";
import {AccountLookupExpressRoutes} from "./routes/account_lookup_routes";

// Global vars
const BC_NAME = "account-lookup-bc";
const APP_NAME = "account-lookup-svc";
const APP_VERSION = process.env.npm_package_version || "0.0.0";

// Logger
// service constants
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

// Message Consumer/Publisher
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
//const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";
const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";

//Oracles
const DB_NAME = process.env.ACCOUNT_LOOKUP_DB_NAME ?? "account-lookup";
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:example@localhost:27017/";

const PARTICIPANTS_SVC_URL = process.env["PARTICIPANTS_SVC_URL"] || "http://localhost:3010";
const HTTP_CLIENT_TIMEOUT_MS = 10_000;

// Express Server
const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3030;

// Auth Requester
let authRequester: IAuthenticatedHttpRequester;
const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "account-lookup-bc-account-lookup-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_ID"] || "superServiceSecret";

const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix
const AUTH_N_TOKEN_ISSUER_NAME = process.env["AUTH_N_TOKEN_ISSUER_NAME"] || "mojaloop.vnext.dev.default_issuer";
const AUTH_N_TOKEN_AUDIENCE = process.env["AUTH_N_TOKEN_AUDIENCE"] || "mojaloop.vnext.dev.default_audience";

const consumerOptions: MLKafkaJsonConsumerOptions = {
	kafkaBrokerList: KAFKA_URL,
	kafkaGroupId: `${BC_NAME}_${APP_NAME}`
};

const producerOptions: MLKafkaJsonProducerOptions = {
	kafkaBrokerList: KAFKA_URL,
	producerClientId: `${BC_NAME}_${APP_NAME}`,
};

// kafka logger
const kafkaProducerOptions = {
	kafkaBrokerList: KAFKA_URL
}

let globalLogger: ILogger;

export class Service {
	static logger: ILogger;
	static app: Express;
	static messageConsumer: IMessageConsumer
	static messageProducer: IMessageProducer
	static oracleFinder: IOracleFinder
	static oracleProviderFactory: IOracleProviderFactory
	static authRequester: IAuthenticatedHttpRequester
	static participantsServiceAdapter: IParticipantService
	static aggregate: AccountLookupAggregate
	static expressServer: Server;


	static async start(
		logger?: ILogger,
		messageConsumer?: IMessageConsumer,
		messageProducer?: IMessageProducer,
		oracleFinder?: IOracleFinder,
		oracleProviderFactory?: IOracleProviderFactory,
		authRequester?: IAuthenticatedHttpRequester,
		participantsServiceAdapter?: IParticipantService,
		aggregateParam?: AccountLookupAggregate
	): Promise<void> {
		console.log(`Account-lookup-svc - service starting with PID: ${process.pid}`);

		if (!logger) {
			logger = new KafkaLogger(
				BOUNDED_CONTEXT_NAME,
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
			messageProducer = new MLKafkaJsonProducer(producerOptions, logger);
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
			const participantLogger = logger.createChild("participantLogger");
			participantLogger.setLogLevel(LogLevel.INFO);
			participantsServiceAdapter = new ParticipantAdapter(participantLogger, PARTICIPANTS_SVC_URL, authRequester, HTTP_CLIENT_TIMEOUT_MS);
		}
		this.participantsServiceAdapter = participantsServiceAdapter;

		// all inits done

		this.messageConsumer.setTopics([AccountLookupBCTopics.DomainRequests]);
		await this.messageConsumer.connect();
		await this.messageConsumer.start();
		logger.info("Kafka Consumer Initialized");

		await this.messageProducer.connect();

		this.logger.info("Kafka Producer Initialized");
		this.aggregate = new AccountLookupAggregate(
			this.logger,
			this.oracleFinder,
			this.oracleProviderFactory,
			this.messageProducer,
			this.participantsServiceAdapter
		);

		await this.aggregate.init();
		this.logger.info("Aggregate Initialized");


		const callbackFunction = async (message: IMessage): Promise<void> => {
			this.logger.debug(`Got message in handler: ${JSON.stringify(message, null, 2)}`);
			await this.aggregate.handleAccountLookUpEvent(message);
		};

		this.messageConsumer.setCallbackFn(callbackFunction);

		this.setupAndStartExpress();
	}

	static setupAndStartExpress(): void {
		// Start express server
		this.app = express();
		this.app.use(express.json()); // for parsing application/json
		this.app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

		// Add admin and client http routes
		const oracleAdminRoutes = new OracleAdminExpressRoutes(this.aggregate, this.logger);
		const accountLookupClientRoutes = new AccountLookupExpressRoutes(this.aggregate, this.logger);
		this.app.use("/admin", oracleAdminRoutes.mainRouter);
		this.app.use("/account-lookup", accountLookupClientRoutes.mainRouter);

		this.app.use((req, res) => {
			// catch all
			res.send(404);
		});

		this.expressServer = this.app.listen(SVC_DEFAULT_HTTP_PORT, () => {
			this.logger.info(`🚀 Server ready on port ${SVC_DEFAULT_HTTP_PORT}`);
			this.logger.info(`Oracle Admin and Account Lookup server v: ${APP_VERSION} started`);
		});
	}

	static async stop(): Promise<void> {
		this.logger.debug("Tearing down aggregate");
		await this.aggregate.destroy();
		this.logger.debug("Tearing down message consumer");
		await this.messageConsumer.destroy(true);
		this.logger.debug("Tearing down message producer");
		await this.messageProducer.destroy();
		this.logger.debug("Tearing down oracle finder");
		await this.oracleFinder.destroy();
		this.logger.debug("Tearing down express server");
		if (this.expressServer) this.expressServer.close();
	}

}

/**
 * process termination and cleanup
 */

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
process.on("exit", async () => {
	globalLogger.info("Microservice - exiting...");
});
process.on("uncaughtException", (err: Error) => {
	globalLogger.error(err);
	console.log("UncaughtException - EXITING...");
	process.exit(999);
});
