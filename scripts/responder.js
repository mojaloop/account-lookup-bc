/// <reference lib="dom" />
import process from "process";

import PubMessages from "@mojaloop/platform-shared-lib-public-messages-lib";
import { MLKafkaJsonConsumer, MLKafkaJsonProducer } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {ConsoleLogger} from "@mojaloop/logging-bc-public-types-lib";
import crypto from "crypto";

const KAFKA_URL = process.env["KAFKA_URL"] || "redpanda-0.customredpandadomain.local:31092,redpanda-1.customredpandadomain.local:31092,redpanda-2.customredpandadomain.local:31092";
const SINGLE_MODE = process.env["SINGLE_MODE"] && Boolean(process.env["SINGLE_MODE"]) || false;
const CONSUMER_BATCH_SIZE = (process.env["CONSUMER_BATCH_SIZE"] && parseInt(process.env["CONSUMER_BATCH_SIZE"])) || 500;
const CONSUMER_BATCH_TIMEOUT_MS = (process.env["CONSUMER_BATCH_TIMEOUT_MS"] && parseInt(process.env["CONSUMER_BATCH_TIMEOUT_MS"])) || 50;


const logger = new ConsoleLogger();
logger.setLogLevel("warn");

const kafkaConsumerOptions = {
    kafkaBrokerList: KAFKA_URL,
    kafkaGroupId: `als_perftest_responder_${crypto.randomUUID()}`,

};

if(!SINGLE_MODE){
    kafkaConsumerOptions.batchSize = CONSUMER_BATCH_SIZE;
    kafkaConsumerOptions.batchTimeoutMs = CONSUMER_BATCH_TIMEOUT_MS;
}

const kafkaProducerOptions = {
    kafkaBrokerList: KAFKA_URL
};


let messageConsumer = new MLKafkaJsonConsumer(kafkaConsumerOptions, logger.createChild());
await messageConsumer.connect();
let messageProducer = new MLKafkaJsonProducer(kafkaProducerOptions, logger);
await messageProducer.connect();

let received=0;
let eventsToPublish = [];
let overallMaxDuration = 0;
let batchMaxDuration = 0;
let batchTotalDuration = 0;
let batchProcessed = 0;
/* test constants */

async function handler(message){
    const now = Date.now();
    if(message.msgName ==="ParticipantQueryResponseEvt") {
        // end of get participant flow - collect timing
        if(!message.fspiopOpaqueState || !message.fspiopOpaqueState.reqSendTimestamp){
            console.log("Could not find message.fspiopOpaqueState.reqSendTimestamp forParticipantQueryResponseEvt");
            return;
        }
        received++;

        const durationMs = now - message.fspiopOpaqueState.reqSendTimestamp;
        if(durationMs > batchMaxDuration) batchMaxDuration = durationMs;
        batchTotalDuration += durationMs;

        if(SINGLE_MODE)
            console.log(`ParticipantQueryResponseEvt received - took: ${durationMs} ms`);
        else
            batchProcessed++;
    }else if(message.msgName ==="PartyInfoRequestedEvt"){
        // respond with PartyInfoAvailableEvt

        const evtPayload = {
            requesterFspId: message.payload.requesterFspId,
            destinationFspId: message.payload.destinationFspId,
            ownerFspId: message.payload.destinationFspId,
            partyType: message.payload.partyType,
            partyId: message.payload.partyId,
            partySubType: message.payload.partySubType || null,
            currency: message.payload.currency,
            partyName: "partynmame",
            partyDoB: new Date(),
        };

        const evt =  new PubMessages.PartyInfoAvailableEvt(evtPayload);

        evt.fspiopOpaqueState = {
            originalRequesterFspId: evtPayload.requesterFspId,
            originalDestination: evtPayload.destinationFspId,
            headers: {},
            reqSendTimestamp: message.fspiopOpaqueState.reqSendTimestamp,
            responseTimestamp: now
        };
        if(SINGLE_MODE) {
            await messageProducer.send(evt);
        }else{
            eventsToPublish.push(evt);
            batchProcessed++;
        }
    }else if(message.msgName === "PartyQueryResponseEvt"){
        // end of get party flow - collect timing
        if(!message.fspiopOpaqueState || !message.fspiopOpaqueState.reqSendTimestamp){
            console.log("Could not find message.fspiopOpaqueState.reqSendTimestamp forParticipantQueryResponseEvt");
            return;
        }
        received++;

        const durationMs = now - message.fspiopOpaqueState.reqSendTimestamp;
        if(durationMs > batchMaxDuration) batchMaxDuration = durationMs;
        batchTotalDuration += durationMs;

        if(SINGLE_MODE)
            console.log(`PartyQueryResponseEvt received - took: ${durationMs} ms`);
        else
            batchProcessed++;
    }

}

async function batchHandler(messages){
    batchProcessed = 0;
    batchTotalDuration = 0;
    batchMaxDuration = 0;
    eventsToPublish = [];

    for(const message of messages){
        await handler(message);
    }

    if(batchMaxDuration > overallMaxDuration) overallMaxDuration = batchMaxDuration;

    if(batchProcessed && batchTotalDuration)
        console.log(`Batch of ${messages.length} processed \tavg: ${Math.ceil(batchTotalDuration/batchProcessed)} \tmax: ${batchMaxDuration} \toverall max: ${overallMaxDuration}`);

    await messageProducer.send(eventsToPublish);
}

async function startPrepareEventHandler() {
    await messageConsumer.setTopics([PubMessages.AccountLookupBCTopics.DomainEvents]);
    if (SINGLE_MODE){
        messageConsumer.setCallbackFn(handler);
    }else{
        messageConsumer.setBatchCallbackFn(batchHandler);
    }
    await messageConsumer.startAndWaitForRebalance();
}

console.log("startPrepareEventHandler starting...");
await startPrepareEventHandler();
console.log("startPrepareEventHandler completed");



async function _handle_int_and_term_signals(signal) {
    console.info(`Service - ${signal} received - cleaning up...`);
    await messageConsumer.stop();
    await messageConsumer.disconnect()
    await messageProducer.disconnect()
    process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals);
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals);

//do something when app is closing
process.on("exit", async () => {
    console.info("Microservice - exiting...");
});
process.on("uncaughtException", (err) => {
    console.error(err, "UncaughtException - EXITING...");
    process.exit(999);
});

