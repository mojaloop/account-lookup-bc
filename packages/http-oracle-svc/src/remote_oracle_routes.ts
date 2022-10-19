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
 import { check, validationResult } from "express-validator";
  
 
 export class RemoteOracleExpressRoutes {
     private readonly _logger: ILogger;
     private mainRouter = express.Router();
 
     constructor(logger: ILogger) {
         this._logger = logger.createChild(this.constructor.name);
 
         // http oracle routes

         this.mainRouter.get("/health",this.healthCheck.bind(this));

         this.mainRouter.get("/participants/:partyType/:partyId/:partySubIdType",
            [check("partyId").isString().notEmpty().withMessage(" partyId is required")], 
            this.getParticipantFspId.bind(this));
         
         this.mainRouter.delete("/participants/:fspId/:partyType/:partyId/:partySubTypeId",[
            check("partyId").isString().notEmpty().withMessage("partyId must be a non empty string"),
            check("fspId").isString().notEmpty().withMessage("fspId must be a non empty string")
         ], this.disassociateParticipant.bind(this));
         
         this.mainRouter.post("/participants",[
            check("partyId").isString().notEmpty().withMessage("partyId must be a non empty string"),
            check("fspId").isString().notEmpty().withMessage("fspId must be a non empty string"),
         ], this.associateParticipant.bind(this));
 
     }
 
     get MainRouter(): express.Router {
         return this.mainRouter;
     }
     
     private validateRequest(req: express.Request, res: express.Response<any, Record<string, any>>) : boolean {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() });
            return false;
        }
        return true;
    }



     private async getParticipantFspId(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }             
        const partyId = req.params["partyId"] ?? null;
        const partyType = req.params["partyType"] ?? null;
        const partySubIdType = req.params["partySubIdType"] ?? null;
        const currency = req.query["currency"] ?? null;
        this._logger.debug(`Fetching Participant FSP ID [${partyId}].`);

         try {
             // const fetched = await this._accountLookupAggregate.getAllOracles();
             res.send(null);
         } catch (err: any) {
             this._logger.error(err);
             res.status(500).json({
                 status: "error",
                 msg: err.message
             });
         }
     }

     private async disassociateParticipant(req: express.Request, res: express.Response, next: express.NextFunction) {
         if (!this.validateRequest(req, res)) {
             return;
         }
        
         const partyId = req.params["partyId"] ?? null;
         const fspId = req.params["fspId"] ?? null;
         this._logger.debug(`Disassociating Participant [${partyId}] from FSP [${fspId}].`);

         try {
             const fetched = null;
             if(!fetched){
                 res.status(404).json({
                     status: "error",
                     msg: "Oracle not found"
                 });
                 return;
             }
             res.send(fetched);
         } catch (err: any) {
             this._logger.error(err);
             res.status(500).json({
                 status: "error",
                 msg: err.message
             });
         }
     }

     private async associateParticipant(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }
       
        const partyId = req.params["partyId"] ?? null;
        const fspId = req.params["fspId"] ?? null;
        this._logger.debug(`Associating Participant [${partyId}] from FSP [${fspId}].`);

        try {
            const fetched = null;
            if(!fetched){
                res.status(404).json({
                    status: "error",
                    msg: "Oracle not found"
                });
                return;
            }
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
            res.send(true);
    } 
 
 }
