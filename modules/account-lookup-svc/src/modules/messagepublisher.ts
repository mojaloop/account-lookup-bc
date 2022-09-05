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

 import { IMessagePublisher } from "@mojaloop/account-lookup-bc-domain";
 import { KafkaMessagePublisher } from "@mojaloop/account-lookup-bc-infrastructure";
 import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
 
 export interface IEventAccountLookupMessagePublisher{
     init():Promise<void>;
     getMessagePublisher():IMessagePublisher;
     destroy(): Promise<void>;
   }
 
 export class EventAccountLookupMessagePublisher implements IEventAccountLookupMessagePublisher{
       
    private KAFKA_PRODUCER_CLIENT_ID = "account-lookup";
    private KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
  
     private readonly _logger: ILogger;
     private readonly _messagePublisher: IMessagePublisher;
 
     constructor(logger:ILogger){
         this._logger = logger;
         this._messagePublisher = new KafkaMessagePublisher(
             this._logger,
              {
                kafkaBrokerList: this.KAFKA_URL,
                producerClientId: this.KAFKA_PRODUCER_CLIENT_ID,
                skipAcknowledgements: true,
            }
           );
     }
 
     async init(): Promise<void> {
      try{
             this._logger.info("Initializing Message Publisher");
             await this._messagePublisher.init();
             this._logger.info("Message Publisher Initialized");
         }
         catch(err){
             this._logger.error("Unable to initialize Oracles");
             throw err;
         }
       }
 
       getMessagePublisher(): IMessagePublisher {
           return this._messagePublisher;
       }
 
 
       async destroy(): Promise<void> {
         try{
             this._logger.info("Destroying Message Publisher");
             await this._messagePublisher.destroy();
             this._logger.info("Message Publisher Destroyed");

         }
         catch(err){
             this._logger.error("Unable to destroy Message Publisher");
             throw err;
         }
       }
 
   }