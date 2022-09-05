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
import {AccountLookupAggregate} from "@mojaloop/account-lookup-bc-domain";
import { AccountLookUpEventHandler, IAccountLookUpEventHandler } from "./modules/event_handler";
import { EventAccountLookupKafka, IEventAccountLookUpKafka } from "./modules/kafka";
import { EventAccountLookupLogger, IEventAccountLookUpLogger } from "./modules/logger";
import { AccountLookUpOracles, IAccountLookUpOracles } from "./modules/oracles";
import { EventAccountLookupMessagePublisher, IEventAccountLookupMessagePublisher } from "./modules/messagepublisher";

// eslint-disable-next-line
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
export const BC_NAME = "account-lookup-bc";
export const APP_NAME = "account-lookup-svc";
export const APP_VERSION = "0.0.1";

let accountLookupAggregate: AccountLookupAggregate;
let accountLookUpEventHandler: IAccountLookUpEventHandler;
let oracles: IAccountLookUpOracles;
let kafka : IEventAccountLookUpKafka;
let kafkaMessagePublisher : IEventAccountLookupMessagePublisher;
let logger: IEventAccountLookUpLogger;

async function start():Promise<void> {
  
  try{
    // Create the logger
    logger = new EventAccountLookupLogger();
    await logger.init();

    // Create oracles
    oracles = new AccountLookUpOracles(logger.get());
    await oracles.init();
  
    // Create the logger
    kafkaMessagePublisher = new EventAccountLookupMessagePublisher(logger.get());
    await kafkaMessagePublisher.init();
    
    // Create the aggregate
    accountLookupAggregate = new AccountLookupAggregate(logger.get(), oracles.getOracleFinder(), oracles.getOracleProvider(), kafkaMessagePublisher.getMessagePublisher());
    await accountLookupAggregate.init();

    // Create the event handler
    accountLookUpEventHandler = new AccountLookUpEventHandler(logger.get(), accountLookupAggregate);
    accountLookUpEventHandler.init();
    
    // Create the kafka
    kafka = new EventAccountLookupKafka(logger.get());
    await kafka.init();
    kafka.setKakfaCallback((message:IMessage)=>accountLookUpEventHandler.publishAccountLookUpEvent(message));
  }
  catch(err){
    logger.get().fatal(err);
    throw err;
  }
   
}

async function cleanUpAndExit(exitCode = 0): Promise<void> { 
  accountLookUpEventHandler.destroy();
  await accountLookupAggregate.destroy();
  await kafka.destroy();
  await kafkaMessagePublisher.destroy();
  process.exitCode = exitCode;
}

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    logger.get().info(`Service - ${signal} received - cleaning up...`);
    await cleanUpAndExit();
}


//catches ctrl+c event
process.once("SIGINT", _handle_int_and_term_signals.bind(this));

//catches program termination event
process.once("SIGTERM", _handle_int_and_term_signals.bind(this));

//do something when app is closing
process.on('exit', (code) => {
  logger.get().info("Example server - exiting...");
  setTimeout(async ()=>{
    await cleanUpAndExit(code);
  }, 0);
});

start();
