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


 // Logger.
 import {ConsoleLogger, ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
 import { IMessage, IMessageProducer, MessageTypes } from "@mojaloop/platform-shared-lib-messaging-types-lib";
 import {Party} from "../../src/entities/party";
 import {Participant} from "../../src/entities/participant";
 import {
     AccountLookupAggregate,
     InvalidMessagePayloadError,
     InvalidMessageTypeError,
     InvalidParticipantIdError,
     InvalidParticipantTypeError,
     InvalidPartyIdError,
     InvalidPartyTypeError,
     IOracleFinder,
     IParticipant,
     IParticipantService,
     NoSuchOracleAdapterError,
     NoSuchOracleError,
     NoSuchParticipantError,
     NoSuchParticipantFspIdError,
     Oracle,
     RequiredParticipantIsNotActive,
     UnableToAssociateParticipantError,
     UnableToDisassociateParticipantError,
 } from "../../src";
import { MemoryOracleFinder } from "./mocks/memory_oracle_finder";
import { MemoryMessageProducer } from "./mocks/memory_message_producer";
import { getParticipantFspIdForOracleTypeAndSuType, mockedOracleAdapters, mockedParticipantFspIds, mockedParticipantIds, mockedPartyIds, mockedPartySubTypes, mockedPartyTypes } from "./mocks/data";
import { MemoryParticipantService } from "./mocks/memory_participant_service";
import { AccountLookUperrorEvtPayload, ParticipantAssociationCreatedEvtPayload, ParticipantAssociationRemovedEvtPayload, ParticipantAssociationRequestReceivedEvt, ParticipantAssociationRequestReceivedEvtPayload, ParticipantDisassociateRequestReceivedEvt, ParticipantDisassociateRequestReceivedEvtPayload, ParticipantQueryReceivedEvt, ParticipantQueryReceivedEvtPayload, ParticipantQueryResponseEvtPayload, PartyInfoAvailableEvt, PartyInfoAvailableEvtPayload, PartyInfoRequestedEvt, PartyInfoRequestedEvtPayload, PartyQueryReceivedEvt, PartyQueryReceivedEvtPayload, PartyQueryResponseEvtPayload } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { MemoryOracleProviderFactory } from "./mocks/memory_oracle_provider_factory";
import { MemoryOracleProviderAdapter } from './mocks/memory_oracle_provider_adapter';

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);

const oracleFinder: IOracleFinder = new MemoryOracleFinder(
    logger,
);

const oracleProviderFactory = new MemoryOracleProviderFactory(logger);

const messageProducer: IMessageProducer = new MemoryMessageProducer(
    logger,
);


const participantService: IParticipantService = new MemoryParticipantService(
    logger,
);

// Domain.
const aggregate: AccountLookupAggregate = new AccountLookupAggregate(
    logger,
    oracleFinder,
    oracleProviderFactory,
    messageProducer,
    participantService
);


describe("Domain - Unit Tests oracle admin", () => {
       
    afterEach(async () => {
        jest.restoreAllMocks();
    });

    test()

});
