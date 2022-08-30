import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { MLKafkaConsumer, MLKafkaConsumerOutputType } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { BC_NAME, APP_NAME, APP_VERSION, LOGLEVEL } from ".";
import { AccountLookUpServiceEventHandler, IEventAccountLookUpServiceHandler } from "./event_handler";
import { AccountLookupAggregate } from "@mojaloop/account-lookup-bc-domain";

const KAFKA_ORACLES_TOPIC = "account-lookup";
const KAFKA_LOGS_TOPIC = "logs";
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";


let kafkaConsumer:MLKafkaConsumer;
let accountLookUpEventHandler: IEventAccountLookUpServiceHandler;
let logger:ILogger;


export async function setupKafkaConsumer(aggregate: AccountLookupAggregate): Promise<void> {
 
  // Kafka Event Handler
  const kafkaConsumerOptions = {
    kafkaBrokerList: KAFKA_URL,
    kafkaGroupId: `${BC_NAME}_${APP_NAME}`,
    outputType: MLKafkaConsumerOutputType.Json
  }


    accountLookUpEventHandler = new AccountLookUpServiceEventHandler(logger,aggregate);
    accountLookUpEventHandler.init();
  
    kafkaConsumer = new MLKafkaConsumer(kafkaConsumerOptions, logger);
    kafkaConsumer.setTopics([KAFKA_ORACLES_TOPIC]);
    kafkaConsumer.setCallbackFn(processMessage);
    await kafkaConsumer.connect();
    await kafkaConsumer.start();
  
    logger.info("kafkaConsumer initialised");
        
    async function processMessage(message: IMessage): Promise<void> {
        logger.debug(`Got message in handler: ${JSON.stringify(message, null, 2)}`);
        accountLookUpEventHandler.publishAccountLookUpEvent(message);
      }
}

export async function setupKafkaLogger(): Promise<ILogger> {
  const kafkaProducerOptions = {
    kafkaBrokerList: KAFKA_URL
  };
  
  logger = new KafkaLogger(
    BC_NAME,
    APP_NAME,
    APP_VERSION,
    kafkaProducerOptions,
    KAFKA_LOGS_TOPIC,
    LOGLEVEL
  );

  await (logger as KafkaLogger).start();

  return logger;
}

process.on('exit', () => {
  logger.info("Example server - Disconecting Kafka and Events..."); 
  setTimeout(async ()=>{
    accountLookUpEventHandler.destroy();
    await kafkaConsumer.destroy(true);
  }, 0);
  
});