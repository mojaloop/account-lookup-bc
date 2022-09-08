/**
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

import { UnableToInitMessageProducerError, UnableToDestroyMessageProducerError, UnableToSendMessageProducerError } from "@mojaloop/account-lookup-bc-domain";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { IMessage, IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { MLKafkaProducer } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import { KafkaProducerOptions } from "./types";

 export class KafkaMessageProducer implements IMessageProducer {

	private kafkaProducer: MLKafkaProducer;
	private readonly _logger: ILogger;
	private readonly _kafkaProducerOptions: KafkaProducerOptions;

	constructor(
		logger: ILogger,
		opts: KafkaProducerOptions
	) {
		this._logger = logger;
		this._kafkaProducerOptions = {
			kafkaBrokerList: opts.kafkaBrokerList,
			producerClientId: opts.producerClientId,
			skipAcknowledgements: opts.skipAcknowledgements,
			kafkaTopic: opts.kafkaTopic,
		};
	}
	 
	async connect(): Promise<void> {
		try {
   
			this.kafkaProducer = new MLKafkaProducer(this._kafkaProducerOptions, this._logger);
			
			await this.kafkaProducer.connect();
		
			this._logger.info("kafka producer initialised");
		} catch (e: unknown) {
			this._logger.error("Error initialising kafka producer");
			throw new UnableToInitMessageProducerError();
		}
	}

	async send(value: string|object):Promise<void> {
		try {
			
			const kafkaMessage: IMessage = {
				topic: this._kafkaProducerOptions.kafkaTopic,
				value: value,
				key: null,
				timestamp: Date.now(),
				headers: null
			};
			
			await this.kafkaProducer.send(kafkaMessage);

		} catch (e: unknown) {
			this._logger.error("Error sending message to kafka producer", e);
			throw new UnableToSendMessageProducerError();
		}
	}

	async disconnect(): Promise<void> {
		try {
			this._logger.info("Disconnecting kafka producer");
			await this.kafkaProducer.disconnect();
		} catch (e: unknown) {
			this._logger.error("Error disconnecting kafka producer", e);
			throw new UnableToDestroyMessageProducerError();
		}
	}

	async destroy(): Promise<void>{
		try {
			this._logger.info("Destroying kafka producer");
			await this.kafkaProducer.destroy();
		} catch (e: unknown) {
			this._logger.error("Error destroying kafka producer", e);
			throw new UnableToDestroyMessageProducerError();
		}
	}
}
