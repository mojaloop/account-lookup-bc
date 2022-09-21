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

import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";

export enum CurrencyType {
	DOLLAR = "dollar",
	EURO = "euro",
}

export interface IParty {
    id: string;
    type: string;
    currency: string | null;
    subId: string | null;
}

export interface IPartyAccount {
	fspId: string;
	currency: string[];
	extensionList: string[];
}

export interface IParticipant {
    id: string;
    type: string;
    subId: string | null;
    isActive: boolean;
}

export interface IParticipantAccount {
	fspId: string;
	extensionList: string[];
}


export enum AccountLookUpEventsType  {
    GetParticipant = "[Account Lookup] Get Participant",
    GetParty = "[Account Lookup] Get Party",
    AssociateParty = "[Account Lookup] Associate Party",
    DisassociateParty = "[Account Lookup] Disassociate Party",
}

export interface IAccountLookUpMessage extends IMessage {
    value: {
        type:AccountLookUpEventsType,
        payload: object
    }
}

export type ParticipantQueryReceived = {
    sourceFspId: string;
    partyType: string;
    partyId: string;
    partySubType?: string;
    currency?: string;
    destinationFspId?: string;
}

export type ParticipantQueryResponse = {
    fspId: string;
    partyType: string;
    partyId: string;
    partySubType?: string;
    currency?: string;
}


export type PartyQueryReceived = {
    sourceFspId: string;
    partyType: string;
    partyId: string;
    partySubType?: string;
    currency?: string;
    destinationFspId?: string;
}

export type PartyInfoRequested  = {
    fspId: string;
    partyType: string;
    partyId: string;
    partySubType?: string;
    currency?: string;
}

export type PartyInfoAvailable = {
    sourceFspId: string;
    destinationFspId: string;
    partyType: string;
    partyId: string;
    partySubType?: string;
    currency?: string;
    partyName?: string;
    partyDoB?: string;

}

export type PartyQueryResponse = {
    sourceFspId: string;
    destinationFspId: string;
    partyType: string;
    partyId: string;
    partySubType?: string;
    currency?: string;
    partyName?: string;
    partyDoB?: string;

}

export type ParticipantAssociationRequestReceived = {
    requesterFspId: string; 
    partyType: string; 
    partyId: string;
    partySubType?: string;
}

export type ParticipantDisassociationRequestReceived = {
    requesterFspId: string; 
    partyType: string; 
    partyId: string;
    partySubType?: string;
}

export type ParticipantAssociationResponse = Record<string, unknown>

export type ParticipantDisassociationResponse = Record<string, unknown>
