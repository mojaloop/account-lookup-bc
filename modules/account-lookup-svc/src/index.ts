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

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 ******/

"use strict";

//TODO re-enable configs
//import appConfigs from "./config";

import {LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {AccountLookupAggregate, IOracleFinder, IOracleProvider} from "@mojaloop/account-lookup-bc-domain";
import {MongoOracleFinderRepo, MongoOracleProviderRepo} from "@mojaloop/account-lookup-bc-infrastructure";
import { logger, setupKafkaConsumer } from "./kafka_setup";


const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
export const BC_NAME = "account-lookup-bc";
export const APP_NAME = "account-lookup-svc";
export const APP_VERSION = "0.0.1";
export const LOGLEVEL = LogLevel.DEBUG;

const DB_HOST: string = process.env.ACCOUNT_LOOKUP_DB_HOST ?? "localhost";
const DB_PORT_NO: number =
    parseInt(process.env.ACCOUNT_LOOKUP_DB_PORT_NO ?? "") || 27017;
const DB_URL: string = `mongodb://${DB_HOST}:${DB_PORT_NO}`;
const DB_NAME: string = "account-lookup";
const ORACLE_PROVIDERS_COLLECTION_NAME: string = "oracle-providers";
const ORACLE_PROVIDER_PARTIES_COLLECTION_NAME: string = "oracle-provider-parties";

let oracleFinder: IOracleFinder = new MongoOracleFinderRepo(
  logger,
	DB_URL,
	DB_NAME,
	ORACLE_PROVIDERS_COLLECTION_NAME
);
let oracleProvider: IOracleProvider[] = [new MongoOracleProviderRepo(
  logger,
	DB_URL,
	DB_NAME,
	ORACLE_PROVIDER_PARTIES_COLLECTION_NAME
)];

let accountLookupAggregate: AccountLookupAggregate;


async function start():Promise<void> {

  accountLookupAggregate = new AccountLookupAggregate(logger, oracleFinder, oracleProvider);
  accountLookupAggregate.init();
    
  await setupKafkaConsumer(accountLookupAggregate);
  
}

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
    setTimeout(async ()=>{
      accountLookupAggregate.destroy();
    }, 0);
    
});


start().catch((err:unknown) => {
    logger.fatal(err);
});
