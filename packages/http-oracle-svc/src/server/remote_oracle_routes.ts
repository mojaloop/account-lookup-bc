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
import { check, validationResult} from "express-validator";
import {RemoteOracle} from "../remote_oracle";


export class RemoteOracleExpressRoutes {
    private readonly _logger: ILogger;
    private readonly _oracle: RemoteOracle;
    private mainRouter = express.Router();

    constructor(logger: ILogger, oracleAdapter: RemoteOracle) {
        this._logger = logger;
        this._oracle = oracleAdapter;
        // http oracle routes

        this.mainRouter.get("/health", this.healthCheck.bind(this));

        this.mainRouter.get("/participants/:partyType/:partyId/:partySubId?", [
            check("partyType").isString().notEmpty().withMessage(" partyType is required").bail(),
            check("partyId").isString().notEmpty().withMessage(" partyId is required").bail(),
            check("partySubId").optional(),
        ], this.getParticipantFspId.bind(this));

        this.mainRouter.delete("/participants/:partyType/:partyId/:partySubId?", [
            check("partyType").isString().notEmpty().withMessage(" partyType is required").bail(),
            check("partyId").isString().notEmpty().withMessage(" partyId is required").bail(),
            check("fspId").isString().notEmpty().withMessage(" fspId is required").bail(),
            check("partySubId").optional(),
        ], this.disassociateParticipant.bind(this));

        this.mainRouter.post("/participants/:partyType/:partyId/:partySubId?", [
            check("partyType").isString().notEmpty().withMessage(" partyType is required").bail(),
            check("partyId").isString().notEmpty().withMessage(" partyId is required").bail(),
            check("fspId").isString().notEmpty().withMessage(" fspId is required").bail(),
            check("partySubId").optional(),
        ], this.associateParticipant.bind(this));

    }

    get MainRouter(): express.Router {
        return this.mainRouter;
    }

    private validateRequest(req: express.Request, res: express.Response<any, Record<string, any>>): boolean {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).json({errors: errors.array()});
            return false;
        }
        return true;
    }

    private extractRequestParams(req: express.Request) {
        const partyType = req.params["partyType"];
        const partyId = req.params["partyId"];
        const partySubId = req.params["partySubId"] ?? null;
        const currency = req.query["currency"]?.toString() ?? null;
        const fspId = req.body["fspId"] ?? null;
        return {partyType, partyId, partySubId, currency, fspId};
    }


    private async getParticipantFspId(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!this.validateRequest(req, res)) {
            return;
        }
        const params = this.extractRequestParams(req);

        this._logger.debug(`Fetching Participant FSP ID  with params [${params}].`);

        try {
            const fetched = await this._oracle.getParticipantFspId(params.partyType, params.partyId, params.partySubId, params.currency);
            this._logger.debug(`Fetched Participant FSP ID [${fetched}] with params [${params}].`);
            if(!fetched){
                res.sendStatus(404);
            }else{
                res.send({
                    fspId: fetched
                });
            }
        } catch (err: any) {
            this._logger.error(`Error Fetching FSP ID with params [${params}]. -${err}`);
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

        const params = this.extractRequestParams(req);
        this._logger.debug(`Disassociating Participant with params [${params}].`);

        try {
            await this._oracle.disassociateParticipant(params.fspId, params.partyType, params.partyId, params.partySubId, params.currency);
            this._logger.debug(`Disassociated Participant with params [${params}].`);
            res.sendStatus(200);
        } catch (err: any) {
            this._logger.error(`Error disassociating Participant with params [${params}]. -${err}`);
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

        const params = this.extractRequestParams(req);
        this._logger.debug(`Associating Participant with params [${params}].`);

        try {
            await this._oracle.associateParticipant(params.fspId, params.partyType, params.partyId, params.partySubId, params.currency);
            this._logger.debug(`Associated Participant with params [${params}].`);
            res.sendStatus(200);
        } catch (err: any) {
            this._logger.error(`Error associating Participant with params [${params}]. -${err}`);
            res.status(500).json({
                status: "error",
                msg: err.message
            });
        }
    }

    private async healthCheck(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            this._logger.debug(`Health Check.`);
            const fetched = await this._oracle.healthCheck();
            this._logger.debug(`Health Check Result [${fetched}].`);
            res.send(fetched);
        } catch (err: any) {
            this._logger.error(`Error Health Check. -${err}`);
            res.status(500).json({
                status: "error",
                msg: err.message
            });
        }
    }

}
