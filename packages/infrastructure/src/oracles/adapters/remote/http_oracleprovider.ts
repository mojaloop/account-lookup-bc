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

import { IOracleProviderAdapter, OracleType } from "@mojaloop/account-lookup-bc-domain";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import axios, {AxiosInstance, AxiosResponse} from "axios";

//Create a class that implements the IOracleProviderAdapter interface using http requests
export class HttpOracleProvider implements IOracleProviderAdapter {
    private readonly _endpoint: string;
    private readonly _logger: ILogger;
    private httpClient: AxiosInstance;
    oracleId: string;
    type: OracleType;

    constructor(logger:ILogger, oracleId: string, endpoint: string) {
        this._logger = logger;
        this._endpoint = endpoint;
        this.oracleId = oracleId;
        this.type = "remote-http";
    }

    init(): Promise<void> {
        this.httpClient = axios.create({
			baseURL: this._endpoint,
		});
        return Promise.resolve();
    }

    destroy(): Promise<void> {
         return Promise.resolve();
    }

    async healthCheck(): Promise<boolean> {
        return this.httpClient.get("/health").then((response: AxiosResponse) => {
            return response.status === 200;
        }).catch((error: Error) => {
            this._logger.error(`healthCheck: error checking health - ${error}`);
            return false;
        });
    }

    async getParticipantFspId(partyId: string): Promise<string | null> {
        return this.httpClient.get("/participants", { params: { partyId: partyId } }).then((
            response: AxiosResponse) => {
            return response.data?.fspId ?? null;
        }).catch((error: Error) => {
            this._logger.error(`getParticipantFspId: error getting participant fspId for partyId: ${partyId}) - ${error}`);
            return null;
        });
    }

    async associateParticipant(partyId: string, fspId: string): Promise<null> {
        return await this.httpClient.post("/participants", { partyId: partyId, fspId: fspId }).then((
            response: AxiosResponse) => {
            return null;
        }).catch((error: Error) => {
            this._logger.error(`associateParticipant: error associating participant for partyId: ${partyId}), fspId ${fspId}) - ${error}`); 
            throw new Error('Error associating participant');
        });
    }

    async disassociateParticipant(partyId: string, fspId: string): Promise<null> {
        return await this.httpClient.delete("/participants", { params: { partyId: partyId, fspId: fspId } }).then((
            response: AxiosResponse) => {
            return null;
        }).catch((error: Error) => {
            this._logger.error(`disassociateParticipant: error disassociating participant for partyId: ${partyId}) fspId ${fspId}) - ${error}`); 
            throw new Error('Error disassociating participant');
        });    
    }
}
