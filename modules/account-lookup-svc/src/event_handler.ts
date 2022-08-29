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

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 ******/

 import EventEmitter from "events";
import events from "events";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { AccountLookupAggregate } from "@mojaloop/account-lookup-bc-domain";
import { AccountLookUpServiceEventsType, IAccountLookUpMessage } from "./types";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";

export interface IEventAccountLookUpServiceHandler{
    init():void,
    publishAccountLookUpEvent(message:IMessage):void,
    destroy(): void
}

export class AccountLookUpServiceEventHandler implements IEventAccountLookUpServiceHandler{
    

    private acountLookUpEventEmitter: EventEmitter;
    private readonly _accountLookUpAggregate:AccountLookupAggregate;
    private readonly _logger: ILogger;

    constructor(logger: ILogger,accountLookUpAggregate: AccountLookupAggregate){
        this._accountLookUpAggregate= accountLookUpAggregate;
        this._logger = logger
    }
    

    init(){
        this.acountLookUpEventEmitter = new events.EventEmitter();
        this.setAccountLookUpEvents();
    }

    private setAccountLookUpEvents() {
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.GetPartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this._accountLookUpAggregate.getPartyByTypeAndId(payload.partyType, payload.partyId).catch(err => {
                this._logger.error(`${AccountLookUpServiceEventsType.GetPartyByTypeAndId}: ${err}`);
            });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.GetPartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this._accountLookUpAggregate.getPartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId).catch(err => {
                this._logger.error(`${AccountLookUpServiceEventsType.GetPartyByTypeAndIdAndSubId}: ${err}`)
            });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.AssociatePartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this._accountLookUpAggregate.associatePartyByTypeAndId(payload.partyType, payload.partyId).catch(err => {
                this._logger.error(`${AccountLookUpServiceEventsType.AssociatePartyByTypeAndId}: ${err}`);
            });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.AssociatePartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this._accountLookUpAggregate.associatePartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId).catch(err => {
                this._logger.error(`${AccountLookUpServiceEventsType.AssociatePartyByTypeAndIdAndSubId}: ${err}`);
            });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.DisassociatePartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this._accountLookUpAggregate.disassociatePartyByTypeAndId(payload.partyType, payload.partyId).catch(err => {
                this._logger.error(`${AccountLookUpServiceEventsType.DisassociatePartyByTypeAndId}: ${err}`);
            });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.DisassociatePartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this._accountLookUpAggregate.disassociatePartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId).catch(err => {
                this._logger.error(`${AccountLookUpServiceEventsType.DisassociatePartyByTypeAndIdAndSubId}: ${err}`);
            });
        });
    }

    publishAccountLookUpEvent(message:IAccountLookUpMessage): void {
        if(! Object.values(AccountLookUpServiceEventsType).some(event => event === message.value.type)){
            this._logger.error(`AccountLookUpServiceEventHandler: publishAccountLookUpEvent: message type ${message.value.type} is not a valid event type`);
            return;
            
        }
            this.acountLookUpEventEmitter.emit(message.value.type,message.value.payload);
    }
    
    
    destroy(){
       this.removeAccountLookUpEvents();
    }

    private removeAccountLookUpEvents() {
       for (const event in AccountLookUpServiceEventsType){
           this.acountLookUpEventEmitter.removeAllListeners(event);
       }
    }
}

