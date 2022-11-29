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

import express from "express";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { AccountLookupAggregate } from "@mojaloop/account-lookup-bc-domain";


export class AccountLookupExpressRoutes {
    private _logger: ILogger;
    private _accountLookUpAgg: AccountLookupAggregate;
    private mainRouter = express.Router();

    constructor(accountLookupAgg: AccountLookupAggregate, logger: ILogger) {
        this._logger = logger.createChild("AccountLookupExpressRoutes");
        this._accountLookUpAgg = accountLookupAgg;

        // GET Participant by Type & ID
        this.mainRouter.get("/:type/:id", this.getParticipantFspIdByTypeAndId.bind(this));
        // GET Participants by Type, ID & SubId
        this.mainRouter.get("/:type/:id/:subId", this.getParticipantFspIdByTypeAndIdAndSubId.bind(this));
    
    }

    get MainRouter(): express.Router {
        return this.mainRouter;
    }

    private async getParticipantFspIdByTypeAndId(req: express.Request, res: express.Response, next: express.NextFunction) {
        const type = req.params["type"] as string;
        const id = req.params["id"] as string;
        const currency = req.params["currency"] as string || null;

        this._logger.debug(`Received request to get Participant FspId with type: ${type}, id: ${id}.`);

        try {
            const result = await this._accountLookUpAgg.getParticipantId(id, type, null, currency);
            res.send(result);
        } catch (err: any) {

            this._logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message
            });
        }
    }

    private async getParticipantFspIdByTypeAndIdAndSubId(req: express.Request, res: express.Response, next: express.NextFunction) {
        const type = req.params["type"] as string;
        const id = req.params["id"] as string;
        const partySubIdOrType = req.params["subId"] as string;
        const currency = req.params["currency"] as string || null;
        
        this._logger.debug(`Received request to get Participant FspId with type: ${type}, id: ${id} and subId: ${partySubIdOrType}.`);

        try {
            await this._accountLookUpAgg.getParticipantId(id, type, partySubIdOrType, currency);
            res.send();
        } catch (err: any) {
            this._logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message
            });
        }
    }
}
