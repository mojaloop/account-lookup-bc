import EventEmitter from "events";
import events from "events";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { AccountLookupAggregate } from "@mojaloop/account-lookup-bc-domain";
import { AccountLookUpServiceEventsType, IAccountLookUpMessage } from "./types";

export interface IEventAccountLookUpServiceHandler{
    init():void,
    publishAccountLookUpEvent(message:IMessage):void,
    destroy(): void
}

export class AccountLookUpServiceEventHandler implements IEventAccountLookUpServiceHandler{
    

    private _acountLookUpEventEmitter: EventEmitter;
    private _accountLookUpAggregate:AccountLookupAggregate;

    constructor(accountLookUpAggregate: AccountLookupAggregate){
        this._accountLookUpAggregate= accountLookUpAggregate;
    }
    

    init(){
        this._acountLookUpEventEmitter = new events.EventEmitter();
        this.setAccountLookUpEvents();
    }

    private setAccountLookUpEvents() {
        this._acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.GetPartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this._accountLookUpAggregate.getPartyByTypeAndId(payload.partyType, payload.partyId);
        });
        this._acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.GetPartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this._accountLookUpAggregate.getPartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId);
        });
        this._acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.AssociatePartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this._accountLookUpAggregate.associatePartyByTypeAndId(payload.partyType, payload.partyId);
        });
        this._acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.AssociatePartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this._accountLookUpAggregate.associatePartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId);
        });
        this._acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.DisassociatePartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this._accountLookUpAggregate.disassociatePartyByTypeAndId(payload.partyType, payload.partyId);
        });
        this._acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.DisassociatePartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this._accountLookUpAggregate.disassociatePartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId);
        });
    }

    publishAccountLookUpEvent(message:IAccountLookUpMessage): void {
        console.log('message published', message);
        this._acountLookUpEventEmitter.emit(message.value.type,message.value.payload);
    }
    
    
    destroy(){
       this.removeAccountLookUpEvents();
    }

    private removeAccountLookUpEvents() {
       for (const event in AccountLookUpServiceEventsType){
           this._acountLookUpEventEmitter.removeAllListeners(event);
       }
    }
}


