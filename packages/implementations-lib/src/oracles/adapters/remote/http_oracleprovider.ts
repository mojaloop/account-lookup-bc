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

import {IOracleProviderAdapter, Oracle, OracleType, Association} from "@mojaloop/account-lookup-bc-domain-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import axios, {AxiosInstance, AxiosResponse} from "axios";
import { UnableToInitRemoteOracleProvider } from "../../../errors";

export class HttpOracleProvider implements IOracleProviderAdapter {
    private readonly _logger: ILogger;
    private readonly _oracle: Oracle;
    private httpClient: AxiosInstance;

    oracleId: string;
    type: OracleType;

    constructor(oracle:Oracle, logger:ILogger) {
        this._logger = logger.createChild(this.constructor.name);
        this._oracle = oracle;
        this.oracleId = this._oracle.id;
        this.type = "remote-http";
    }

    init(): Promise<void> {
            const url = this._oracle.endpoint;
            if(!url){
                throw new UnableToInitRemoteOracleProvider('No endpoint defined for oracle');
            }
            else {
                this.httpClient = axios.create({
                    baseURL: this._oracle.endpoint as string,
                });
            }

        return Promise.resolve();
    }

    destroy(): Promise<void> {
         return Promise.resolve();
    }

    async healthCheck(): Promise<boolean> {
        return this.httpClient.get("/health").then((response: AxiosResponse) => {
            return response.status === 200;
        }).catch((error: Error) => {
            this._logger.error(`healthCheck: error getting health check - ${error}`);
            throw new Error('Error checking health');
        });
    }

    async getParticipantFspId(partyType:string, partyId: string, partySubId:string|null, currency:string| null ): Promise<string|null> {
        let url = `/participants/${partyType}/${partyId}`;
        if(partySubId) url+=`/${partySubId}`;
        if(currency) url+=`?currency=${currency}`;

        return this.httpClient.get(url).then((
            response: AxiosResponse) => {
            return response.data?.fspId ?? null;
        }).catch((error: Error) => {
            this._logger.error(`getParticipantFspId: error getting participant fspId for partyType: ${partyType}, partyId: ${partyId}, partySubId: ${partySubId}, currency: ${currency} - ${error}`);
            throw new Error('Error getting participant fspId');
        });
    }

    async associateParticipant(fspId:string, partyType:string, partyId: string,partySubId:string|null, currency:string| null):Promise<null> {
        let url = `/participants/${partyType}/${partyId}`;
        if(partySubId) url+=`/${partySubId}`;
        if(currency) url+=`?currency=${currency}`;

        return await this.httpClient.post(url, { fspId: fspId}).then((
                _: AxiosResponse) => {
                this._logger.debug(`associateParticipant: participant associated for partyType: ${partyType}, partyId: ${partyId}, partySubId: ${partySubId}, currency: ${currency} with fspId: ${fspId}`);
                return null;
            }).catch((error: Error) => {
                const err= new Error(`associateParticipant: error associating participant for partyType: ${partyType}, partyId: ${partyId}, partySubId: ${partySubId}, currency: ${currency} with fspId: ${fspId} - ${error}`);
                this._logger.error(err);
                throw err;
            });
    }

    async disassociateParticipant(fspId:string, partyType:string, partyId: string ,partySubId:string|null, currency:string| null):Promise<null> {
        let url = `/participants/${partyType}/${partyId}`;
        if(partySubId) url+=`/${partySubId}`;
        if(currency) url+=`?currency=${currency}`;

        return await this.httpClient.delete(url, { data:{
                fspId: fspId
            }}).then((
            _: AxiosResponse) => {
                this._logger.debug(`disassociateParticipant: participant disassociated for partyType: ${partyType}, partyId: ${partyId}, partySubId: ${partySubId}, currency: ${currency} with fspId: ${fspId}`);
                return null;
            }).catch((error: Error) => {
                this._logger.error(`disassociateParticipant: error disassociating participant for partyType: ${partyType}, partyId: ${partyId}, partySubId: ${partySubId}, currency: ${currency} with fspId: ${fspId} - ${error}`);
                throw new Error('Error disassociating participant');
            });    
    }

    async getAllAssociations():Promise<Association[]> {
		return [];
	}
}
