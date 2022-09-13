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

import EventEmitter from "events";
import events from "events";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { AccountLookupAggregate } from "@mojaloop/account-lookup-bc-domain";
import { AccountLookUpEventsType, IAccountLookUpMessage } from "./types";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";

export interface IAccountLookUpEventHandler{
    init():void,
    get():EventEmitter,
    publishAccountLookUpEvent(message:IMessage):void,
    destroy(): void
}

export class AccountLookUpEventHandler implements IAccountLookUpEventHandler{
    
    private acountLookUpEventEmitter: EventEmitter;
    private readonly _accountLookUpAggregate:AccountLookupAggregate;
    private readonly _logger: ILogger;

    constructor(logger: ILogger,accountLookUpAggregate: AccountLookupAggregate){
        this._accountLookUpAggregate = accountLookUpAggregate;
        this._logger = logger;
    }

    get(): EventEmitter {
        return this.acountLookUpEventEmitter;
    }

    init():void{
        this.acountLookUpEventEmitter = new events.EventEmitter();
        this.setAccountLookUpEvents();
    }

    private setAccountLookUpEvents():void {
        this.acountLookUpEventEmitter.on(AccountLookUpEventsType.GetPartyById, async (payload: { requesterParticipantId:string, partyId:string, partyType:string, partySubType?:string }) => {
            // await this._accountLookUpAggregate.associatePartyByTypeAndId(payload.partyType, payload.partyId)
            // .catch(err => {
            //     this._logger.error(`${AccountLookUpEventsType.GetPartyById}: ${err}`);
            // });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpEventsType.GetParticipantByPartyType, async (payload: { sourceFspId: string, partyIdType: string, partyId: string, partySubType:string, destinationFspId?:string, currency?:string}) => {
            // await this._accountLookUpAggregate.associatePartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId)
            // .catch(err => {
            //     this._logger.error(`${AccountLookUpEventsType.GetParticipantByPartyType}: ${err}`);
            // });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpEventsType.AssociateParty, async (payload: { requesterParticipantId:string, partyId:string, partyType:string, partySubType?:string }) => {
            // await this._accountLookUpAggregate.disassociatePartyByTypeAndId(payload.partyType, payload.partyId)
            // .catch(err => {
            //     this._logger.error(`${AccountLookUpEventsType.AssociateParty}: ${err}`);
            // });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpEventsType.DisassociateParty, async (payload: { requesterParticipantId:string, partyId:string, partyType:string, partySubType?:string }) => {
            // await this._accountLookUpAggregate.disassociatePartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubType as string)
            // .catch(err => {
            //     this._logger.error(`${AccountLookUpEventsType.DisassociateParty}: ${err}`);
            // });
        });
    }

    publishAccountLookUpEvent(message:IAccountLookUpMessage): void {
        
        if(!message.value){
            this._logger.error(`AccountLookUpEventHandler: publishAccountLookUpEvent: message as an invalid format or value`);
            return;
        }


        if(! Object.values(AccountLookUpEventsType).some(event => event === message?.value?.type)){
            this._logger.error(`AccountLookUpEventHandler: publishAccountLookUpEvent: message type ${message.value.type} is not a valid event type`);
            return;
        }
        
        this.acountLookUpEventEmitter.emit(message.value.type,message.value.payload);
    }
    
    
    destroy(){
        try{
            this._logger.info("Destroying events from AccountLookUpEventHandler");
            this.acountLookUpEventEmitter.removeAllListeners();
        }
        catch(err){
            this._logger.error("Error destroying events from AccountLookUpEventHandler");
            throw err;
        }
       
    }

}


