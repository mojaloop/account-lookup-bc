import EventEmitter from "events";
import events from "events";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { AccountLookupAggregate } from "@mojaloop/account-lookup-bc-domain";

export enum AccountLookUpServiceEvents  {
    GetPartyByTypeAndId = "[Account Lookup] Get Party By Type And Id",
    GetPartyByTypeAndIdAndSubId ="[Account Lookup] Get Party By Type And Id And SubId",
    AssociatePartyByTypeAndId = "[Account Lookup]  Associate Party By Type And Id",
    AssociatePartyByTypeAndIdAndSubId = "[Account Lookup]  Associate Party By Type And Id And SubId",
    DisassociatePartyByTypeAndId = "[Account Lookup]  Disassociate Party By Type And Id",
    DisassociatePartyByTypeAndIdAndSubId= "[Account Lookup]  Disassociate Party By Type And Id And SubId"
}


export interface IEventAccountLookUpServiceHandler{
    init():void,
    publishAccountLookUpEvent(message:IMessage):void,
    destroy(): void
}

export class AccountLookUpServiceEventHandler implements IEventAccountLookUpServiceHandler{
    

    private acountLookUpEventEmitter: EventEmitter;
    private accountLookUpAggregate:AccountLookupAggregate;

    constructor(accountLookUpAggregate: AccountLookupAggregate){
        this.accountLookUpAggregate= accountLookUpAggregate;
    }
    

    init(){
        this.acountLookUpEventEmitter = new events.EventEmitter();
        this.setAccountLookUpEvents();
    }

    private setAccountLookUpEvents() {
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEvents.GetPartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this.accountLookUpAggregate.getPartyByTypeAndId(payload.partyType, payload.partyId);
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEvents.GetPartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this.accountLookUpAggregate.getPartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId);
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEvents.AssociatePartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this.accountLookUpAggregate.associatePartyByTypeAndId(payload.partyType, payload.partyId);
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEvents.AssociatePartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this.accountLookUpAggregate.associatePartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId);
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEvents.DisassociatePartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this.accountLookUpAggregate.disassociatePartyByTypeAndId(payload.partyType, payload.partyId);
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEvents.DisassociatePartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this.accountLookUpAggregate.disassociatePartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId);
        });
    }

    publishAccountLookUpEvent(message:IMessage): void {
        this.acountLookUpEventEmitter.emit(message.key as string,message.value);
    }
    
    
    destroy(){
       this.removeAccountLookUpEvents();
    }

    private removeAccountLookUpEvents() {
       for (const event in AccountLookUpServiceEvents){
           this.acountLookUpEventEmitter.removeAllListeners(event);
       }
    }
}


