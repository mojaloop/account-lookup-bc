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

import {AccountLookupAggregate, AccountLookUpEventsType, IAccountLookUpMessage, IOracleFinder, IOracleProvider, IParticipantService} from "@mojaloop/account-lookup-bc-domain";
import { mockedOracleList } from "@mojaloop/account-lookup-bc-domain/test/unit/mocks/data";
import { MemoryOracleFinder } from "@mojaloop/account-lookup-bc-domain/test/unit/mocks/memory_oracle_finder";
import { MemoryOracleProvider } from "@mojaloop/account-lookup-bc-domain/test/unit/mocks/memory_oracle_providers";
import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { start } from "../../src/index";
import { MemoryMessageProducer } from "./mocks/memory_message_producer";
import { MemoryMessageConsumer } from "./mocks/memory_message_consumer";
import { MemoryParticipantService } from "./mocks/memory_participant_service";
import { EventEmitter } from "events";



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
    oracleProvider.partyType = mockedOracleList[i].type;
    oracleProviderList.push(oracleProvider);
}

const mockedProducer: IMessageProducer = new MemoryMessageProducer();

const mockedConsumer : IMessageConsumer = new MemoryMessageConsumer();


const mockedParticipantService:IParticipantService = new MemoryParticipantService(logger);

const eventEmitter:EventEmitter = new EventEmitter();

const mockedAggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    oracleFinder,
    oracleProviderList,
    mockedProducer,
    mockedParticipantService,
    eventEmitter
);


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
        const spyEventEmitter = jest.spyOn(eventEmitter, "emit");
        
        // Act
        await start(logger,mockedConsumer,mockedProducer, oracleFinder,oracleProviderList, mockedAggregate);

        // Assert
        expect(spyConsumerSetTopics).toBeCalledTimes(1); 
        expect(spyConsumerConnect).toBeCalledTimes(1);
        expect(spyConsumerStart).toBeCalledTimes(1);
        expect(spyConsumerCallback).toBeCalledTimes(1); 
        expect(spyProducerInit).toBeCalledTimes(1);
        expect(spyAggregateInit).toBeCalledTimes(1);
    });

    test("should throw error if not able to start", async()=>{
        // Arrange
        const error = new Error("Error"); 
        jest.spyOn(mockedConsumer, "setTopics").mockImplementationOnce(()=> {throw error;});
        
        // Act && Assert
        await expect(
            start(logger,mockedConsumer,mockedProducer, oracleFinder,oracleProviderList, mockedAggregate))
            .rejects.toThrowError(error);
    });

    //#endregion


    //#region AccountLookUpEventHandler
    test("should add all events for account lookup when init is called", async()=>{
        // Arrange
        const eventNames = Object.values(AccountLookUpEventsType);

        const spyAggregateInit = jest.spyOn(mockedAggregate, "init");

        
        // Act
        await start(logger,mockedConsumer,mockedProducer, oracleFinder,oracleProviderList, mockedAggregate);
        
        const listenerEventNames = eventEmitter.eventNames()

        const result = listenerEventNames.every(eventName => eventNames.includes(eventName as AccountLookUpEventsType))
        // Assert
        expect(spyAggregateInit).toBeCalledTimes(1); 
        expect(result).toBeTruthy();
        
    });

    test("should log error if message is on a invalid format", async()=>{
        // Arrange
        const invalidMessage:any = {
            type: "invalid",
        };
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        mockedAggregate.publishAccountLookUpEvent(invalidMessage);

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
        mockedAggregate.publishAccountLookUpEvent(invalidMessage);

        // Assert
        expect(logger.error).toBeCalledWith(`AccountLookUpEventHandler: publishAccountLookUpEvent: message type ${invalidMessage.value.type} is not a valid event type`);
        
    });

    // Participant
    test("should call getParticipant aggregate method for GetParticipant Event", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetParticipant,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "getParticipant").mockResolvedValueOnce({} as any);
        
        // Act
        mockedAggregate.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.getParticipant).toBeCalledWith(fakePayload.participantType, fakePayload.participantId);
        
    });

    test("should log error if getParticipant aggregate method for GetParticipant Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetParticipant,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "getParticipant").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedAggregate.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.GetParticipant}: ${errorMessage}`);
        
    });

    test("should call getParticipant aggregate method for GetParticipant Event", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetParticipant,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "getParticipant").mockResolvedValueOnce({} as any);
        
        // Act
        mockedAggregate.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.getParticipant).toBeCalledWith(fakePayload.participantType, fakePayload.participantId, fakePayload.participantSubId);
        
    });

    test("should log error if getParticipant aggregate method for GetParticipant Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetParticipant,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "getParticipant").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedAggregate.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.GetParticipant}: ${errorMessage}`);
        
    });

    test("should log error if getParticipant aggregate method for GetParticipant Event throws error", async()=>{
        // Arrange
        const fakePayload = { participantType:"1", participantId: "2", participantSubId:"3" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.GetParticipant,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "getParticipant").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedAggregate.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.GetParticipant}: ${errorMessage}`);
        
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
                type:AccountLookUpEventsType.GetParty,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "getPartyRequest").mockResolvedValueOnce({} as any);
        
        // Act
        mockedAggregate.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.getPartyRequest).toBeCalledWith(fakePayload.partyType, fakePayload.partyId);
        
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
                type:AccountLookUpEventsType.GetParty,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "getPartyRequest").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedAggregate.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.GetParty}: ${errorMessage}`);
        
    });

    test("should call associateParty aggregate method for AssociateParty Event", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.AssociateParty,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "associateParty").mockResolvedValueOnce({} as any);
        
        // Act
        mockedAggregate.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.associateParty).toBeCalledWith(fakePayload.partyType, fakePayload.partyId);
        
    });

    test("should log error if associateParty aggregate method for AssociateParty Event throws error", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.AssociateParty,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "associateParty").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedAggregate.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.AssociateParty}: ${errorMessage}`);
        
    });

    test("should call disassociateParty aggregate method for DisassociateParty Event", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.DisassociateParty,
                payload: fakePayload
            }
        };
        
        jest.spyOn(mockedAggregate, "disassociateParty").mockResolvedValueOnce({} as any);
        
        // Act
        mockedAggregate.publishAccountLookUpEvent(message);

        // Assert
       expect(mockedAggregate.disassociateParty).toBeCalledWith(fakePayload.partyType, fakePayload.partyId);
        
    });

    test("should log error if disassociateParty aggregate method for DisassociateParty Event throws error", async()=>{
        // Arrange
        const fakePayload = { partyType:"1", partyId: "2" };
        const message:IAccountLookUpMessage = {
            key: "account-lookup-service",
            timestamp: 12,
            topic: "account-lookup-service",
            headers: [],
            value: {
                type:AccountLookUpEventsType.DisassociateParty,
                payload: fakePayload
            }
        };
        const errorMessage = "execution error";
        
        jest.spyOn(mockedAggregate, "disassociateParty").mockRejectedValueOnce(errorMessage);
        jest.spyOn(logger, "error").mockImplementationOnce(() => { });
        
        // Act
        await Promise.resolve(mockedAggregate.publishAccountLookUpEvent(message));

        // Assert
        expect(logger.error).toBeCalledWith(`${AccountLookUpEventsType.DisassociateParty}: ${errorMessage}`);
        
    });


    // test("should remove all events for account lookup when destroy is called", async()=>{
    //     // Arrange
    //     const eventNames = Object.values(AccountLookUpEventsType);
        
    //     // Act
    //     mockedEventHandler.destroy();

    //     // Assert
    //     eventNames.forEach(eventName => {
    //         expect(mockedEventHandler.get().listenerCount(eventName)).toBe(0);
    //     });
    //     expect(mockedEventHandler.get().eventNames().length).toEqual(0);
        
    //     });
        
        //#endregion
    });