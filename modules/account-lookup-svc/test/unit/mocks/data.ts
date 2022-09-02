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

 import { IParty } from "@mojaloop/account-lookup-bc-domain";
 
 export const mockedPartyIds = ["party1", "party2", "party3","partyError"];
 export const mockedPartyResultIds = ["party1", "party2", "party3"];
 export const mockedPartyResultSubIds = ["subId1", "subId2", "subId3"];
 
 export const mockedPartySubIds = ["subId2","subId3"];
 export const mockedPartyTypes = ["bank", "creditUnion", "insurance"];
 
 
 export const mockedOracleList = [
     {
         id: mockedPartyIds[0],
         type: mockedPartyTypes[0],
     },
     {
         id: mockedPartyIds[1],
         type: mockedPartyTypes[1],
     },
     {
         id: mockedPartyIds[2],
         type: mockedPartyTypes[2],
     },
     
 ];
 
 
 export const mockedParties: Map<{partyId:string, partyType:string, partySubId?:string}, IParty| Error> = new Map();
 mockedParties.set({partyId:mockedPartyIds[0],partyType:mockedPartyTypes[0]},{currency: "dollar", id: mockedPartyResultIds[0], subId: mockedPartyResultSubIds[0],type: "individual"});
 mockedParties.set({partyId:mockedPartyIds[1],partyType:mockedPartyTypes[1],partySubId:mockedPartySubIds[0]}, {currency: "dollar", id: mockedPartyResultIds[1], subId: mockedPartyResultSubIds[1],type: "individual"});
 mockedParties.set({partyId:mockedPartyIds[2],partyType:mockedPartyTypes[2],partySubId:mockedPartySubIds[1]}, {currency: "euro", id: mockedPartyResultIds[2], subId: mockedPartyResultSubIds[2],type: "individual"});
 mockedParties.set({partyId:mockedPartyIds[3],partyType:mockedPartyTypes[2]}, new Error());
 mockedParties.set({partyId:mockedPartyIds[3],partyType:mockedPartyTypes[2], partySubId:mockedPartySubIds[0]}, new Error());
 
 
 
 export const mockedPartyAssociations: Map<{partyType:string,partyId:string,partySubId?:string}, null| Error> = new Map();
 mockedPartyAssociations.set({partyId:mockedPartyIds[0],partyType:mockedPartyTypes[0]}, null);
 mockedPartyAssociations.set({partyId:mockedPartyIds[1],partyType:mockedPartyTypes[1],partySubId:"subId2"}, null);
 mockedPartyAssociations.set({partyId:mockedPartyIds[2],partyType:mockedPartyTypes[2],partySubId:"subId3"}, new Error());
 
 
 