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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	UnableToGetFspIdError,
} from "./errors";
import {IAuthenticatedHttpRequester} from "@mojaloop/security-bc-client-lib";


const SERVICE_BASE_PATH = "/account-lookup";
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
export class AccountLookupHttpClient {
	private readonly _logger: ILogger;
	private readonly _authRequester: IAuthenticatedHttpRequester;
	private readonly _baseUrlHttpService :string;
	private readonly _requestTimeoutMs: number;

	constructor(
		logger: ILogger,
		baseUrlHttpService: string,
		authRequester: IAuthenticatedHttpRequester,
		requestTimeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
	) {
		this._logger = logger;
        this._baseUrlHttpService = baseUrlHttpService;
        this._authRequester = authRequester;
		this._requestTimeoutMs = requestTimeoutMs;
	}

	async participantLookUp(partyType:string, partyId:string, currency:string | null): Promise<string | null> {
			if(!partyType || !partyId){
				throw new UnableToGetFspIdError(`Account Lookup Client - Unable to Get FspId - partyType or partyId is null`);
			}

			let urlBuilder = `${SERVICE_BASE_PATH}/${partyType}/${partyId}`;

			if (currency) {
				urlBuilder += `?currency=${currency}`;
			}

			const url = new URL(urlBuilder, this._baseUrlHttpService).toString();

			const resp = await this._authRequester.fetch(url, this._requestTimeoutMs)
				.catch((err) => {
					console.log(err);
					this._logger.error(`Account Lookup Client - Unable to Get FspId - ${err}`);
					throw new UnableToGetFspIdError(`Account Lookup Client - Unable to Get FspId - ${err}`);
				});

			if(resp.status === 200){
                const data = await resp.text().catch((err) => {
					this._logger.error(err.message);
					throw new UnableToGetFspIdError(`Account Lookup Client - Unable to Get FspId - ${err}`);
				});
                return data;
            }

			if(resp.status === 404){
				return null;
			}

			throw new UnableToGetFspIdError(`Account Lookup Client - Unable to Get FspId - ${resp.status}`);
	}

}
