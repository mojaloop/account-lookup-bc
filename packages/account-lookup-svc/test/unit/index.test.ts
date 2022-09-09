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

import {AccountLookupAggregate, ILocalCache, IOracleFinder, IOracleProvider, IParticipantService} from "@mojaloop/account-lookup-bc-domain";
import { mockedOracleList } from "@mojaloop/account-lookup-bc-domain/test/unit/mocks/data";
import { MemoryOracleFinder } from "@mojaloop/account-lookup-bc-domain/test/unit/mocks/memory_oracle_finder";
import { MemoryOracleProvider } from "@mojaloop/account-lookup-bc-domain/test/unit/mocks/memory_oracle_providers";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IAccountLookUpEventHandler, AccountLookUpEventHandler } from "../../src/event_handler";
import { AccountLookUpEventsType, IAccountLookUpMessage } from "../../src/types";
import { start } from "../../src/index";
import { MemoryMessageProducer } from "./mocks/memory_message_producer";
import { MemoryMessageConsumer } from "./mocks/memory_message_consumer";
import { MemoryLocalCache } from "./mocks/memory_local_cache";
import { MemoryParticipantService } from "./mocks/memory_participant_service";



const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const oracleFinder: IOracleFinder = new MemoryOracleFinder(
    logger,
);
const oracleProviderList: IOracleProvider[] = [];

for(let i=0 ; i<mockedOracleList.length ; i+=1) {
    const oracleProvider: IOracleProvider = new MemoryOracleProvider(
        logger,
    );
    oracleProvider.id = mockedOracleList[i].id;
    oracleProviderList.push(oracleProvider);
}

const mockedProducer: IMessageProducer = new MemoryMessageProducer();

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();

const mockedLocalCache:ILocalCache = new MemoryLocalCache();

const mockedParticipantService:IParticipantService = new MemoryParticipantService(logger);

const mockedAggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    oracleFinder,
    oracleProviderList,
    mockedProducer,
    mockedLocalCache,
    mockedParticipantService
);

const mockedEventHandler: IAccountLookUpEventHandler = new AccountLookUpEventHandler(logger, mockedAggregate);


 describe("Account Lookup Service", () => {

  
    afterEach(async () => {
        jest.clearAllMocks();
    });

    //#region region Index

    test("should be able to run start and init all variables", async()=>{
        // Arrange
        const spyConsumerSetTopics = jest.spyOn(mockedConsumer, "setTopics");
        const spyConsumerConnect = jest.spyOn(mockedConsumer, "connect");
        const spyConsumerStart = jest.spyOn(mockedConsumer, "connect");
        const spyConsumerCallback = jest.spyOn(mockedConsumer, "setCallbackFn");
        const spyProducerInit = jest.spyOn(mockedProducer, "connect");
        const spyAggregateInit = jest.spyOn(mockedAggregate, "init");
        const spyEventHandlerInit = jest.spyOn(mockedEventHandler, "init");
        
        // Act
        await start(logger,mockedConsumer,mockedProducer, oracleFinder,oracleProviderList, mockedLocalCache, mockedAggregate,mockedEventHandler);

        // Assert
        expect(spyConsumerSetTopics).toBeCalledTimes(1); 
        expect(spyConsumerConnect).toBeCalledTimes(1);
        expect(spyConsumerStart).toBeCalledTimes(1);
        expect(spyConsumerCallback).toBeCalledTimes(1); 
        expect(spyProducerInit).toBeCalledTimes(1);
        expect(spyAggregateInit).toBeCalledTimes(1);
        expect(spyEventHandlerInit).toBeCalledTimes(1);
    });

    test("should throw error if not able to start", async()=>{
        // Arrange
        const error = new Error("Error"); 
        jest.spyOn(mockedConsumer, "setTopics").mockImplementationOnce(()=> {throw error;});
        
        // Act && Assert
        await expect(
            start(logger,mockedConsumer,mockedProducer, oracleFinder,oracleProviderList, mockedLocalCache, mockedAggregate,mockedEventHandler))
            .rejects.toThrowError(error);
    });

    //#endregion


    //#region AccountLookUpEventHandler
    test("should add all events for account lookup when init is called", async()=>{
        // Arrange
        const eventNames = Object.values(AccountLookUpEventsType);

        // Act
        mockedEventHandler.init();

        // Assert
        expect(mockedEventHandler.get().eventNames()).toEqual(eventNames);

    });

    test("should log error if message is on a invalid format", async()=>{
        // Arrange
        const invalidMessage:any = {
            type: "invalid",
        };
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(invalidMessage);

        // Assert
        expect(logger.error).toBeCalledWith(`AccountLookUpEventHandler: publishAccountLookUpEvent: message as an invalid format or value`);
        
    });

    test("should log error if message has invalid type", async()=>{
        // Arrange
        const invalidMessage:any = {
            value: {
                type:"invalid type",
                payload: {"test":"test"}
            }
        };
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(invalidMessage);

        // Assert
        expect(logger.error).toBeCalledWith(`AccountLookUpEventHandler: publishAccountLookUpEvent: message type ${invalidMessage.value.type} is not a valid event type`);
        
    });

    // Participant
    test("should call getParticipantByTypeAndId aggregate method for GetParticipantByTypeAndId Event", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetParticipantByTypeAndId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "getParticipantByTypeAndId").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.getParticipantByTypeAndId).toBeCalledWith(fakePayload.participantType, fakePayload.participantId);
        
    });

    test("should log error if getParticipantByTypeAndId aggregate method for GetParticipantByTypeAndId Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetParticipantByTypeAndId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "getParticipantByTypeAndId").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.GetParticipantByTypeAndId}: ${errorMessage}`);
        
    });

    test("should call getParticipantByTypeAndIdAndSubId aggregate method for GetParticipantByTypeAndIdAndSubId Event", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetParticipantByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "getParticipantByTypeAndIdAndSubId").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.getParticipantByTypeAndIdAndSubId).toBeCalledWith(fakePayload.participantType, fakePayload.participantId, fakePayload.participantSubId);
        
    });

    test("should log error if getParticipantByTypeAndIdAndSubId aggregate method for GetParticipantByTypeAndIdAndSubId Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetParticipantByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "getParticipantByTypeAndIdAndSubId").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.GetParticipantByTypeAndIdAndSubId}: ${errorMessage}`);
        
    });

    test("should call associateParticipantByTypeAndId aggregate method for AssociateParticipantByTypeAndId Event", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.AssociateParticipantByTypeAndId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "associateParticipantByTypeAndId").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.associateParticipantByTypeAndId).toBeCalledWith(fakePayload.participantType, fakePayload.participantId);
        
    });

    test("should log error if associateParticipantByTypeAndId aggregate method for AssociateParticipantByTypeAndId Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.AssociateParticipantByTypeAndId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "associateParticipantByTypeAndId").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.AssociateParticipantByTypeAndId}: ${errorMessage}`);
        
    });

    test("should call associateParticipantByTypeAndIdAndSubId aggregate method for AssociateParticipantByTypeAndIdAndSubId Event", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.AssociateParticipantByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "associateParticipantByTypeAndIdAndSubId").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.associateParticipantByTypeAndIdAndSubId).toBeCalledWith(fakePayload.participantType, fakePayload.participantId, fakePayload.participantSubId);
        
    });

    test("should log error if getParticipantByTypeAndIdAndSubId aggregate method for GetParticipantByTypeAndIdAndSubId Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetParticipantByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "getParticipantByTypeAndIdAndSubId").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.GetParticipantByTypeAndIdAndSubId}: ${errorMessage}`);
        
    });

    test("should call disassociateParticipantByTypeAndId aggregate method for DisassociateParticipantByTypeAndId Event", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.DisassociateParticipantByTypeAndId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "disassociateParticipantByTypeAndId").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.disassociateParticipantByTypeAndId).toBeCalledWith(fakePayload.participantType, fakePayload.participantId);
        
    });

    test("should log error if disassociateParticipantByTypeAndId aggregate method for DisassociateParticipantByTypeAndId Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.DisassociateParticipantByTypeAndId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "disassociateParticipantByTypeAndId").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.DisassociateParticipantByTypeAndId}: ${errorMessage}`);
        
    });

    test("should call disassociateParticipantByTypeAndIdAndSubId aggregate method for DisassociateParticipantByTypeAndIdAndSubId Event", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.DisassociateParticipantByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "disassociateParticipantByTypeAndIdAndSubId").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.disassociateParticipantByTypeAndIdAndSubId).toBeCalledWith(fakePayload.participantType, fakePayload.participantId, fakePayload.participantSubId);
        
    });

    test("should log error if disassociateParticipantByTypeAndIdAndSubId aggregate method for DisassociateParticipantByTypeAndIdAndSubId Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.DisassociateParticipantByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "disassociateParticipantByTypeAndIdAndSubId").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.DisassociateParticipantByTypeAndIdAndSubId}: ${errorMessage}`);
        
    });

    // Party
    test("should call getPartyByTypeAndId aggregate method for GetPartyByTypeAndId Event", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetPartyByTypeAndId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "getPartyByTypeAndIdRequest").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.getPartyByTypeAndIdRequest).toBeCalledWith(fakePayload.partyType, fakePayload.partyId);
        
    });

    test("should log error if getPartyByTypeAndId aggregate method for GetPartyByTypeAndId Event throws error", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetPartyByTypeAndId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "getPartyByTypeAndIdRequest").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.GetPartyByTypeAndId}: ${errorMessage}`);
        
    });

    test("should call getPartyByTypeAndIdAndSubId aggregate method for GetPartyByTypeAndIdAndSubId Event", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2", partySubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetPartyByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "getPartyByTypeAndIdAndSubIdRequest").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.getPartyByTypeAndIdAndSubIdRequest).toBeCalledWith(fakePayload.partyType, fakePayload.partyId, fakePayload.partySubId);
        
    });

    test("should log error if getPartyByTypeAndIdAndSubId aggregate method for GetPartyByTypeAndIdAndSubId Event throws error", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2", partySubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetPartyByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "getPartyByTypeAndIdAndSubIdRequest").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.GetPartyByTypeAndIdAndSubId}: ${errorMessage}`);
        
    });

    test("should call associatePartyByTypeAndId aggregate method for AssociatePartyByTypeAndId Event", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.AssociatePartyByTypeAndId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "associatePartyByTypeAndId").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.associatePartyByTypeAndId).toBeCalledWith(fakePayload.partyType, fakePayload.partyId);
        
    });

    test("should log error if associatePartyByTypeAndId aggregate method for AssociatePartyByTypeAndId Event throws error", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.AssociatePartyByTypeAndId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "associatePartyByTypeAndId").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.AssociatePartyByTypeAndId}: ${errorMessage}`);
        
    });

    test("should call associatePartyByTypeAndIdAndSubId aggregate method for AssociatePartyByTypeAndIdAndSubId Event", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2", partySubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.AssociatePartyByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "associatePartyByTypeAndIdAndSubId").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.associatePartyByTypeAndIdAndSubId).toBeCalledWith(fakePayload.partyType, fakePayload.partyId, fakePayload.partySubId);
        
    });

    test("should log error if getPartyByTypeAndIdAndSubId aggregate method for GetPartyByTypeAndIdAndSubId Event throws error", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2", partySubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetPartyByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "getPartyByTypeAndIdAndSubIdRequest").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.GetPartyByTypeAndIdAndSubId}: ${errorMessage}`);
        
    });

    test("should call disassociatePartyByTypeAndId aggregate method for DisassociatePartyByTypeAndId Event", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.DisassociatePartyByTypeAndId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "disassociatePartyByTypeAndId").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.disassociatePartyByTypeAndId).toBeCalledWith(fakePayload.partyType, fakePayload.partyId);
        
    });

    test("should log error if disassociatePartyByTypeAndId aggregate method for DisassociatePartyByTypeAndId Event throws error", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.DisassociatePartyByTypeAndId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "disassociatePartyByTypeAndId").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.DisassociatePartyByTypeAndId}: ${errorMessage}`);
        
    });

    test("should call disassociatePartyByTypeAndIdAndSubId aggregate method for DisassociatePartyByTypeAndIdAndSubId Event", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2", partySubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.DisassociatePartyByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "disassociatePartyByTypeAndIdAndSubId").mockResolvedValueOnce({} as any);
        
        // Act
        mockedEventHandler.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.disassociatePartyByTypeAndIdAndSubId).toBeCalledWith(fakePayload.partyType, fakePayload.partyId, fakePayload.partySubId);
        
    });

    test("should log error if disassociatePartyByTypeAndIdAndSubId aggregate method for DisassociatePartyByTypeAndIdAndSubId Event throws error", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2", partySubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.DisassociatePartyByTypeAndIdAndSubId,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "disassociatePartyByTypeAndIdAndSubId").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedEventHandler.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.DisassociatePartyByTypeAndIdAndSubId}: ${errorMessage}`);
        
    });


    test("should remove all events for account lookup when destroy is called", async()=>{
        // Arrange
        const eventNames = Object.values(AccountLookUpEventsType);
        
        // Act
        mockedEventHandler.destroy();

        // Assert
        eventNames.forEach(eventName => {
            expect(mockedEventHandler.get().listenerCount(eventName)).toBe(0);
        });
        expect(mockedEventHandler.get().eventNames().length).toEqual(0);
        
        });
        
        //#endregion
    });