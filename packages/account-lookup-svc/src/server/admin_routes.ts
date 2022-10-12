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
 import {AccountLookupAggregate} from "@mojaloop/account-lookup-bc-domain";
 import { check, validationResult } from "express-validator";
  
 
 export class ExpressRoutes {
     private readonly _logger: ILogger;
     private readonly _accountLookupAggregate: AccountLookupAggregate;
     private _mainRouter = express.Router();
 
     constructor(accountLookupAggregate: AccountLookupAggregate, logger: ILogger) {
         this._logger = logger.createChild("ExpressRoutes");
         this._accountLookupAggregate = accountLookupAggregate;
 
        this._mainRouter.get("/",()=> this.getExample);

         // account lookup admin routes
         this._mainRouter.get("/oracles",()=> this.getAllOracles);
         
         this._mainRouter.delete("/oracles/:id",[
            check("id").isString().notEmpty().withMessage("id must be a non empty string")
         ],()=> this.deleteOracle);
         

         this._mainRouter.post("/oracles",[
            check("name").isString().notEmpty().withMessage("name must be a non empty string"),
            check("type").isString().notEmpty().withMessage("type must be a non empty string"),
            check("endpoint").isString().notEmpty().withMessage("endpoint must be a non empty string"),
            check("partyType").isString().notEmpty().withMessage("partyType must be a non empty string"),
            check("partySubType").optional().isString().notEmpty().withMessage("partySubType must be a non empty string"),
         ],() => this.createOracle);


         this._mainRouter.get("/oracles/health/:id",[
            check("id").isString().notEmpty().withMessage("id must be a non empty string")
         ],() => this.healthCheck);
        
 
     }
 
 
     get MainRouter(): express.Router {
         return this._mainRouter;
     }
     
     private validateRequest(req: express.Request, res: express.Response<any, Record<string, any>>) : boolean {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() });
            return false;
        }
        return true;
    }

     private async getExample(req: express.Request, res: express.Response, next: express.NextFunction) {
         return res.send({resp: "example worked"});
     }

 
     private async getAllOracles(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }             
        
        this._logger.debug("Fetching all oracles");
         try {
             const fetched = await this._accountLookupAggregate.getAllOracles();
             res.send(fetched);
         } catch (err: any) {
             this._logger.error(err);
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
         this._logger.debug(`Deleting Oracle [${id}].`);
 
         try {
             const fetched = await this._accountLookupAggregate.removeOracle(id);
             res.send(fetched);
         } catch (err: any) {
             this._logger.error(err);
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

        const oracle = req.body ?? null;
        this._logger.debug(`creating Oracle [${oracle}].`);

        try {
            const fetched = await this._accountLookupAggregate.addOracle(oracle);
            res.send(fetched);
        } catch (err: any) {
            this._logger.error(err);
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

        const id = req.params["id"] ?? null;
        this._logger.debug(`Health check for Oracle [${id}].`);
        try {
            const fetched = await this._accountLookupAggregate.healthCheck(id as any);
            res.send(fetched);
        } catch (err: any) {
            this._logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message
            });
        }
    } 
 
 }