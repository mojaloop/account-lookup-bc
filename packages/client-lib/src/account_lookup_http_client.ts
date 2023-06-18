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

import axios, {AxiosInstance, AxiosResponse} from "axios";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	UnableToGetFspIdBulkError,
	UnableToGetFspIdError,
} from "./errors";

const DEFAULT_TIMEOUT_MS = 5000;
const SERVICE_BASE_PATH = "/account-lookup";

export class AccountLookupHttpClient {
	private readonly _logger: ILogger;
	private readonly _httpClient: AxiosInstance;

	constructor(
		logger: ILogger,
		baseUrl: string,
		timeoutMs: number = DEFAULT_TIMEOUT_MS
	) {
		this._logger = logger;

		this._httpClient = axios.create({
			baseURL: baseUrl,
			timeout: timeoutMs
		});
	}

	async participantLookUp(partyId:string, partyType:string, currency:string | null): Promise<string | null> {
		let url = SERVICE_BASE_PATH + `/${partyId}/${partyType}`;
		if (currency) {
			url += `?currency=${currency}`;
		}

		try {
			const axiosResponse: AxiosResponse = await this._httpClient.get(url,
				{
					validateStatus: (statusCode: number) => {
						return statusCode === 200 || statusCode === 404;
					}
				}
			);

			return axiosResponse.data;
		} catch (error: unknown) {
			const errorMessage = "Account Lookup Client - Unable to Get FspId ";
			this._logger.error(errorMessage + `  - ${error}`);
			throw new UnableToGetFspIdError(errorMessage);
		}
	}

	async participantBulkLookUp(partyIdentifiers :{[key:string]: { partyType: string, partyId: string, currency: string | null}}): Promise<{[key: string]: string | null}| null> {
		try {
			const axiosResponse: AxiosResponse = await this._httpClient.post(SERVICE_BASE_PATH, partyIdentifiers,
				{
					validateStatus: (statusCode: number) => {
						return statusCode === 200 || statusCode === 404;
					}
				}
			);

			return axiosResponse.data;
		} catch (error: unknown) {
			const errorMessage = "Account Lookup Client - Unable to Get FspId Bulk";
			this._logger.error(errorMessage + `  - ${error}`);
			throw new UnableToGetFspIdBulkError(errorMessage);
		}
	}
}
