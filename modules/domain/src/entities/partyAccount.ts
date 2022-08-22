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

 * Coil
 - Jason Bruwer <jason.bruwer@coil.com>

 --------------
 ******/

 "use strict";

 import { InvalidPartyCurrencyError, InvalidPartyExtensionListError, InvalidPartyIdError, InvalidPartyTypeError } from "../errors";
 import { IPartyAccount } from "../types";
 
 export class PartyAccount implements IPartyAccount{
    id: string;
    fspId: string;
    currency: string[];
    extensionList: string[];

    constructor(
    id: string,
    fspId: string,
    currency: string[],
    extensionList: string[]
    ) {
        this.id = id;
        this.fspId = fspId;
        this.currency = currency;
        this.extensionList = extensionList;
    }

    // logic

    static validateParty(partyAccount: PartyAccount): void {
        // id.
        if (partyAccount.id === "") {
            throw new InvalidPartyIdError();
        }
        // fspId.
        if (!(partyAccount.fspId === "")) {
            throw new InvalidPartyTypeError();
        }
        // currency.
        if (!(Array.isArray(partyAccount.currency))) {
            throw new InvalidPartyCurrencyError();
        }
        // extensionList.
        if (!(Array.isArray(partyAccount.extensionList))) {
            throw new InvalidPartyExtensionListError();
        }
    }
 }
 