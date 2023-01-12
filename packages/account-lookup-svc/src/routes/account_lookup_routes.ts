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
import { AccountLookupAggregate, ParticipantLookup } from "@mojaloop/account-lookup-bc-domain";
import { body, check } from "express-validator";
import { BaseRoutes } from "./base/base_routes";

export class AccountLookupExpressRoutes extends BaseRoutes {

    constructor(accountLookupAgg: AccountLookupAggregate, logger: ILogger) {
        super(logger, accountLookupAgg);
        logger.createChild("AccountLookupExpressRoutes");
        
        this.mainRouter.get("/:id/:type",[
            check("id").isString().notEmpty().withMessage("id must be a non empty string").bail(),
            check("type").isString().notEmpty().withMessage("type must be a non empty string").bail(),
         ], this.getAccountLookUp.bind(this));

        this.mainRouter.get("/:id/:type/:subType",[
            check("id").isString().notEmpty().withMessage("id must be a non empty string").bail(),
            check("type").isString().notEmpty().withMessage("type must be a non empty string").bail(),
            check("subType").optional({
                nullable: true,
            })
         ], this.getAccountLookUp.bind(this));

         this.mainRouter.post("",[
            body().isObject().withMessage("body must be an object").bail(),
            body("*.partyId").isString().notEmpty().withMessage("partyId must be a non empty string").bail(),
            body("*.partyType").isString().notEmpty().withMessage("partyType must be a non empty string"),
        ], this.getBulkAccountLookUp.bind(this));

    }

    private async getAccountLookUp(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }
    
        const partyId = req.params["id"];
        const partyType = req.params["type"];
        const partySubType = req.params["subType"] ?? null;
        const currency = req.params["currency"] ?? null;

        this.logger.info(`AccountLookupExpressRoutes::getAccountLookUp - ${partyId} ${partyType} ${partySubType} ${currency}`);

        try {
            const payload: ParticipantLookup = {
               currency,
               partyId,
               partySubType,
               partyType 
            };
            const result = await this.accountLookupAggregate.getAccountLookUp(payload);
            res.send(result);
        } catch (err: any) {

            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message
            });
        }
    }

    private async getBulkAccountLookUp(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }
    
        const identifiersList = req.body;
        this.logger.info(`AccountLookupExpressRoutes::getBulkAccountLookUp - ${identifiersList}`);

        try {
            const result = await this.accountLookupAggregate.getBulkAccountLookup(identifiersList);
            res.send(result);
        } catch (err: any) {

            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message
            });
        }
    }


}
