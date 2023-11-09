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
import { AccountLookupAggregate, ParticipantLookup, ParticipantNotFoundError, AccountLookupPrivileges } from "@mojaloop/account-lookup-bc-domain-lib";
import { check } from "express-validator";
import { BaseRoutes } from "./base/base_routes";
import { IAuthorizationClient, ITokenHelper } from "@mojaloop/security-bc-public-types-lib";

export class AccountLookupExpressRoutes extends BaseRoutes {

    constructor(accountLookupAgg: AccountLookupAggregate, logger: ILogger, tokenHelper: ITokenHelper, authorizationClient: IAuthorizationClient) {
        super(logger, accountLookupAgg, tokenHelper, authorizationClient);
        logger.createChild("AccountLookupExpressRoutes");

        this.mainRouter.get("/:partyType/:partyId",[
            check("partyId").isString().notEmpty().withMessage("partyId must be a non empty string").bail(),
            check("partyType").isString().notEmpty().withMessage("partyType must be a non empty string").bail(),
         ], this.getAccountLookUp.bind(this));

    }

    private async getAccountLookUp(req: express.Request, res: express.Response, _next: express.NextFunction) {
        try {
            this._enforcePrivilege(req.securityContext!, AccountLookupPrivileges.VIEW_ALL_ORACLE_ASSOCIATIONS);

            if (!this.validateRequest(req, res)) {
                return;
            }

            const partyId = req.params["partyId"];
            const partyType = req.params["partyType"];
            const partySubType = req.query.partySubType?.toString() ?? null;
            const currency = req.query.currency?.toString() ?? null;

            this.logger.info(`AccountLookupExpressRoutes::getAccountLookUp - ${partyId} ${partyType} ${partySubType} ${currency}`);


            const payload: ParticipantLookup = {
               currency,
               partyId,
               partyType,
               partySubType
            };
            const result = await this.accountLookupAggregate.getAccountLookUp(payload);
            this.logger.info(`AccountLookupExpressRoutes::getAccountLookUp - ${partyId} ${partyType} ${currency} - result: ${JSON.stringify(result)}`);
            res.send(result);
        } catch (err: any) {
            if (this._handleUnauthorizedError(err, res)) return;
            this.logger.error(err);
            if (err instanceof ParticipantNotFoundError) {
                this.logger.debug("AccountLookupExpressRoutes::getAccountLookUp - ParticipantNotFound");
                res.status(404).json({
                    status: "error",
                    msg: (err as Error).message
                });

            } else {
                this.logger.error(`AccountLookupExpressRoutes::getAccountLookUp - Error: ${(err as Error).message}`);
                res.status(500).json({
                    status: "error",
                    msg: (err as Error).message
                });
            }
        }
    }

}
