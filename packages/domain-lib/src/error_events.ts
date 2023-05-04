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


import { AccountLookupBCInvalidMessageTypeErrorPayload, AccountLookupBCInvalidMessageTypeErrorEvent, AccountLookupBCInvalidMessagePayloadErrorEvent, AccountLookupBCInvalidMessageErrorPayload, AccountLookupBCInvalidParticipantIdErrorPayload, AccountLookupBCInvalidParticipantIdErrorEvent, AccountLookupBCNoSuchParticipantErrorPayload, AccountLookupBCNoSuchParticipantErrorEvent, AccountLookupBCUnableToGetParticipantFspIdErrorPayload, AccountLookupBCUnableToGetParticipantFspIdErrorEvent, AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent, AccountLookupBCNoSuchOracleErrorEvent, AccountLookupBCNoSuchOracleAdapterErrorEvent, AccountLookUpUnknownErrorEvent, AccountLookupBCUnableToGetOracleFromOracleFinderErrorPayload, AccountLookupBCNoSuchOracleErrorPayload, AccountLookupBCNoSuchOracleAdapterErrorPayload, AccountLookupBCUnableToAssociateParticipantErrorEvent, AccountLookupBCUnableToAssociateParticipantErrorPayload, AccountLookupBCUnableToDisassociateParticipantErrorEvent, AccountLookupBCUnableToDisassociateParticipantErrorPayload, AccountLookUpUnknownErrorPayload } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { UnableToGetOracleFromOracleFinderError, NoSuchOracleError, NoSuchOracleAdapterError } from "./errors";

export function createInvalidMessageTypeError(errorDescription:string, partyId: string, partyType: string| null, partySubType: string| null, fspId: string| null): AccountLookupBCInvalidMessageTypeErrorEvent {
    const invalidMessageTypeErrorPayload: AccountLookupBCInvalidMessageTypeErrorPayload = {
        partyId: partyId,
        partySubType: partySubType,
        partyType: partyType,
        fspId,
        errorDescription,
    };
    const errorEvent = new AccountLookupBCInvalidMessageTypeErrorEvent(invalidMessageTypeErrorPayload);
    return errorEvent;
}

export function createInvalidMessagePayloadErrorEvent(errorDescription:string, partyId: string, partyType: string| null, partySubType: string| null, fspId: string| null):AccountLookupBCInvalidMessagePayloadErrorEvent  {
    const invalidMessageErrorPayload: AccountLookupBCInvalidMessageErrorPayload = {
        partyId,
        partySubType,
        partyType,
        fspId,
        errorDescription
    };
    const errorEvent = new AccountLookupBCInvalidMessagePayloadErrorEvent(invalidMessageErrorPayload);
    return errorEvent;
}

export function createInvalidParticipantIdError(errorDescription:string, partyId: string, partyType: string| null, partySubType: string| null, fspId: string| null): AccountLookupBCInvalidParticipantIdErrorEvent {
    const invalidParticipantIdErrorPayload: AccountLookupBCInvalidParticipantIdErrorPayload = {
        partyId,
        partySubType,
        partyType,
        fspId,
        errorDescription
    };
    const errorEvent = new AccountLookupBCInvalidParticipantIdErrorEvent(invalidParticipantIdErrorPayload);
    return errorEvent;
}

export function createNoSuchParticipantErrorEvent(errorDescription:string, partyId: string, partyType: string| null, partySubType: string| null, fspId: string| null): AccountLookupBCNoSuchParticipantErrorEvent {
    const noSuchParticipantErrorPayload: AccountLookupBCNoSuchParticipantErrorPayload = {
        partyId,
        partySubType,
        partyType,
        fspId,
        errorDescription
    };
    const errorEvent = new AccountLookupBCNoSuchParticipantErrorEvent(noSuchParticipantErrorPayload);
    return errorEvent;
}

export function createUnableToGetParticipantFspIdErrorEvent(errorDescription:string, partyId: string, partyType: string| null, partySubType: string| null, fspId: string| null): AccountLookupBCUnableToGetParticipantFspIdErrorEvent {
    const unableToGetParticipantFspIdErrorPayload: AccountLookupBCUnableToGetParticipantFspIdErrorPayload = {
        partyId,
        partySubType,
        partyType,
        fspId,
        errorDescription
    };
    const errorEvent = new AccountLookupBCUnableToGetParticipantFspIdErrorEvent(unableToGetParticipantFspIdErrorPayload);
    return errorEvent;
}

export function createOracleErrorEvent(error:Error, partyId: string, partyType: string| null, partySubType: string| null, fspId: string| null): AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent | AccountLookupBCNoSuchOracleErrorEvent | AccountLookupBCNoSuchOracleAdapterErrorEvent | AccountLookUpUnknownErrorEvent  {
    switch(error.constructor.name){
        case UnableToGetOracleFromOracleFinderError.name:
        {
            const unableToGetOracleFromOracleFinderErrorPayload: AccountLookupBCUnableToGetOracleFromOracleFinderErrorPayload = {
                partyId,
                partySubType,
                partyType,
                fspId,
                errorDescription: error?.message
            };
            const errorEvent = new AccountLookupBCUnableToGetOracleFromOracleFinderErrorEvent(unableToGetOracleFromOracleFinderErrorPayload);
            return errorEvent;
        }
        case NoSuchOracleError.name:
        {
            const noSuchOracleErrorPayload: AccountLookupBCNoSuchOracleErrorPayload = {
                partyId,
                partySubType,
                partyType,
                fspId,
                errorDescription: error?.message
            };
            const errorEvent = new AccountLookupBCNoSuchOracleErrorEvent(noSuchOracleErrorPayload);
            return errorEvent;
        }
        case NoSuchOracleAdapterError.name:
        {
            const noSuchOracleAdapterErrorPayload: AccountLookupBCNoSuchOracleAdapterErrorPayload = {
                partyId,
                partySubType,
                partyType,
                fspId,
                errorDescription: error?.message
            };
            const errorEvent = new AccountLookupBCNoSuchOracleAdapterErrorEvent(noSuchOracleAdapterErrorPayload);
            return errorEvent;
        }
        default:
            return createUnknownErrorEvent(error?.message, partyId, partyType, partySubType, fspId);
    }
}

export function createUnableToAssociateErrorEvent(errorDescription:string, partyId: string, partyType: string| null, partySubType: string| null, fspId: string| null): AccountLookupBCUnableToAssociateParticipantErrorEvent  {
    const errorPayload: AccountLookupBCUnableToAssociateParticipantErrorPayload = {
        fspId,
        partyType,
        partyId,
        partySubType,
        errorDescription
    };
    const errorEvent = new AccountLookupBCUnableToAssociateParticipantErrorEvent(errorPayload);
    return errorEvent;
}

export function createUnableToDisassociateErrorEvent(errorDescription:string, partyId: string, partyType: string| null, partySubType: string| null, fspId: string| null): AccountLookupBCUnableToDisassociateParticipantErrorEvent {

    const errorPayload: AccountLookupBCUnableToDisassociateParticipantErrorPayload = {
        fspId,
        partyType,
        partyId,
        partySubType,
        errorDescription
    };
    const errorEvent = new AccountLookupBCUnableToDisassociateParticipantErrorEvent(errorPayload);
    return errorEvent;
}

export function createUnknownErrorEvent(errorDescription:string, partyId: string, partyType: string| null, partySubType: string| null, fspId: string| null) : AccountLookUpUnknownErrorEvent {

    const errorPayload: AccountLookUpUnknownErrorPayload = {
        partyId,
        partySubType,
        partyType,
        fspId,
        errorDescription: errorDescription ?? "Unknown error"
    };
    const errorEvent = new AccountLookUpUnknownErrorEvent(errorPayload);
    return errorEvent;
}
