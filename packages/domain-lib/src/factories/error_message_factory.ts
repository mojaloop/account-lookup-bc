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

import {DomainEventMsg, IMessage} from '@mojaloop/platform-shared-lib-messaging-types-lib';
import { IErrorMessageFactory } from "../interfaces/domain";
import { InvalidMessagePayloadError, InvalidMessageTypeError, InvalidParticipantIdError, InvalidPartyIdError, NoSuchOracleAdapterError, NoSuchOracleError, NoSuchParticipantError, NoSuchParticipantFspIdError, UnableToAssociateParticipantError, UnableToDisassociateParticipantError, UnableToGetOracleFromOracleFinderError, UnableToGetParticipantFspIdError } from "../errors";
import { AccountLookUpUnknownErrorEvent, AccountLookupBCInvalidMessagePayloadErrorEvent, AccountLookupBCInvalidMessageTypeErrorEvent, AccountLookupBCInvalidParticipantIdErrorEvent, AccountLookupBCNoSuchOracleAdapterErrorEvent, AccountLookupBCNoSuchOracleErrorEvent, AccountLookupBCNoSuchParticipantErrorEvent, AccountLookupBCNoSuchParticipantFspIdErrorEvent, AccountLookupBCUnableToAssociateParticipantErrorEvent, AccountLookupBCUnableToDisassociateParticipantErrorEvent, AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent, AccountLookupBCUnableToGetParticipantFspIdErrorEvent, AccountLookupErrorPayload } from "@mojaloop/platform-shared-lib-public-messages-lib";

export class ErrorMessageFactory implements IErrorMessageFactory {

    public create(message:IMessage, error: Error): IMessage {
        const errorMessage = error.message;
        const partyId = message.payload?.partyId || null;
        const partyType = message.payload?.partyType || null;
        const partySubType = message.payload?.partySubType || null;
        const requesterFspId = message.payload?.requesterFspId || null;
        const sourceEvent = message.msgName;

        const errorPayload: AccountLookupErrorPayload = {
            errorMessage,
            partyId,
            requesterFspId,
            sourceEvent,
            partySubType,
            partyType
        };

        let errorEvent: DomainEventMsg;

        switch(error.constructor.name){
            case InvalidMessagePayloadError.name:
                errorEvent = new AccountLookupBCInvalidMessagePayloadErrorEvent(errorPayload);
                return errorEvent;
            case InvalidMessageTypeError.name:
                errorEvent = new AccountLookupBCInvalidMessageTypeErrorEvent(errorPayload);
                return errorEvent;
            case UnableToAssociateParticipantError.name:
                errorEvent = new AccountLookupBCUnableToAssociateParticipantErrorEvent(errorPayload);
                return errorEvent;
            case UnableToDisassociateParticipantError.name:
                errorEvent = new AccountLookupBCUnableToDisassociateParticipantErrorEvent(errorPayload);
                return errorEvent;
            case NoSuchParticipantError.name:
                errorEvent = new AccountLookupBCNoSuchParticipantErrorEvent(errorPayload);
                return errorEvent;
            case InvalidParticipantIdError.name:
                errorEvent = new AccountLookupBCInvalidParticipantIdErrorEvent(errorPayload);
                return errorEvent;
            case UnableToGetOracleFromOracleFinderError.name:
                errorEvent = new AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent(errorPayload);
                return errorEvent;
            case NoSuchOracleError.name:
                errorEvent = new  AccountLookupBCNoSuchOracleErrorEvent(errorPayload);
                return errorEvent;
            case NoSuchOracleAdapterError.name:
                errorEvent = new AccountLookupBCNoSuchOracleAdapterErrorEvent(errorPayload);
                return errorEvent;
            case UnableToGetParticipantFspIdError.name:
                errorEvent = new AccountLookupBCUnableToGetParticipantFspIdErrorEvent(errorPayload);
                return errorEvent;
            case NoSuchParticipantFspIdError.name:
                errorEvent = new AccountLookupBCNoSuchParticipantFspIdErrorEvent(errorPayload);
                return errorEvent;
            default:
                errorEvent = new AccountLookUpUnknownErrorEvent(errorPayload);
                return errorEvent;
        }
    }
}