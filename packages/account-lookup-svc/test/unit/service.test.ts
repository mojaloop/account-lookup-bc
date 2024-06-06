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

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
**/

"use strict";

import { 
    IOracleFinder,
    IOracleProviderFactory,
    IParticipantServiceAdapter
} from "@mojaloop/account-lookup-bc-domain-lib";
import { 
    MemoryMessageProducer,
    MemoryMessageConsumer,
    MemoryParticipantService,
    MemoryOracleFinder,
    MemoryOracleProviderFactory,
    MemoryAuthenticatedHttpRequesterMock,
} from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IMetrics, MetricsMock } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { Service } from "../../src/service";
import { IAuthenticatedHttpRequester } from "@mojaloop/security-bc-public-types-lib";
import {
    MLKafkaJsonConsumer,
    MLKafkaJsonProducer,
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedMessageConsumer: IMessageConsumer = new MemoryMessageConsumer();

const mockedMessageProducer: IMessageProducer = new MemoryMessageProducer(logger);

const mockedParticipantService: IParticipantServiceAdapter = new MemoryParticipantService(logger);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger, true);

const mockedOracleProviderFactory: IOracleProviderFactory = new MemoryOracleProviderFactory(logger);

const mockedAuthRequester: IAuthenticatedHttpRequester = new MemoryAuthenticatedHttpRequesterMock(logger, "fake token");

const metricsMock: IMetrics = new MetricsMock();


jest.mock('@mojaloop/platform-shared-lib-nodejs-kafka-client-lib');
jest.mock('@mojaloop/account-lookup-bc-implementations-lib');
jest.mock('@mojaloop/security-bc-client-lib');
jest.mock('@mojaloop/account-lookup-bc-domain-lib');
jest.mock("@mojaloop/platform-shared-lib-observability-client-lib", () => {
    const originalModule = jest.requireActual("@mojaloop/platform-shared-lib-observability-client-lib");

    return {
        ...originalModule,
        OpenTelemetryClient: {
            Start: jest.fn(),
            getInstance: jest.fn(() => ({
                trace: {
                    getTracer: jest.fn(() => ({
                        startActiveSpan: jest.fn((spanName, spanOptions, context, callback) => {
                            const mockSpan = {
                              end: jest.fn(),
                            };
                            return callback(mockSpan);
                    })})),
                },
                
            })),
        },
    };
});

describe('Command Handler - Unit Tests for TransfersBC Command Handler Service', () => {

    afterAll(async () => {
        jest.clearAllMocks();
    });

    test("should be able to run start and init all variables", async()=>{
        // Arrange
        const spyConsumerSetTopics = jest.spyOn(mockedMessageConsumer, "setTopics");
        const spyConsumerConnect = jest.spyOn(mockedMessageConsumer, "connect");
        const spyConsumerStart = jest.spyOn(mockedMessageConsumer, "connect");
        const spyConsumerBackCallback = jest.spyOn(mockedMessageConsumer, "setBatchCallbackFn");


        // Act
        await Service.start(logger, mockedMessageConsumer, mockedMessageProducer, mockedOracleFinder, mockedOracleProviderFactory, mockedAuthRequester, mockedParticipantService, metricsMock);

        // Assert
        expect(spyConsumerSetTopics).toHaveBeenCalledTimes(1);
        expect(spyConsumerConnect).toHaveBeenCalledTimes(1);
        expect(spyConsumerStart).toHaveBeenCalledTimes(1);
        expect(spyConsumerBackCallback).toHaveBeenCalledTimes(1);

        // Cleanup
        await Service.stop();

    });

    test("should teardown instances when server stopped", async()=>{
        // Arrange
        const spyMockedConsumer = jest.spyOn(mockedMessageConsumer, "destroy");
        const spyMockedProducer = jest.spyOn(mockedMessageProducer, "destroy");

        // Act
        await Service.start(logger, mockedMessageConsumer, mockedMessageProducer, mockedOracleFinder, mockedOracleProviderFactory, mockedAuthRequester, mockedParticipantService, metricsMock);

        await Service.stop();

        // Assert
        expect(spyMockedConsumer).toHaveBeenCalledTimes(1);
        expect(spyMockedProducer).toHaveBeenCalledTimes(1);
    });

    test("should create instance on runtime and also teardown all of them", async()=>{
        // Arrange
        const messageConsumerDestroySpy = jest.spyOn(MLKafkaJsonConsumer.prototype, 'destroy');
        const messageProducerDestroySpy = jest.spyOn(MLKafkaJsonProducer.prototype, 'destroy');

        // Act
        await Service.start();

        // Cleanup
        await Service.stop();

        // Assert Cleanup
        expect(messageConsumerDestroySpy).toHaveBeenCalledTimes(1);
        expect(messageProducerDestroySpy).toHaveBeenCalledTimes(1);

    });
});

