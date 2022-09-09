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

import { AccountLookupAggregate, IParticipant } from "@mojaloop/account-lookup-bc-domain";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import express from "express";


export class ExpressRoutes {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly aggregate: AccountLookupAggregate;
	// Other properties.
	private readonly _router: express.Router;
	private readonly UNKNOWN_ERROR_MESSAGE: string = "unknown error";

	constructor(
		logger: ILogger,
		aggregate: AccountLookupAggregate
	) {
		this.logger = logger;
		this.aggregate = aggregate;

		this._router = express.Router();

		this.setUp();
	}

	private setUp(): void {
		// Gets.
		this._router.get("/participants", this.participants.bind(this));
	}

	get router(): express.Router {
		return this._router;
	}



	private async participants(req: express.Request, res: express.Response): Promise<void> {
		// req.query is always defined - if no query was specified, req.query is an empty object.
		if (req.query.id !== undefined) {
			await this.getParticipantById(req, res);
			return;
		}
		this.sendErrorResponse( // TODO: should this be done?
			res,
			400, // TODO: status code.
			"invalid query"
		);
	}


	private async getParticipantById(req: express.Request, res: express.Response): Promise<void> {
		try {
			const participant: IParticipant | null | undefined =
				await this.aggregate.getParticipantByTypeAndId(req.query.type as string, req.query.id as string);
			if (participant === null) {
				this.sendErrorResponse(
					res,
					404,
					"no such participant"
				);
				return;
			}
			this.sendSuccessResponse(
				res,
				200,
				{participant: participant}
			);
		} catch (e: unknown) {
			// if (e instanceof UnauthorizedError) {
			// 	this.sendErrorResponse(
			// 		res,
			// 		403,
			// 		"unauthorized" // TODO: verify.
			// 	);
			// } else {
				this.sendErrorResponse(
					res,
					500,
					this.UNKNOWN_ERROR_MESSAGE
				);
			// }
		}
	}

	private sendErrorResponse(res: express.Response, statusCode: number, message: string) {
		res.status(statusCode).json({message: message});
	}

	private sendSuccessResponse(res: express.Response, statusCode: number, data: any) {
		res.status(statusCode).json(data);
	}

}
