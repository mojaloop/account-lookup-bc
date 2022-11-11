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

 import nock from "nock";
 import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
 
export const NOT_FOUND_PARTY_TYPE = "NOT_FOUND_PARTY_TYPE";
export const NOT_FOUND_PARTY_ID = "NOT_FOUND_PARTY_ID"; 
export const NOT_FOUND_PARTY_SUB_ID = "NOT_FOUND_PARTY_SUB";
export const ERROR_FSP_ID = "ERROR_FSP_ID";

export const PARTY_TYPE = "PARTY_TYPE";
export const PARTY_ID = "PARTY_ID";
export const PARTY_SUB_ID = "PARTY_SUB_ID";
export const FSP_ID = "FSP_ID";

export const FSP_ID_RESPONSE = 1;

export class RemoteOracleProviderHttpMock {
     // Properties received through the constructor.
     private readonly logger: ILogger;
     private readonly BASE_URL: string;
 
     constructor(
         logger: ILogger,
         baseUrl: string
     ) {
         this.logger = logger;
         this.BASE_URL = baseUrl;
    }
 
    public setUp(): void {
        nock(this.BASE_URL)
            .persist()

            .get(`/participants/${NOT_FOUND_PARTY_TYPE}/${NOT_FOUND_PARTY_ID}/${NOT_FOUND_PARTY_SUB_ID}`)
            .reply(404,"Participant not found")
            
            .get(/participants.*/)
            .query(true)
            .reply(200,{
                fspId: FSP_ID_RESPONSE
            })
            
            .post(`/participants/${NOT_FOUND_PARTY_TYPE}/${NOT_FOUND_PARTY_ID}/${NOT_FOUND_PARTY_SUB_ID}`)
            .query({fspId: ERROR_FSP_ID})
            .reply(500, "Couldn't associate participant")
            
            .post(`/participants/${PARTY_TYPE}/${PARTY_ID}/${PARTY_SUB_ID}`)
            .query(true)
            .reply(200, {})

            .delete(`/participants/${NOT_FOUND_PARTY_TYPE}/${NOT_FOUND_PARTY_ID}/${NOT_FOUND_PARTY_SUB_ID}`)
            .query({fspId: ERROR_FSP_ID})
            .reply(500, "Couldn't disassociate participant")
        
            .delete(`/participants/${PARTY_TYPE}/${PARTY_ID}/${PARTY_SUB_ID}`)
            .query(true)
            .reply(200, {})
        
            .get(`/health`)
            .reply(200, {});
     }
 
     public disable(): void {
         nock.restore();
     }
 
     public enable(): void {
         nock.activate();
     }
 }
 