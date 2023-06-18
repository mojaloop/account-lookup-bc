/// <reference lib="dom" />
import process from "process";
import {randomUUID} from "crypto";

import PubMessages, {TransferFulfilCommittedRequestedEvt} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { MLKafkaJsonConsumer, MLKafkaJsonProducer } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {ConsoleLogger} from "@mojaloop/logging-bc-public-types-lib";

const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";

const logger = new ConsoleLogger();
logger.setLogLevel("info");

const kafkaConsumerOptions = {
    kafkaBrokerList: KAFKA_URL,
    kafkaGroupId: `transfs_perftest2_sender`
};
const kafkaProducerOptions = {
    kafkaBrokerList: KAFKA_URL
};


// let messageConsumer = new MLKafkaJsonConsumer(kafkaConsumerOptions, logger.createChild));
// await messageConsumer.connect();
let messageProducer = new MLKafkaJsonProducer(kafkaProducerOptions, logger);
await messageProducer.connect();

const MESSAGE_COUNT = 0;
const BATCH_SIZE = 600;
const BATCH_WAIT_MS = 500;

let sent=0;

/* test constants */
const requesterFspId = "bluebank";
const ownerFspId = "greenbank";
const partyType = "MSISDN";
const partyId = "green_acc_1";
const partySubType = null;
const currency = "EUR";

async function sendParticipantQueryReceivedEvt(batchSize){
    const now = Date.now();
    const toSend = [];

    for(let i=0; i<batchSize; i++){
        const msgPayload = {
            requesterFspId: "bluebank",
            partyType: "MSISDN",
            partyId: "green_acc_1",
            partySubType: null,
            currency: "EUR",
        };

        const evt = new PubMessages.ParticipantQueryReceivedEvt(msgPayload);
        evt.fspiopOpaqueState = {
            headers: {
                "fspiop-source": requesterFspId,
                // "fspiop-destination": payeeId
            },
            reqSendTimestamp:now
        }
        evt.msgKey = evt.payload.requesterFspId;
        toSend.push(evt);
    }

    await messageProducer.send(toSend);

    const elapsedSecs = (Date.now()-startTime)/1000;
    console.log(`Batch sent - batchsize: ${batchSize} - total sent: ${sent} - elapsedSecs: ${elapsedSecs} avg msg/sec: ${sent/elapsedSecs}`);
}

async function sendPartyQueryReceivedEvt(batchSize){
    const now = Date.now();
    const toSend = [];

    for(let i=0; i<batchSize; i++){
        const msgPayload = {
            requesterFspId: requesterFspId,
            destinationFspId: ownerFspId,
            partyType: partyType,
            partyId: partyId,
            partySubType: partySubType,
            currency: currency,
        };

        const evt = new PubMessages.PartyQueryReceivedEvt(msgPayload);
        evt.fspiopOpaqueState = {
            headers: {},
            requesterFspId: requesterFspId,
            destinationFspId: ownerFspId,
            reqSendTimestamp:now
        }
        evt.msgKey = evt.payload.requesterFspId;
        toSend.push(evt);
    }

    await messageProducer.send(toSend);

    const elapsedSecs = (Date.now()-startTime)/1000;
    console.log(`Batch sent - batchsize: ${batchSize} - total sent: ${sent} - elapsedSecs: ${elapsedSecs} avg msg/sec: ${sent/elapsedSecs}`);
}


async function send() {
    // await sendParticipantQueryReceivedEvt(BATCH_SIZE);
    await sendPartyQueryReceivedEvt(BATCH_SIZE);

    sent = sent + BATCH_SIZE;

    if(MESSAGE_COUNT==0 || sent <= MESSAGE_COUNT){
        setTimeout(send, BATCH_WAIT_MS);
    }else{
        setTimeout(process.exit(), 1000);
    }

}

let startTime = Date.now();

send();


async function _handle_int_and_term_signals(signal) {
    console.info(`Service - ${signal} received - cleaning up...`);
    // await messageConsumer.stop();
    // await messageConsumer.disconnect()
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

