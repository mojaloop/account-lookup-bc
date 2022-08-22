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

import {IOracleProvider, IParty, IPartyAccount} from "@mojaloop/account-lookup-bc-domain";

export class ExampleOracleProvider implements IOracleProvider{
    init(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    destroy(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getPartyByTypeAndId(partyType: String, partyId: String): Promise<any> {
        throw new Error("Method not implemented.");
    }
    getPartyByTypeAndIdAndSubId(partyType: String, partyId: String, partySubId: String): Promise<IParty | null> {
        throw new Error("Method not implemented.");
    }
    associatePartyByTypeAndId(partyType: String, partyId: String): Promise<IPartyAccount | null> {
        throw new Error("Method not implemented.");
    }
    associatePartyByTypeAndIdAndSubId(partyType: String, partyId: String, partySubId: String): Promise<IPartyAccount | null> {
        throw new Error("Method not implemented.");
    }
    disassociatePartyByTypeAndId(partyType: String, partyId: String): Promise<IPartyAccount | null> {
        throw new Error("Method not implemented.");
    }
    disassociatePartyByTypeAndIdAndSubId(partyType: String, partyId: String, partySubId: String): Promise<IPartyAccount | null> {
        throw new Error("Method not implemented.");
    }
    createParty(type: String, id: String): Promise<IPartyAccount | null> {
        throw new Error("Method not implemented.");
    }
    deleteParty(type: String, id: String): Promise<void> {
        throw new Error("Method not implemented.");
    }
    id: String;
    async getParty(type:String, id:string):Promise<IParty|null>{
        throw new Error("not implemented");
    }
    async associateParty(type:String, id:string):Promise<IPartyAccount | null>{
        throw new Error("not implemented");
    }
    async disassociateParty(type:String, id:string):Promise<void>{
        throw new Error("not implemented");
    }

}
