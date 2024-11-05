"use strict";

import { AccountLookupEventHandler } from "../../src/handler";
import { AccountLookupAggregate, IOracleFinder, IParticipantServiceAdapter } from "@mojaloop/account-lookup-bc-domain-lib";
import {
  IMessageProducer,
  IMessageConsumer,
  IMessage,
  MessageTypes,
  DomainEventMsg,
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMetrics, ITracing } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { OpenTelemetryClient } from "@mojaloop/platform-shared-lib-observability-client-lib";
import { Context, Span } from "@opentelemetry/api";
import { MemoryMessageConsumer, MemoryMessageProducer, MemoryOracleFinder, MemoryOracleProviderFactory, MemoryParticipantService} from "@mojaloop/account-lookup-bc-shared-mocks-lib";
import { AccountLookupBCInvalidMessagePayloadErrorEvent, PartyInfoRequestedEvt, PartyQueryResponseEvt  } from "@mojaloop/platform-shared-lib-public-messages-lib";


const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const mockedOracleFinder: IOracleFinder = new MemoryOracleFinder(logger, true);
const oracleProviderFactory = new MemoryOracleProviderFactory(logger);

const messageProducer: IMessageProducer = new MemoryMessageProducer(
    logger,
);
const messageConsumer: IMessageConsumer = new MemoryMessageConsumer();

const mockedParticipantService: IParticipantServiceAdapter = new MemoryParticipantService(
    logger,
);
describe("AccountLookupEventHandler", () => {
  let eventHandler: AccountLookupEventHandler;
  let mockLogger: ILogger;
  let mockAggregate: AccountLookupAggregate;
  let mockMessageConsumer: IMessageConsumer;
  let mockMessageProducer: IMessageProducer;
  let mockMetrics: IMetrics;
  let mockTracing: ITracing;
  let mockTracer: any;
  let mockOpenTelemetryClient: any;

  let mockDurationsHisto: any;
  let mockHandlerHisto: any;
  let mockAggregateHisto: any;

  beforeEach(() => {
    // Use the existing logger
    mockLogger = logger;
    // Create mock histograms
    mockDurationsHisto = {
      observe: jest.fn(),
    };

    mockHandlerHisto = {
      startTimer: jest.fn().mockReturnValue(jest.fn()),
      observe: jest.fn(),
    };

    mockAggregateHisto = {
      startTimer: jest.fn().mockReturnValue(jest.fn()),
      observe: jest.fn(),
    };
    mockMetrics = {
      getHistogram: jest.fn((name: string, help: string, labelNames: string[]) => {
        if (name === "AccountLookupDurations") {
          return mockDurationsHisto;
        } else if (name === "AccountLookupAggregate") {
          // Return different mocks based on label names
          if (labelNames.includes("callName") && labelNames.includes("success")) {
            return mockAggregateHisto;
          } else {
            return mockHandlerHisto;
          }
        } else {
          return {
            startTimer: jest.fn().mockReturnValue(jest.fn()),
            observe: jest.fn(),
          };
        }
      }),
      getGauge: jest.fn().mockReturnValue({
        set: jest.fn(),
      }),
    } as unknown as IMetrics;

    mockMessageConsumer = messageConsumer;

    mockMessageProducer = messageProducer;

    mockAggregate = new AccountLookupAggregate(
      mockLogger,
      mockedOracleFinder,
      oracleProviderFactory,
      mockedParticipantService,
      mockMetrics
    );

    jest.spyOn(mockAggregate, "handleEvent").mockImplementation(jest.fn());
    jest.spyOn(mockMessageProducer, "send").mockImplementation(jest.fn());

    mockTracer = {
      startActiveSpan: jest.fn((name, options, context, fn) => {
        const span = { end: jest.fn() } as unknown as Span;
        return fn(span);
      }),
    };

    mockTracing = {
      trace: {
        getTracer: jest.fn().mockReturnValue(mockTracer),
      },
      propagation: {
        getBaggage: jest.fn(),
      },
    } as unknown as ITracing;

    mockOpenTelemetryClient = {
      propagationExtract: jest.fn().mockReturnValue({}),
      propagationInject: jest.fn(),
      propagation: {
        getBaggage: jest.fn().mockReturnValue(null),
      },
    };

    jest.spyOn(OpenTelemetryClient, "getInstance").mockReturnValue(mockOpenTelemetryClient);
    eventHandler = new AccountLookupEventHandler(
      mockLogger,
      mockAggregate,
      mockMessageConsumer,
      mockMessageProducer,
      mockMetrics,
      mockTracing
    );

  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("_batchMsgHandler", () => {
    it("should handle empty receivedMessages array", async () => {
      const receivedMessages: IMessage[] = [];
      await (eventHandler as any)._batchMsgHandler(receivedMessages);
      expect(mockMessageProducer.send).not.toHaveBeenCalled();
      expect(mockAggregate.handleEvent).not.toHaveBeenCalled();
    });

    it("should process messages and send output events", async () => {
      // Arrange
      const message1: IMessage = {
        msgId: "msg1",
        msgName: "PartyQueryReceivedEvt",
        msgKey: "key1",
        msgTopic: "topic1",
        msgPartition: 0,
        msgOffset: 0,
        msgTimestamp: Date.now(),
        msgType: MessageTypes.DOMAIN_EVENT,
        payload: {},
        tracingInfo: {},
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState: {},
      };
      const message2: IMessage = {
        msgId: "msg2",
        msgName: "PartyQueryReceivedEvt",
        msgKey: "key2",
        msgTopic: "topic2",
        msgPartition: 0,
        msgOffset: 0,
        msgTimestamp: Date.now(),
        msgType: MessageTypes.DOMAIN_EVENT,
        payload: {},
        tracingInfo: {},
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState: {},
      };

      const receivedMessages: IMessage[] = [message1, message2];

      const domainEventMsg1 = {
        msgName: "PartyInfoRequestedEvt",
        payload: { result: "success1" },
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState: {},
        tracingInfo: {},
      } as DomainEventMsg;

      const domainEventMsg2 = {
        msgName: "PartyInfoRequestedEvt",
        payload: { result: "success2" },
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState: {},
        tracingInfo: {},
      } as DomainEventMsg;

      jest.spyOn(mockAggregate, "handleEvent")
        .mockResolvedValueOnce(domainEventMsg1)
        .mockResolvedValueOnce(domainEventMsg2);

      // Act
      await (eventHandler as any)._batchMsgHandler(receivedMessages);

      // Assert
      expect(mockAggregate.handleEvent).toHaveBeenCalledTimes(2);
      expect(mockAggregate.handleEvent).toHaveBeenCalledWith(message1);
      expect(mockAggregate.handleEvent).toHaveBeenCalledWith(message2);

      expect(mockMessageProducer.send).toHaveBeenCalledTimes(1);
      expect(mockMessageProducer.send).toHaveBeenCalledWith([domainEventMsg1, domainEventMsg2]);
    });

    it("should process messages and handle tracing and metrics", async () => {
      // Arrange
      const message: IMessage = {
        msgId: "msg1",
        msgName: "PartyQueryReceivedEvt",
        msgKey: "key1",
        msgTopic: "topic1",
        msgPartition: 0,
        msgOffset: 0,
        msgTimestamp: Date.now(),
        msgType: MessageTypes.DOMAIN_EVENT,
        payload: {},
        tracingInfo: {},
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState: {},
      };

      const receivedMessages: IMessage[] = [message];

      const domainEventMsg = {
        msgName: "PartyInfoRequestedEvt",
        payload: { result: "success" },
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState: {},
        tracingInfo: {},
      } as DomainEventMsg;

      jest.spyOn(mockAggregate, "handleEvent").mockResolvedValueOnce(domainEventMsg);

      // Act
      await (eventHandler as any)._batchMsgHandler(receivedMessages);

      // Assert
      expect(mockTracer.startActiveSpan).toHaveBeenCalled();
      expect(mockMetrics.getHistogram).toHaveBeenCalled();
      expect(mockMetrics.getGauge).toHaveBeenCalled();
    });

    it("should send error events when handleEvent returns an error event", async () => {
      // Arrange
      const message: IMessage = {
        msgId: "msg1",
        msgName: "PartyQueryReceivedEvt",
        msgKey: "key1",
        msgTopic: "topic1",
        msgPartition: 0,
        msgOffset: 0,
        msgTimestamp: Date.now(),
        msgType: MessageTypes.DOMAIN_EVENT,
        payload: {},
        tracingInfo: {},
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState: {},
      };

      const receivedMessages: IMessage[] = [message];

      const errorEventMsg = {
        msgName: AccountLookupBCInvalidMessagePayloadErrorEvent.name,
        payload: { errorCode: "4000", partyId: "123", partyType: "MSISDN" },
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState: {},
        tracingInfo: {},
      } as DomainEventMsg;

      jest.spyOn(mockAggregate, "handleEvent").mockResolvedValueOnce(errorEventMsg);

      // Act
      await (eventHandler as any)._batchMsgHandler(receivedMessages);

      // Assert
      expect(mockMessageProducer.send).toHaveBeenCalledTimes(1);
      expect(mockMessageProducer.send).toHaveBeenCalledWith([errorEventMsg]);
    });

    it("should handle messages with invalid payload gracefully", async () => {
      // Arrange
      const message: IMessage = {
        msgId: "msg1",
        msgName: "PartyQueryReceivedEvt",
        msgKey: "key1",
        msgTopic: "topic1",
        msgPartition: 0,
        msgOffset: 0,
        msgTimestamp: Date.now(),
        msgType: MessageTypes.DOMAIN_EVENT,
        payload: null, // Invalid payload
        tracingInfo: {},
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState: {},
      };

      const receivedMessages: IMessage[] = [message];

      const errorEventMsg = {
        msgName: AccountLookupBCInvalidMessagePayloadErrorEvent.name,
        payload: { errorCode: "4000", partyId: null, partyType: null },
        inboundProtocolType: "FSPIOP_v1_1",
        inboundProtocolOpaqueState: {},
        tracingInfo: {},
      } as DomainEventMsg;

      jest.spyOn(mockAggregate, "handleEvent").mockResolvedValueOnce(errorEventMsg);

      // Act
      await (eventHandler as any)._batchMsgHandler(receivedMessages);

      // Assert
      expect(mockAggregate.handleEvent).toHaveBeenCalledWith(message);
      expect(mockMessageProducer.send).toHaveBeenCalledWith([errorEventMsg]);
    });
  });

  describe("_recordMetricsFromContext", () => {
    it("should record 'request' leg duration when msgName is PartyInfoRequestedEvt and start timestamp is available", () => {
      // Arrange
      const msgName = PartyInfoRequestedEvt.name;
      const startTimestamp = Date.now() - 100;
      const context: Context = {
        getValue: jest.fn(),
        setValue: jest.fn(),
        deleteValue: jest.fn(),
      };

      const baggage = {
        getEntry: jest.fn((key: string) => {
          if (key === "tracing-request-start-timestamp") {
            return { value: startTimestamp.toString() };
          }
          return null;
        }),
      };

      mockOpenTelemetryClient.propagation.getBaggage = jest.fn().mockReturnValue(baggage);

      // Act
      (eventHandler as any)._recordMetricsFromContext(msgName, context);

      // Assert
      expect(baggage.getEntry).toHaveBeenCalledWith("tracing-request-start-timestamp");
      expect(mockDurationsHisto.observe).toHaveBeenCalledWith(
        { leg: "request" },
        expect.any(Number)
      );
    });

    it("should record 'response' leg duration when msgName is PartyQueryResponseEvt and response timestamp is available", () => {
      // Arrange
      const msgName = PartyQueryResponseEvt.name;
      const responseTimestamp = Date.now() - 200;
      const context: Context = {
        getValue: jest.fn(),
        setValue: jest.fn(),
        deleteValue: jest.fn(),
      };

      const baggage = {
        getEntry: jest.fn((key: string) => {
          if (key === "tracing-response-start-timestamp") {
            return { value: responseTimestamp.toString() };
          } else if (key === "tracing-request-start-timestamp") {
            return { value: (responseTimestamp - 100).toString() }; // start timestamp 100ms before response timestamp
          }
          return null;
        }),
      };

      mockOpenTelemetryClient.propagation.getBaggage = jest.fn().mockReturnValue(baggage);

      // Act
      (eventHandler as any)._recordMetricsFromContext(msgName, context);

      // Assert
      expect(baggage.getEntry).toHaveBeenCalledWith("tracing-response-start-timestamp");
      expect(mockDurationsHisto.observe).toHaveBeenCalledWith(
        { leg: "response" },
        expect.any(Number)
      );
      expect(mockDurationsHisto.observe).toHaveBeenCalledWith(
        { leg: "total" },
        expect.any(Number)
      );
    });

    it("should not record metrics if baggage is not available", () => {
      // Arrange
      const msgName = PartyInfoRequestedEvt.name;
      const context: Context = {
        getValue: jest.fn(),
        setValue: jest.fn(),
        deleteValue: jest.fn(),
      };

      mockOpenTelemetryClient.propagation.getBaggage = jest.fn().mockReturnValue(null);

      // Act
      (eventHandler as any)._recordMetricsFromContext(msgName, context);

      // Assert
      expect(mockDurationsHisto.observe).not.toHaveBeenCalled();
    });

    it("should not record metrics if start timestamp is not available", () => {
      // Arrange
      const msgName = PartyInfoRequestedEvt.name;
      const context: Context = {
        getValue: jest.fn(),
        setValue: jest.fn(),
        deleteValue: jest.fn(),
      };

      const baggage = {
        getEntry: jest.fn().mockReturnValue(null),
      };

      mockOpenTelemetryClient.propagation.getBaggage = jest.fn().mockReturnValue(baggage);

      // Act
      (eventHandler as any)._recordMetricsFromContext(msgName, context);

      // Assert
      expect(mockDurationsHisto.observe).not.toHaveBeenCalled();
    });

    it("should handle invalid timestamps gracefully", () => {
      // Arrange
      const msgName = PartyInfoRequestedEvt.name;
      const context: Context = {
        getValue: jest.fn(),
        setValue: jest.fn(),
        deleteValue: jest.fn(),
      };

      const baggage = {
        getEntry: jest.fn().mockReturnValue({ value: "invalid" }),
      };

      mockOpenTelemetryClient.propagation.getBaggage = jest.fn().mockReturnValue(baggage);

      // Act
      (eventHandler as any)._recordMetricsFromContext(msgName, context);

      // Assert
      expect(mockDurationsHisto.observe).not.toHaveBeenCalled();
    });
  });
});
