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

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 ******/

"use strict";

// Party
export class InvalidPartyIdError extends Error {};
export class InvalidPartyTypeError extends Error {};
export class NoSuchPartyError extends Error {};
export class GetPartyError extends Error {};

// Party Account.
export class InvalidPartyAccountTypeError extends Error {};
export class InvalidPartyAccountCurrencyError extends Error {};
export class InvalidPartyAcountExtensionListError extends Error {};

// Party Association
export class UnableToAssociatePartyError extends Error {};
export class PartyAssociationAlreadyExistsError extends Error {};
export class UnableToStorePartyAssociationError extends Error {};

// Party Dissociation  
export class UnableToDisassociatePartyError extends Error {};
export class PartyAssociationDoesntExistsError extends Error {};

// Oracle
export class UnableToGetOracleError extends Error {};
export class UnableToGetOracleProviderError extends Error {};
export class UnableToGetPartyError extends Error {};
