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

 * Interledger Foundation
 - Pedro Sousa Barreto <pedrosousabarreto@gmail.com>

 --------------
 ******/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    AccountLookupAggregate
} from "@mojaloop/account-lookup-bc-domain-lib";
import {
    DomainEventMsg,
    IMessage,
    IMessageConsumer,
    IMessageProducer
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    Context,
    IGauge,
    IHistogram,
    IMetrics,
    ITracing,
    Tracer
} from "@mojaloop/platform-shared-lib-observability-types-lib";
import {OpenTelemetryClient} from "@mojaloop/platform-shared-lib-observability-client-lib";
import {
    AccountLookupBCTopics,
    PartyInfoRequestedEvt,
    PartyQueryResponseEvt,


} from "@mojaloop/platform-shared-lib-public-messages-lib";

import {SpanKind, SpanOptions} from "@opentelemetry/api";


// These need to match the simulator - Should go to the observability types
export const TRACING_REQ_START_TS_HEADER_NAME="tracing-request-start-timestamp";
export const TRACING_RESP_START_TS_HEADER_NAME="tracing-response-start-timestamp";


export class AccountLookupEventHandler{
    private readonly _logger: ILogger;
    private readonly _metrics: IMetrics;
    private readonly _durationsHisto: IHistogram;
    private readonly _histo: IHistogram;
    private readonly _tracer: Tracer;
    private readonly _aggregate: AccountLookupAggregate;
    private readonly _messageConsumer: IMessageConsumer;
    private readonly _messageProducer: IMessageProducer;
    private _batchSizeGauge:IGauge;

    //#region Initialization
    constructor(
        logger: ILogger,
        aggregate: AccountLookupAggregate,
        messageConsumer: IMessageConsumer,
        messageProducer: IMessageProducer,
        metrics: IMetrics,
        tracing: ITracing
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._messageConsumer = messageConsumer;
        this._messageProducer = messageProducer;
        this._aggregate = aggregate;
        this._metrics = metrics;

        this._durationsHisto = metrics.getHistogram("AccountLookupDurations", "Duration by leg/phase", ["leg"]);
        this._histo = this._metrics.getHistogram("AccountLookupAggregate", "AccountLookupAggregate calls", [
            "callName",
            "success",
        ]);

        this._batchSizeGauge = metrics.getGauge("AccountLookupEventHandler_batchSize");
        this._tracer = tracing.trace.getTracer(this.constructor.name);
    }

    async start(): Promise<void> {
        this._logger.info(`${this.constructor.name} Initialising...`);
        await this._aggregate.init();

        await this._messageProducer.connect();

        // create and start the consumer handler
        this._messageConsumer.setTopics([AccountLookupBCTopics.DomainRequests]);
        this._messageConsumer.setBatchCallbackFn(this._batchMsgHandler.bind(this));
        await this._messageConsumer.connect();
        await this._messageConsumer.startAndWaitForRebalance();

        this._logger.info(`${this.constructor.name} Initialised`);
    }

    async destroy(): Promise<void> {
        this._logger.info(`${this.constructor.name} Destroying...`);
        await this._messageConsumer.stop();
        await this._aggregate.destroy();
        this._logger.info(`${this.constructor.name} Destroyed`);
    }

    private async _batchMsgHandler(receivedMessages: IMessage[]): Promise<void>{
        const startTime = Date.now();
        const timerEndFn = this._histo.startTimer({ callName: "handleAccountLookUpEventBatch"});
        const outputEvents: DomainEventMsg[] = [];

        this._batchSizeGauge.set(receivedMessages.length);

        try {
            for (const message of receivedMessages) {
                this._histo.observe({callName:"msgDelay"}, (Date.now() - message.msgTimestamp)/1000);
                const handlerTimerEndFn = this._histo.startTimer({callName: "handleAccountLookUpEvent"});

                const context =  OpenTelemetryClient.getInstance().propagationExtract(message.tracingInfo);

                const spanName = `processEvent ${message.msgName}`;
                const spanOptions: SpanOptions = {
                    kind: SpanKind.CONSUMER,
                    attributes: {
                        "msgName": message.msgName,
                        "entityId": message.payload.partyId,
                        "partyId": message.payload.partyId,
                        "batchSize": receivedMessages.length
                    }
                };

                await this._tracer.startActiveSpan(spanName, spanOptions, context, async (span) => {
                    const eventToPublish: DomainEventMsg = await this._aggregate.handleEvent(message);
                    handlerTimerEndFn({success: "true"});

                    if (eventToPublish){
                        // pass-through the opaque fspiop state
                        eventToPublish.fspiopOpaqueState = message.fspiopOpaqueState;

                        // propagate tracingInfo to output event
                        eventToPublish.tracingInfo = {};
                        OpenTelemetryClient.getInstance().propagationInject(eventToPublish.tracingInfo);

                        outputEvents.push(eventToPublish);
                    }

                    // metrics
                    this._recordMetricsFromContext(eventToPublish.msgName, context);

                    span.end();
                });
            }
        }catch (error:unknown){
            timerEndFn({success: "false"});
            const errorMessage = "Unknown error while handling message batch";
            this._logger.error(errorMessage, error);
            throw error;
        }finally {
            if (outputEvents) {
                const timerEndFn_kafkaSend = this._histo.startTimer({
                    callName: "handleAccountLookUpEventBatch - producer send",
                });
                await this._messageProducer.send(outputEvents);
                timerEndFn_kafkaSend({success: "true"});
            }

            this._logger.isDebugEnabled() && this._logger.debug(`  Completed batch in AccountLookupAggregate batch size: ${receivedMessages.length}`);
            this._logger.isDebugEnabled() && this._logger.debug(`  Took: ${Date.now() - startTime}`);
            this._logger.isDebugEnabled() && this._logger.debug("\n\n");
            timerEndFn({success: "true"});
        }

    }

    private _recordMetricsFromContext(msgName:string, context:Context){
        const baggage = OpenTelemetryClient.getInstance().propagation.getBaggage(context);
        if(!baggage) return;

        const now = Date.now();
        const startTsBabbageValue = baggage.getEntry(TRACING_REQ_START_TS_HEADER_NAME)?.value;
        const startTs = startTsBabbageValue ? parseInt(startTsBabbageValue) : undefined;
        const respTsBabbageValue = baggage.getEntry(TRACING_RESP_START_TS_HEADER_NAME)?.value;
        const respTs = respTsBabbageValue ? parseInt(respTsBabbageValue) : undefined;

        if(msgName === PartyInfoRequestedEvt.name && startTs){
            this._durationsHisto.observe({"leg": "request"}, now - startTs);
        }else if(msgName === PartyQueryResponseEvt.name && respTs ){
            this._durationsHisto.observe({"leg": "response"}, now - respTs);
            if(startTs){
                this._durationsHisto.observe({"leg": "total"}, now - startTs);
            }
        }
    }



}
