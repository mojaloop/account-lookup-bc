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
import {AccountLookupAggregate, NoSuchOracleError} from "@mojaloop/account-lookup-bc-domain";
import { check } from "express-validator"; 
import { BaseRoutes } from "./_base_routes";
export class OracleAdminExpressRoutes extends BaseRoutes {
     private readonly _accountLookupAggregate: AccountLookupAggregate;
 
     constructor(accountLookupAggregate: AccountLookupAggregate, logger: ILogger) {
         super(logger);
         this.logger.createChild(this.constructor.name);
         this._accountLookupAggregate = accountLookupAggregate;
 
         // account lookup admin routes

         this.mainRouter.get("/oracles",this.getAllOracles.bind(this));

         this.mainRouter.get("/oracles/:id",[
             check("id").isString().notEmpty().withMessage("id must be a non empty string")
         ],this.getOracleById.bind(this));
         
         this.mainRouter.delete("/oracles/:id",[
            check("id").isString().notEmpty().withMessage("id must be a non empty string")
         ], this.deleteOracle.bind(this));
         
         this.mainRouter.post("/oracles",[
            check("name").isString().notEmpty().withMessage("name must be a non empty string").bail(),
            check("type").isString().isIn(['builtin','http-remote']).withMessage("type must be valid").bail(),
            check("partyType").isString().notEmpty().withMessage("partyType must be a non empty string").bail()
         ], this.createOracle.bind(this));

         this.mainRouter.get("/oracles/health/:id",[
            check("id").isString().notEmpty().withMessage("id must be a non empty string")
         ], this.healthCheck.bind(this));
 
     }
     

    private async getAllOracles(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }             
        
        this.logger.debug("Fetching all oracles");
         try {
             const fetched = await this._accountLookupAggregate.getAllOracles();
             res.send(fetched);
         } catch (err: any) {
             this.logger.error(err);
             res.status(500).json({
                 status: "error",
                 msg: err.message
             });
         }
    }

    private async getOracleById (req: express.Request, res: express.Response, next: express.NextFunction) {
         if (!this.validateRequest(req, res)) {
             return;
         }

         const id = req.params["id"] ?? null;
         this.logger.debug(`Fetching Oracle [${id}].`);

         try {
             const fetched = await this._accountLookupAggregate.getOracleById(id);
             if(!fetched){
                 res.status(404).json({
                     status: "error",
                     msg: "Oracle not found"
                 });
                 return;
             }
             res.send(fetched);
         } catch (err: any) {
             this.logger.error(err);
             res.status(500).json({
                 status: "error",
                 msg: err.message
             });
         }
    }

    private async deleteOracle(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }         
        const id = req.params["id"] ?? null;
         this.logger.debug(`Deleting Oracle [${id}].`);
 
         try {
             const fetched = await this._accountLookupAggregate.removeOracle(id);
             res.send(fetched);
         } catch (err: any) {
             if(err instanceof NoSuchOracleError){
                 res.status(404).json({
                     status: "error",
                     msg: err.message
                 });
                 return;
             }

             this.logger.error(err);
             res.status(500).json({
                 status: "error",
                 msg: err.message
             });
         }
    }


    private async createOracle(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }

        const oracle = req.body;
        this.logger.debug(`Received Oracle [${oracle}] in createOracle.`);

        try {
            const createdId = await this._accountLookupAggregate.addOracle(oracle);
            res.send({
                id: createdId
            });
        } catch (err: any) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message
            });
        }
    }

    private async healthCheck(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }
        const id = req.params["id"];
        this.logger.debug(`Health check for Oracle ${id}.`);
        try {
            const fetched = await this._accountLookupAggregate.healthCheck(id);
            res.send(fetched);
        } catch (err: any) {
            if(err instanceof NoSuchOracleError){
                res.status(404).json({
                    status: "error",
                    msg: err.message
                });
                return;
            }

            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message
            });
        }
    } 
 
}
