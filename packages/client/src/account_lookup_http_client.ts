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

import axios, {AxiosInstance, AxiosResponse, AxiosError} from "axios";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
	ConnectionRefusedError,
	UnableToGetFspIdError,
} from "./errors";

const DEFAULT_TIMEOUT_MS = 5000;

export class AccountLookupHttpClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private readonly httpClient: AxiosInstance;
	private readonly UNKNOWN_ERROR_MESSAGE: string = "Unknown error";

	constructor(
		logger: ILogger,
		baseUrlHttpService: string,
		timeoutMs: number = DEFAULT_TIMEOUT_MS
	) {
		this.logger = logger;

		this.httpClient = axios.create({
			baseURL: baseUrlHttpService,
			timeout: timeoutMs
		});
	}

	private _handleServerError<T extends Error>(err: unknown, errorType: new(msg:string) => T):void{
		const axiosError: AxiosError = err as AxiosError;

		// handle connection refused
		if(axiosError.code === "ECONNREFUSED"){
			const err = new ConnectionRefusedError();
			this.logger.error(err);
			throw err;
		}

		// handle errors with a data.msg prop in the body
		if (axiosError.response !== undefined) {
			const errMsg =  (axiosError.response.data as any).msg || "unknown error";
			const err = new errorType(errMsg);
			this.logger.error(err);
			throw err;
		}

		// handle everything else
		throw new errorType(this.UNKNOWN_ERROR_MESSAGE);
	}

	async getFspIdByTypeAndId(partyId:string, partyType:string,currency:string | null): Promise<string | null> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(
				`${partyType}/${partyId}?currency=${currency}`,
				{
					validateStatus: (statusCode: number) => {
						return statusCode === 200 || statusCode === 404;
					}
				}
			);
			
			if (axiosResponse.status === 404) {
				return null;
			}
			
			return axiosResponse.data;
		} catch (e: unknown) {
			this._handleServerError(e, UnableToGetFspIdError);
			return null;
		}
	}

	async getFspIdByTypeAndIdAndSubId(partyId:string, partyType:string, partySubIdOrType:string | null, currency:string | null): Promise<string | null> {
		try {
			const axiosResponse: AxiosResponse = await this.httpClient.get(
				`${partyType}/${partyId}/${partySubIdOrType}?currency=${currency}`,
				{
					validateStatus: (statusCode: number) => {
						return statusCode === 200 || statusCode === 404;
					}
				}
			);

			if (axiosResponse.status === 404) {
				return null;
			}

			return axiosResponse.data;
		} catch (e: unknown) {
			this._handleServerError(e, UnableToGetFspIdError);
			return null;
		}
	}

}
