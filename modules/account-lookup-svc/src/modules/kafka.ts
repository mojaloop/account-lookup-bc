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

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { MLKafkaConsumer, MLKafkaConsumerOptions, MLKafkaConsumerOutputType } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { BC_NAME, APP_NAME } from "..";
import { CallbackFunction } from "../types";

export interface IEventAccountLookUpKafka{
  init():Promise<void>;
  setKakfaCallback(processMessageCallback:CallbackFunction):void;
  destroy(): Promise<void>;
}

export class EventAccountLookupKafka implements IEventAccountLookUpKafka{

  private KAFKA_ORACLES_TOPIC = "account-lookup";
  private KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";

  private kafkaConsumer: MLKafkaConsumer;
  private readonly _logger: ILogger;
  private readonly _kafkaConsumerOptions: MLKafkaConsumerOptions;
 
  constructor(logger: ILogger) {
    this._logger = logger;
    this._kafkaConsumerOptions = {
      kafkaBrokerList: this.KAFKA_URL,
      kafkaGroupId: `${BC_NAME}_${APP_NAME}`,
      outputType: MLKafkaConsumerOutputType.Json
    };
  }

  async init(): Promise<void> {
   
   try{
   
    this.kafkaConsumer = new MLKafkaConsumer(this._kafkaConsumerOptions, this._logger);
    this.kafkaConsumer.setTopics([this.KAFKA_ORACLES_TOPIC]);
    
    await this.kafkaConsumer.connect();
    await this.kafkaConsumer.start();
  
    this._logger.info("kafka consumer initialised");
    }
    catch(err){
      this._logger.error("Error initialising kafka consumer");
      throw err;
    }

  }

  setKakfaCallback(processMessageCallback: CallbackFunction): void {
    const processMessage = (message: IMessage): Promise<void> => {
      this._logger.debug(`Got message in handler: ${JSON.stringify(message, null, 2)}`);
      try{
        processMessageCallback(message);
      }
      catch(err){
        this._logger.error("Error processing message", err);
      }
      return Promise.resolve();
    };
    this.kafkaConsumer.setCallbackFn(processMessage);
  }


  async destroy(): Promise<void> {
    try{
      this._logger.info("Destroying kafka consumer");
      await this.kafkaConsumer.destroy(true);
    }
    catch(err){
      this._logger.error("Error destroying kafka consumer");
      throw err;
    }
    
  }

}



