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

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 ******/

"use strict";

type AccountLookupErrorCodeKeys = keyof typeof AccountLookupErrorCodes;

export const AccountLookupErrorCodes = {
    COMMAND_TYPE_UNKNOWN: "Command type is unknown",
    UNABLE_TO_ASSOCIATE_PARTICIPANT: "Unable to associate participant",
    UNABLE_TO_DISASSOCIATE_PARTICIPANT: "Unable to disassociate participant",
    DESTINATION_PARTICIPANT_NOT_FOUND: "Payee participant not found",
    SOURCE_PARTICIPANT_NOT_FOUND: "Payer participant not found",
    INVALID_DESTINATION_PARTICIPANT: "Invalid payee participant",
    INVALID_SOURCE_PARTICIPANT: "Invalid payer participant",
    INVALID_MESSAGE_PAYLOAD: "Invalid message payload",
    INVALID_MESSAGE_TYPE: "Invalid message type",
    UNABLE_TO_GET_ORACLE_ADAPTER: "Unable to get oracle adapter",
    UNABLE_TO_GET_PARTICIPANT_FROM_ORACLE: "Unable to get participant from oracle",
    REQUIRED_SOURCE_PARTICIPANT_ID_MISMATCH: "Payer participant id mismatch",
    REQUIRED_SOURCE_PARTICIPANT_NOT_APPROVED: "Payer participant not approved",
    REQUIRED_SOURCE_PARTICIPANT_NOT_ACTIVE: "Payer participant not active",
    REQUIRED_DESTINATION_PARTICIPANT_ID_MISMATCH: "Payee participant id mismatch",
    REQUIRED_DESTINATION_PARTICIPANT_NOT_APPROVED: "Payee participant not approved",
    REQUIRED_DESTINATION_PARTICIPANT_NOT_ACTIVE: "Payee participant not approved",
} as const;

export const AccountLookupErrorCodeNames: {
    [K in AccountLookupErrorCodeKeys]: K;
  } = {
    COMMAND_TYPE_UNKNOWN: "COMMAND_TYPE_UNKNOWN",
    UNABLE_TO_ASSOCIATE_PARTICIPANT: "UNABLE_TO_ASSOCIATE_PARTICIPANT",
    UNABLE_TO_DISASSOCIATE_PARTICIPANT: "UNABLE_TO_DISASSOCIATE_PARTICIPANT",
    DESTINATION_PARTICIPANT_NOT_FOUND: "DESTINATION_PARTICIPANT_NOT_FOUND",
    SOURCE_PARTICIPANT_NOT_FOUND: "SOURCE_PARTICIPANT_NOT_FOUND",
    INVALID_DESTINATION_PARTICIPANT: "INVALID_DESTINATION_PARTICIPANT",
    INVALID_SOURCE_PARTICIPANT: "INVALID_SOURCE_PARTICIPANT",
    INVALID_MESSAGE_PAYLOAD: "INVALID_MESSAGE_PAYLOAD",
    INVALID_MESSAGE_TYPE: "INVALID_MESSAGE_TYPE",
    UNABLE_TO_GET_ORACLE_ADAPTER: "UNABLE_TO_GET_ORACLE_ADAPTER",
    UNABLE_TO_GET_PARTICIPANT_FROM_ORACLE: "UNABLE_TO_GET_PARTICIPANT_FROM_ORACLE",
    REQUIRED_SOURCE_PARTICIPANT_ID_MISMATCH: "REQUIRED_SOURCE_PARTICIPANT_ID_MISMATCH",
    REQUIRED_SOURCE_PARTICIPANT_NOT_APPROVED: "REQUIRED_SOURCE_PARTICIPANT_NOT_APPROVED",
    REQUIRED_SOURCE_PARTICIPANT_NOT_ACTIVE: "REQUIRED_SOURCE_PARTICIPANT_NOT_ACTIVE",
    REQUIRED_DESTINATION_PARTICIPANT_ID_MISMATCH: "REQUIRED_DESTINATION_PARTICIPANT_ID_MISMATCH",
    REQUIRED_DESTINATION_PARTICIPANT_NOT_APPROVED: "REQUIRED_DESTINATION_PARTICIPANT_NOT_APPROVED",
    REQUIRED_DESTINATION_PARTICIPANT_NOT_ACTIVE: "REQUIRED_DESTINATION_PARTICIPANT_NOT_ACTIVE",
  };