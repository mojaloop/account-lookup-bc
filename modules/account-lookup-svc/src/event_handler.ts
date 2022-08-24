import EventEmitter from "events";
import events from "events";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { AccountLookupAggregate } from "@mojaloop/account-lookup-bc-domain";
import { AccountLookUpServiceEventsType, IAccountLookUpMessage } from "./types";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";

export interface IEventAccountLookUpServiceHandler{
    init():void,
    publishAccountLookUpEvent(message:IMessage):any,
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
                this._logger.error(`GetPartyByTypeAndId: ${err}`);
            });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.GetPartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this._accountLookUpAggregate.getPartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId).catch(err => {
                this._logger.error(`GetPartyByTypeAndIdAndSubId: ${err}`)
            });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.AssociatePartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this._accountLookUpAggregate.associatePartyByTypeAndId(payload.partyType, payload.partyId).catch(err => {
                this._logger.error(`AssociatePartyByTypeAndId: ${err}`);
            });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.AssociatePartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this._accountLookUpAggregate.associatePartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId).catch(err => {
                this._logger.error(`AssociatePartyByTypeAndIdAndSubId: ${err}`);
            });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.DisassociatePartyByTypeAndId, (payload: { partyType: string; partyId: string; }) => {
            this._accountLookUpAggregate.disassociatePartyByTypeAndId(payload.partyType, payload.partyId).catch(err => {
                this._logger.error(`DisassociatePartyByTypeAndId: ${err}`);
            });
        });
        this.acountLookUpEventEmitter.on(AccountLookUpServiceEventsType.DisassociatePartyByTypeAndIdAndSubId, (payload: { partyType: string; partyId: string; partySubId: string; }) => {
            this._accountLookUpAggregate.disassociatePartyByTypeAndIdAndSubId(payload.partyType, payload.partyId, payload.partySubId).catch(err => {
                this._logger.error(`DisassociatePartyByTypeAndIdAndSubId: ${err}`);
            });
        });
    }

    publishAccountLookUpEvent(message:IAccountLookUpMessage): void {
        console.log('message published', message);
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


