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

 * Coil
 - Jason Bruwer <jason.bruwer@coil.com>

 --------------
 ******/

 "use strict";


 import express from "express";
 import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
 import { AccountLookupAggregate, Oracle } from "@mojaloop/account-lookup-bc-domain";
  
 
 export class ExpressRoutes {
     private readonly _logger: ILogger;
     private readonly _accountLookupAggregate: AccountLookupAggregate;
     private _mainRouter = express.Router();
 
     constructor(accountLookupAggregate: AccountLookupAggregate, logger: ILogger) {
         this._logger = logger.createChild("ExpressRoutes");
         this._accountLookupAggregate = accountLookupAggregate;
 
        this._mainRouter.get("/",()=> this.getExample);

         // account lookup admin routes
         this._mainRouter.get("/participants",()=> this.getAllOracles);
        //  this._mainRouter.get("/participants/:ids/multi",() => this.getParticipantsByIds);
        //  this._mainRouter.get("/participants/:id",() => this.participantById);
 
     }
 
 
     get MainRouter(): express.Router {
         return this._mainRouter;
     }
 
     private async getExample(req: express.Request, res: express.Response, next: express.NextFunction) {
         return res.send({resp: "example worked"});
     }

 
     private async getAllOracles(req: express.Request, res: express.Response, next: express.NextFunction) {
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
         const id = req.params["id"] ?? null;
         this._logger.debug(`Deleting Oralce [${id}].`);
 
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
 
    //  private async participantById(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const id = req.params["id"] ?? null;
    //      this._logger.debug(`Fetching Participant [${id}].`);
 
    //      try {
    //          const fetched = await this._participantsAgg.getParticipantById(req.securityContext!, id);
    //          res.send(fetched);
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          this._logger.error(err);
    //          res.status(500).json({
    //              status: "error",
    //              msg: err.message
    //          });
    //      }
    //  }
 
    //  private async participantCreate(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const data: Participant = req.body;
    //      this._logger.debug(`Creating Participant [${JSON.stringify(data)}].`);
 
    //      try {
    //          const createdId = await this._participantsAgg.createParticipant(req.securityContext!, data);
    //          this._logger.debug(`Created Participant with ID: ${createdId}.`);
    //          res.send({
    //              id: createdId
    //          });
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          if (err instanceof ParticipantCreateValidationError) {
    //              res.status(400).json({
    //                  status: "error",
    //                  msg: `Validation failure: ${err.message}.`
    //              });
    //          } else if (err instanceof InvalidParticipantError) {
    //              res.status(500).json({
    //                  status: "error",
    //                  msg: `Unable to store participant. ${err.message}.`
    //              });
    //          } else {
    //              this._logger.error(err);
    //              res.status(500).json({
    //                  status: "error",
    //                  msg: err.message
    //              });
    //          }
    //      }
    //  }
 
    //  private async participantApprove(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const id = req.params["id"] ?? null;
    //      const actionNote:string | null = req.body?.note || null;
    //      this._logger.debug(`Received request to approve Participant with ID: ${id}.`);
 
    //      try {
    //          await this._participantsAgg.approveParticipant(req.securityContext!, id, actionNote);
    //          res.send();
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          this._logger.error(err);
    //          res.status(500).json({
    //              status: "error",
    //              msg: err.message
    //          });
    //      }
    //  }
 
    //  private async deactivateParticipant(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const id = req.params["id"] ?? null;
    //      const actionNote:string | null = req.body?.note || null;
    //      this._logger.debug(`Received request to deActivateParticipant Participant with ID: ${id}.`);
 
    //      try {
    //          await this._participantsAgg.deactivateParticipant(req.securityContext!, id, actionNote);
    //          res.send();
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          this._logger.error(err);
    //          res.status(500).json({
    //              status: "error",
    //              msg: err.message
    //          });
    //      }
    //  }
 
    //  private async activateParticipant(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const id = req.params["id"] ?? null;
    //      const actionNote:string | null = req.body?.note || null;
    //      this._logger.debug(`Received request to activateParticipant Participant with ID: ${id}.`);
 
    //      try {
    //          await this._participantsAgg.activateParticipant(req.securityContext!, id, actionNote);
    //          res.send();
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          this._logger.error(err);
    //          res.status(500).json({
    //              status: "error",
    //              msg: err.message
    //          });
    //      }
    //  }
 
 
    //  /*
    //  * Accounts
    //  * */
 
    //  private async accountsByParticipantId(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const id = req.params["id"] ?? null;
    //      this._logger.debug(`Fetching Accounts for Participant [${id}].`);
 
    //      try {
    //          const fetched = await this._participantsAgg.getParticipantAccountsById(req.securityContext!, id);
    //          res.send(fetched);
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          if (err instanceof NoAccountsError) {
    //              res.status(404).json({
    //                  status: "error",
    //                  msg: err.message
    //              });
    //          } else {
    //              this._logger.error(err);
    //              res.status(500).json({
    //                  status: "error",
    //                  msg: err.message
    //              });
    //          }
 
    //      }
    //  }
 
    //  private async participantAccountCreate(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const id = req.params["id"] ?? null;
    //      const data: ParticipantAccount = req.body;
    //      this._logger.debug(`Received request to create participant account for participant with ID: ${id}.`);
 
    //      try {
    //          await this._participantsAgg.addParticipantAccount(req.securityContext!, id, data);
    //          res.send();
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          if (err instanceof ParticipantNotActive) {
    //              res.status(451).json({
    //                  status: "error",
    //                  msg: err.message
    //              });
    //          } else {
    //              this._logger.error(err);
    //              res.status(500).json({
    //                  status: "error",
    //                  msg: err.message
    //              });
    //          }
    //      }
    //  }
 
    //  /* private async participantAccountDelete(req: express.Request, res: express.Response, next: express.NextFunction) {
    //     const id = req.params["id"] ?? null;
    //     const data: ParticipantAccount = req.body.source;
    //     this._logger.debug(`Removing Participant Account [${JSON.stringify(data)}] for [${id}].`);
 
    //     try {
    //         await this._participantsAgg.removeParticipantAccount(req.securityContext!, id, data);
    //         res.send();
    //     } catch (err: any) {
    //        if(this._handleUnauthorizedError(err, res)) return;
 
    //         this._logger.error(err);
    //         res.status(500).json({
    //             status: "error",
    //             msg: err.message
    //         });
    //     }
    // }*/
 
    //  /*
    //  * Endpoints
    //  * */
 
    //  private async endpointsByParticipantId(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const id = req.params["id"] ?? null;
 
    //      this._logger.debug(`Fetching Endpoints for Participant [${id}].`);
 
    //      try {
    //          const fetched = await this._participantsAgg.getParticipantEndpointsById(req.securityContext!, id);
    //          res.send(fetched);
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          if (err instanceof NoEndpointsError) {
    //              res.status(404).json({
    //                  status: "error",
    //                  msg: err.message
    //              });
    //          } else {
    //              this._logger.error(err);
    //              res.status(500).json({
    //                  status: "error",
    //                  msg: err.message
    //              });
    //          }
    //      }
    //  }
 
    //  private async participantEndpointCreate(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const id = req.params["id"] ?? null;
    //      const data: ParticipantEndpoint = req.body;
    //      this._logger.debug(`Creating Participant Endpoint [${JSON.stringify(data)}] for [${id}].`);
 
    //      try {
    //          const endpointId = await this._participantsAgg.addParticipantEndpoint(req.securityContext!, id, data);
    //          res.send({
    //              id: endpointId
    //          });
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          this._logger.error(err);
    //          res.status(500).json({
    //              status: "error",
    //              msg: err.message
    //          });
    //      }
    //  }
 
    //  private async participantEndpointChange(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const participantId = req.params["id"] ?? null;
    //      const endpointId = req.params["endpointId"] ?? null;
    //      const data: ParticipantEndpoint = req.body;
 
    //      if(endpointId !== data.id ){
    //          res.status(400).json({
    //              status: "error",
    //              msg: "endpoint id in url and object don't match"
    //          });
    //          return;
    //      }
 
    //      this._logger.debug(`Changing endpoints for Participant [${participantId}].`);
 
    //      try {
    //          await this._participantsAgg.changeParticipantEndpoint(req.securityContext!, participantId, data);
    //          res.send();
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          if (err instanceof NoEndpointsError) {
    //              res.status(404).json({
    //                  status: "error",
    //                  msg: err.message
    //              });
    //          } else {
    //              this._logger.error(err);
    //              res.status(500).json({
    //                  status: "error",
    //                  msg: err.message
    //              });
    //          }
    //      }
    //  }
 
    //  private async participantEndpointDelete(req: express.Request, res: express.Response, next: express.NextFunction) {
    //      const participantId = req.params["id"] ?? null;
    //      const endpointId = req.params["endpointId"] ?? null;
 
 
    //      this._logger.debug(`Removing Participant Endpoint id: ${endpointId} from participant with ID: ${participantId}.`);
 
    //      try {
    //          await this._participantsAgg.removeParticipantEndpoint(req.securityContext!, participantId, endpointId);
    //          res.send();
    //      } catch (err: any) {
    //          if(this._handleUnauthorizedError(err, res)) return;
 
    //          this._logger.error(err);
    //          res.status(500).json({
    //              status: "error",
    //              msg: err.message
    //          });
    //      }
    //  }
 
 
 
 
 
 }