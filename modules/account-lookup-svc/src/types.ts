import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";

export enum AccountLookUpServiceEventsType  {
    GetPartyByTypeAndId = "[Account Lookup] Get Party By Type And Id",
    GetPartyByTypeAndIdAndSubId ="[Account Lookup] Get Party By Type And Id And SubId",
    AssociatePartyByTypeAndId = "[Account Lookup]  Associate Party By Type And Id",
    AssociatePartyByTypeAndIdAndSubId = "[Account Lookup]  Associate Party By Type And Id And SubId",
    DisassociatePartyByTypeAndId = "[Account Lookup]  Disassociate Party By Type And Id",
    DisassociatePartyByTypeAndIdAndSubId= "[Account Lookup]  Disassociate Party By Type And Id And SubId"
}

export interface IAccountLookUpMessage extends IMessage {
    value: {
        type:AccountLookUpServiceEventsType,
        payload: object
    }
}