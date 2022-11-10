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


 import {
	 IOracleProviderAdapter,
     Oracle, OracleType,
 } from "../../../src/interfaces/infrastructure";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { mockedOracleAdapterResults } from "./data";


 export class MemoryOracleProviderAdapter implements IOracleProviderAdapter {
	oracleId: string;
    type: OracleType;
   
    private readonly _logger: ILogger;
	
	constructor(
		logger: ILogger,
        oracle: Oracle,
	) {
		this._logger = logger;
        this.oracleId = oracle.id;
        this.type = oracle.type; 
	}
     init(): Promise<void> {
        return Promise.resolve();
     }
     destroy(): Promise<void> {
         return Promise.resolve();
     }
     healthCheck(): Promise<boolean> {
        return Promise.resolve(true);
     }
     getParticipantFspId(partyType: string, partyId: string, partySubType: string | null, currency: string | null): Promise<string | null> {
        const result = mockedOracleAdapterResults.find((result) => {
            return result.partyType === partyType && result.partySubType === partySubType
        })
        if(result) {
            return Promise.resolve(result.fspId);
        }
        return Promise.resolve(null);
     }
     associateParticipant(fspId: string, partyType: string, partyId: string, partySubType: string | null, currency: string | null): Promise<null> {
        const isAssociationPossible = mockedOracleAdapterResults.find((result) => {
            return result.partyType === partyType && result.partySubType === partySubType
        })?.association;
        if(isAssociationPossible) {
            return Promise.resolve(null);
        }
        return Promise.reject(new Error("Association not possible"));
     }
     disassociateParticipant(fspId: string, partyType: string, partyId: string, partySubType: string | null, currency: string | null): Promise<null> {
        const isDisassociationPossible = mockedOracleAdapterResults.find((result) => {
            return result.partyType === partyType && result.partySubType === partySubType
        })?.disassociation;
        if(isDisassociationPossible) {
            return Promise.resolve(null);
        }
        return Promise.reject(new Error("Disassociation not possible"));

     }
}
