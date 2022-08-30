import { IParty } from "@mojaloop/account-lookup-bc-domain";

export const mockedPartyIds = ["party1", "party2", "party3","partyError"];
export const mockedPartyResultIds = ["party1", "party2", "party3"];
export const mockedPartyResultSubIds = ["subId1", "subId2", "subId3"];

export const mockedPartySubIds = ["subId2","subId3"];
export const mockedPartyTypes = ["bank", "creditUnion", "insurance"];


export const mockedOracleList = [
    {
        id: mockedPartyIds[0],
        type: mockedPartyTypes[0],
    },
    {
        id: mockedPartyIds[1],
        type: mockedPartyTypes[1],
    },
    {
        id: mockedPartyIds[2],
        type: mockedPartyTypes[2],
    },
    
];


export const mockedParties: Map<{partyId:string, partyType:string, partySubId?:string}, IParty| Error> = new Map();
mockedParties.set({partyId:mockedPartyIds[0],partyType:mockedPartyTypes[0]},{currency: "dollar", id: mockedPartyResultIds[0], subId: mockedPartyResultSubIds[0],type: "individual"});
mockedParties.set({partyId:mockedPartyIds[1],partyType:mockedPartyTypes[1],partySubId:mockedPartySubIds[0]}, {currency: "dollar", id: mockedPartyResultIds[1], subId: mockedPartyResultSubIds[1],type: "individual"});
mockedParties.set({partyId:mockedPartyIds[2],partyType:mockedPartyTypes[2],partySubId:mockedPartySubIds[1]}, {currency: "euro", id: mockedPartyResultIds[2], subId: mockedPartyResultSubIds[2],type: "individual"});
mockedParties.set({partyId:mockedPartyIds[3],partyType:mockedPartyTypes[2]}, new Error());
mockedParties.set({partyId:mockedPartyIds[3],partyType:mockedPartyTypes[2], partySubId:mockedPartySubIds[0]}, new Error());



export const mockedPartyAssociations: Map<{partyType:string,partyId:string,partySubId?:string}, null| undefined> = new Map();
mockedPartyAssociations.set({partyId:mockedPartyIds[0],partyType:mockedPartyTypes[0]}, null);
mockedPartyAssociations.set({partyId:mockedPartyIds[1],partyType:mockedPartyTypes[1],partySubId:"subId2"}, null);
mockedPartyAssociations.set({partyId:mockedPartyIds[2],partyType:mockedPartyTypes[2],partySubId:"subId3"}, undefined);


