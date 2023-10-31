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

import express from "express";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountLookupAggregate, AssociationsSearchResults, OracleNotFoundError, AccountLookupPrivileges} from "@mojaloop/account-lookup-bc-domain-lib";
import { check } from "express-validator";
import { BaseRoutes } from "./base/base_routes";
import { IAuthorizationClient, ITokenHelper } from "@mojaloop/security-bc-public-types-lib";

export class OracleAdminExpressRoutes extends BaseRoutes {
     constructor(accountLookupAggregate: AccountLookupAggregate, logger: ILogger, tokenHelper: ITokenHelper, authorizationClient: IAuthorizationClient) {
        super(logger, accountLookupAggregate, tokenHelper, authorizationClient);
        this.logger.createChild(this.constructor.name);

        this.mainRouter.get("/oracles",this.getAllOracles.bind(this));

        this.mainRouter.get("/oracles/builtin-associations",this.getAllBuiltinOracleAssociations.bind(this));

        this.mainRouter.get("/oracles/associations",this.getAllOracleAssociations.bind(this));

        this.mainRouter.get("/oracles/:id",[
            check("id").isString().notEmpty().withMessage("id must be a non empty string")
        ],this.getOracleById.bind(this));

        this.mainRouter.delete("/oracles/:id",[
            check("id").isString().notEmpty().withMessage("id must be a non empty string")
        ], this.deleteOracle.bind(this));

        this.mainRouter.post("/oracles",[
            check("name").isString().notEmpty().withMessage("name must be a non empty string").bail(),
            check("type").isString().isIn(['builtin','remote-http']).withMessage("type must be valid").bail(),
            check("partyType").isString().notEmpty().withMessage("partyType must be a non empty string").bail(),
            check("currency").optional(),
        ], this.createOracle.bind(this));

        this.mainRouter.get("/oracles/health/:id",[
            check("id").isString().notEmpty().withMessage("id must be a non empty string")
        ], this.healthCheck.bind(this));

        this.mainRouter.get("/oracles/health/:id",[
            check("id").isString().notEmpty().withMessage("id must be a non empty string")
        ], this.healthCheck.bind(this));

        this.mainRouter.get("/oracles/builtin-associations/searchKeywords/", this._getSearchKeywords.bind(this));

    }


    private async getAllOracles(req: express.Request, res: express.Response, _next: express.NextFunction) {
        this._enforcePrivilege(req.securityContext!, AccountLookupPrivileges.VIEW_ALL_ORACLES);
        if (!this.validateRequest(req, res)) {
            return;
        }

        this.logger.info("Fetching all oracles");
        try {
            const fetched = await this.accountLookupAggregate.getAllOracles();
            res.send(fetched);
        } catch (err: unknown) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message
            });
        }
    }

    private async getAllBuiltinOracleAssociations(req: express.Request, res: express.Response, _next: express.NextFunction) {
        try {
            this._enforcePrivilege(req.securityContext!, AccountLookupPrivileges.VIEW_ALL_ORACLE_ASSOCIATIONS);
            
            if (!this.validateRequest(req, res)) {
                return;
            }

            this.logger.info("Fetching all builtin oracle associations");

            const fetched = await this.accountLookupAggregate.getBuiltInOracleAssociations();
            res.send(fetched);
        } catch (err: unknown) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message
            });
        }
    }

    private async getOracleById (req: express.Request, res: express.Response, _next: express.NextFunction) {
        this._enforcePrivilege(req.securityContext!, AccountLookupPrivileges.VIEW_ALL_ORACLES);
        if (!this.validateRequest(req, res)) {
            return;
        }

        const id = req.params["id"] ?? null;
        this.logger.info(`Fetching Oracle [${id}].`);

        try {
            const fetched = await this.accountLookupAggregate.getOracleById(id);
            if(!fetched){
                res.status(404).json({
                    status: "error",
                    msg: "Oracle not found"
                });
                return;
            }
            res.send(fetched);
        } catch (err: unknown) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message
            });
        }
    }

    private async deleteOracle(req: express.Request, res: express.Response, _next: express.NextFunction) {
        this._enforcePrivilege(req.securityContext!, AccountLookupPrivileges.REMOVE_ORACLE);
        if (!this.validateRequest(req, res)) {
            return;
        }
        const id = req.params["id"] ?? null;
        this.logger.info(`Deleting Oracle [${id}].`);

        try {
            const fetched = await this.accountLookupAggregate.removeOracle(id);
            res.send(fetched);
        } catch (err: unknown) {
            if(err instanceof OracleNotFoundError){
                res.status(404).json({
                    status: "error",
                    msg: (err as Error).message
                });
                return;
            }

            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message
            });
        }
    }


    private async createOracle(req: express.Request, res: express.Response, _next: express.NextFunction) {
        this._enforcePrivilege(req.securityContext!, AccountLookupPrivileges.CREATE_ORACLE);

        if (!this.validateRequest(req, res)) {
            return;
        }

        const oracle = req.body;
        this.logger.info(`Received Oracle [${oracle}] in createOracle.`);

        try {
            const createdId = await this.accountLookupAggregate.addOracle(oracle);
            res.send({
                id: createdId
            });
        } catch (err: unknown) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message
            });
        }
    }

    private async healthCheck(req: express.Request, res: express.Response, _next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }
        const id = req.params["id"];
        this.logger.info(`Health check for Oracle ${id}.`);
        try {
            const fetched = await this.accountLookupAggregate.healthCheck(id);
            res.send(fetched);
        } catch (err: unknown) {
            if(err instanceof OracleNotFoundError){
                res.status(404).json({
                    status: "error",
                    msg: (err as Error).message
                });
                return;
            }

            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message
            });
        }
    }
    
    private async getAllOracleAssociations(req: express.Request, res: express.Response, _next: express.NextFunction) {
        const fspId = req.query.fspId as string || null;
        const partyId = req.query.partyId as string || null;
        const partyType = req.query.partyType as string || null;
        const partySubType = req.query.partySubType as string || null;
        const currency = req.query.currency as string || null;
 

        // optional pagination
        const pageIndexStr = req.query.pageIndex as string || req.query.pageindex as string;
        const pageIndex = pageIndexStr ? parseInt(pageIndexStr) : undefined;

        const pageSizeStr = req.query.pageSize as string || req.query.pagesize as string;
        const pageSize = pageSizeStr ? parseInt(pageSizeStr) : undefined;


        try{
            this._enforcePrivilege(req.securityContext!, AccountLookupPrivileges.VIEW_ALL_ORACLE_ASSOCIATIONS);
            
            if (!this.validateRequest(req, res)) {
                return;
            }

            const ret:AssociationsSearchResults = await this.accountLookupAggregate.getAllOracleAssociations(
                fspId,
                partyId,
                partyType,
                partySubType,
                currency,
                pageIndex,
                pageSize
            );
            res.send(ret);
        } catch (err: unknown) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message,
            });
        }
    }
    
    private async _getSearchKeywords(req: express.Request, res: express.Response){
        try{
            this._enforcePrivilege(req.securityContext!, AccountLookupPrivileges.VIEW_ALL_ORACLE_ASSOCIATIONS);

            const ret = await this.accountLookupAggregate.getSearchKeywords();
            res.send(ret);
        } catch (err: unknown) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message,
            });
        }
    }

}
