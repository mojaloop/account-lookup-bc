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

import { IOracleProviderAdapter, Oracle, OracleType, Association, AssociationsSearchResults } from "@mojaloop/account-lookup-bc-domain-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  UnableToAssociateParticipantError,
  UnableToDisassociateParticipantError,
  UnableToGetAssociationError,
  UnableToGetParticipantError,
  UnableToInitRemoteOracleProvider,
} from "../../../errors";

const MAX_ENTRIES_PER_PAGE = 100;

export class HttpOracleProvider implements IOracleProviderAdapter {
	private readonly _logger: ILogger;
	private readonly _oracle: Oracle;
	private httpClient: AxiosInstance;

	oracleId: string;
	type: OracleType;

	constructor(oracle: Oracle, logger: ILogger) {
		this._logger = logger.createChild(this.constructor.name);
		this._oracle = oracle;
		this.oracleId = this._oracle.id;
		this.type = "remote-http";
	}

	init(): Promise<void> {
		const url = this._oracle.endpoint;
		if (!url) {
		throw new UnableToInitRemoteOracleProvider("No endpoint defined for oracle");
		} else {
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
		return this.httpClient
		.get("/health")
		.then((response: AxiosResponse) => {
			return response.status === 200;
		})
		.catch(
			/* istanbul ignore next */ (error: Error) => {
			this._logger.error(`healthCheck: error getting health check - ${error}`);
			return false;
			}
		);
	}

	async getParticipantFspId(
		partyType: string,
		partyId: string,
		partySubType: string | null,
		currency: string | null
	): Promise<string | null> {
		let url = `/participants/${partyType}/${partyId}`;

		if (partySubType) {
		url += `?partySubType=/${partySubType}`;
		}

		if (currency) {
		url += `?currency=${currency}`;
		}

		return this.httpClient
		.get(url)
		.then((response: AxiosResponse) => {
			return response.data?.fspId ?? null;
		})
		.catch(
			/* istanbul ignore next */ (error: Error) => {
			const errorMessage = `getParticipantFspId: error getting participant fspId for partyType: ${partyType}, partyId: ${partyId}, partySubType: ${partySubType}, currency: ${currency}`;
			this._logger.error(errorMessage + ` - ${error}`);
			throw new UnableToGetParticipantError(errorMessage);
			}
		);
	}

	async associateParticipant(
		fspId: string,
		partyType: string,
		partyId: string,
		partySubType: string | null,
		currency: string | null
	): Promise<null> {
		let url = `/participants/${partyType}/${partyId}`;

		if (partySubType) {
		url += `?partySubType=/${partySubType}`;
		}

		if (currency) {
		url += `?currency=${currency}`;
		}

		return await this.httpClient
		.post(url, { fspId: fspId })
		.then((_: AxiosResponse) => {
			this._logger.debug(
			`associateParticipant: participant associated for partyType: ${partyType}, partyId: ${partyId}, partySubType: ${partySubType}, currency: ${currency} with fspId: ${fspId}`
			);
			return null;
		})
		.catch(
			/* istanbul ignore next */ (error: Error) => {
			const errorMessage = `associateParticipant: error associating participant for partyType: ${partyType}, partyId: ${partyId}, partySubType: ${partySubType}, currency: ${currency} with fspId: ${fspId}`;
			this._logger.error(errorMessage + ` - ${error}`);
			throw new UnableToAssociateParticipantError(errorMessage);
			}
		);
	}

	async disassociateParticipant(
		fspId: string,
		partyType: string,
		partyId: string,
		partySubType: string | null,
		currency: string | null
	): Promise<null> {
		let url = `/participants/${partyType}/${partyId}`;

		if (partySubType) {
		url += `?partySubType=/${partySubType}`;
		}

		if (currency) {
		url += `?currency=${currency}`;
		}

		return await this.httpClient
		.delete(url, {
			data: {
			fspId: fspId,
			},
		})
		.then((_: AxiosResponse) => {
			this._logger.debug(
			`disassociateParticipant: participant disassociated for partyType: ${partyType}, partyId: ${partyId}, partySubType: ${partySubType}, currency: ${currency} with fspId: ${fspId}`
			);
			return null;
		})
		.catch(
			/* istanbul ignore next */ (error: Error) => {
			const errorMessage = `disassociateParticipant: error disassociating participant for partyType: ${partyType}, partyId: ${partyId}, partySubType: ${partySubType}, currency: ${currency} with fspId: ${fspId}`;
			this._logger.error(errorMessage + ` - ${error}`);
			throw new UnableToDisassociateParticipantError(errorMessage);
			}
		);
	}

	async getAllAssociations(): Promise<Association[]> {
		const url = "/participants/associations";

		return await this.httpClient
			.get(url)
			.then((response: AxiosResponse) => {
				return response.data;
			})
			.catch(
				/* istanbul ignore next */ (error: Error) => {
				const errorMessage = "getAllAssociations: error getting all associations";
				this._logger.error(errorMessage + ` - ${error}`);
				throw new UnableToGetAssociationError(errorMessage);
				}
			);
	}

	searchAssociations(fspId: string | null, partyId: string | null, partyType: string | null, partySubType: string | null, currency: string | null, pageIndex?: number | undefined, pageSize?: number | undefined): Promise<AssociationsSearchResults> {
		throw new Error("Method not implemented.");
	}
	
	getSearchKeywords(): Promise<{ fieldName: string; distinctTerms: string[]; }[]> {
		throw new Error("Method not implemented.");
	}
}
