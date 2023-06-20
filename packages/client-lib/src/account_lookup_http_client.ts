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
	UnableToGetFspIdBulkError,
	UnableToGetFspIdError,
} from "./errors";
import { ILocalCache, LocalCache } from "@mojaloop/account-lookup-bc-implementations-lib";
import {IAuthenticatedHttpRequester,} from "@mojaloop/security-bc-client-lib";


const DEFAULT_REQUEST_TIMEOUT_MS = 100000;
const DEFAULT_CACHE_TIMEOUT_MS = 1*60*1000;
export class AccountLookupHttpClient {
	private readonly _logger: ILogger;
	private readonly _authRequester: IAuthenticatedHttpRequester;
	private readonly _baseUrlHttpService :string;
	private readonly _cache: ILocalCache;
	private readonly _cacheTimeoutMs: number;
	private readonly _requestTimeoutMs: number;

	constructor(
		logger: ILogger,
		baseUrlHttpService: string,
		authRequester: IAuthenticatedHttpRequester,
        cacheTimeoutMs: number = DEFAULT_CACHE_TIMEOUT_MS,
		requestTimeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
	) {
		this._logger = logger;
        this._baseUrlHttpService = baseUrlHttpService;
        this._authRequester = authRequester;
        this._cacheTimeoutMs = cacheTimeoutMs;
		this._requestTimeoutMs = requestTimeoutMs;
		this._cache = new LocalCache(this._logger, this._cacheTimeoutMs);
	}

	async participantLookUp(partyId:string, partyType:string, currency:string | null): Promise<string | null> {
			let urlBuilder = `/account-lookup/${partyId}/${partyType}`;

			if (currency) {
				urlBuilder += `?currency=${currency}`;
			}

			const cached = this._cache.get(partyId, partyType, currency);
			if (cached) {
				return cached.toString();
			}

			const url = new URL(urlBuilder, this._baseUrlHttpService).toString();

			const resp = await fetch(url)
				.catch((err) => {
					console.log(err);
					this._logger.error(`Account Lookup Client - Unable to Get FspId - ${err}`);
					throw new UnableToGetFspIdError(`Account Lookup Client - Unable to Get FspId - ${err}`);
				});

			if(resp.status === 200){
                const data = await resp.json();
                this._cache.set(data, partyId, partyType, currency);
                return data;
            }

			if(resp.status === 404){
				return null;
			}

			throw new UnableToGetFspIdError(`Account Lookup Client - Unable to Get FspId - ${resp.status}`);
	}

	async participantBulkLookUp(partyIdentifiers :Map<string,{partyType: string, partyId: string, currency: string | null}>): Promise<Map<string, string | null> | null> {
		const url = new URL("/account-lookup",this._baseUrlHttpService).toString();
		const request = new Request(url, {
			method: "POST",
			body: JSON.stringify(partyIdentifiers),
		});

		const resp = await this._authRequester.fetch(request,this._requestTimeoutMs)
			.catch((err) => {
				this._logger.error(`Account Lookup Client - Unable to Get FspId Bulk - ${err}`);
				throw new UnableToGetFspIdBulkError(`Account Lookup Client - Unable to Get FspId Bulk - ${err}`);
			});

		if(resp.status === 200){
			const data = await resp.json();
			return data;
		}

		if(resp.status === 404){
			return null;
		}

		throw new UnableToGetFspIdBulkError(`Account Lookup Client - Unable to Get FspId Bulk - ${resp.status}`);

	}
}
