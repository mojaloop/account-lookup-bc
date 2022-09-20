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


import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { NoSuchOracleProviderError, NoSuchParticipantFspIdError, NoValidParticipantFspIdError, RequiredParticipantIsNotActive, UnableToAssociatePartyError, UnableToDisassociatePartyError, UnableToGetOracleError, UnableToGetOracleProviderError } from "./errors";
import { IOracleFinder, IOracleProvider, IParticipantService} from "./interfaces/infrastructure";
import { AccountLookUpEventsType, IAccountLookUpMessage, IParticipant, ParticipantAssociationRequestReceived, ParticipantDisassociationRequestReceived, ParticipantQueryReceived, PartyInfoAvailable, PartyQueryReceived } from "./types";
export class AccountLookupAggregate  {
	private readonly _logger: ILogger;
    private readonly _oracleFinder: IOracleFinder;
	private readonly _oracleProviders: IOracleProvider[];
    private readonly _messageProducer: IMessageProducer;
    private readonly _participantService: IParticipantService;
    

	constructor(
		logger: ILogger,
        oracleFinder:IOracleFinder,
        oracleProviders:IOracleProvider[],
        messageProducer:IMessageProducer,
        participantService: IParticipantService
	) {
        this._logger = logger;
		this._oracleFinder = oracleFinder;
		this._oracleProviders = oracleProviders;
        this._messageProducer = messageProducer;
        this._participantService = participantService;
    }

    async init(): Promise<void> {
		try {
            this._oracleFinder.init();
            this._logger.debug("Oracle finder initialized");
            for await (const oracle of this._oracleProviders) {
                await oracle.init();
                this._logger.debug("Oracle provider initialized with type" + oracle.partyType);
            }
    	}
        catch(error) {
            {
			    this._logger.fatal("Unable to intialize account lookup aggregate" + error);
			    throw error;
		    }
	    }
    }


    async publishAccountLookUpEvent(message:IAccountLookUpMessage): Promise<void> {
        const isMessageValid = this.validateMessage(message);
        if(isMessageValid) {
            try{
                await this.handleMessage(message);
            }
            catch(error) {
                this._logger.error(`${message.value.type} ` + error);
            }
        }
    }

    async destroy(): Promise<void> {
        try{
            await this._oracleFinder.destroy();
            for await (const oracle of this._oracleProviders) {
                oracle.destroy();
            }
        } catch(error) {
            this._logger.fatal("Unable to destroy account lookup aggregate" + error);
            throw error;
        }
	}

    //Participant.
    async getParticipant({ sourceFspId, partyType, partyId, partySubType, currency, destinationFspId}: ParticipantQueryReceived):Promise<void>{
        const sourceFsp = await this._participantService.getParticipantInfo(sourceFspId);
  
        this.validateParticipant(sourceFsp);


        const destinationFspList: IParticipant[] = await this.getDestinationFspList({ partyId, partyType, partySubType, destinationFspId });
        
        // Publish the same amount of messages as FSPs received
        for(let i=0 ; i<destinationFspList.length ; i+=1) {
            this._messageProducer.send({ 
                fspId: destinationFspList[i].id,
                partyType: partyType,
                partyId: partyId,
                partySubType: partySubType,
                currency: currency
            });
        }
    }

    //Party.
    async associateParty({ requesterFspId, partyType, partySubType, partyId }: ParticipantAssociationRequestReceived):Promise<void>{
        const requesterFsp = await this._participantService.getParticipantInfo(requesterFspId);
  
        this.validateParticipant(requesterFsp);

        const oracleProvider = await this.getOracleProvider(partyType, partySubType);

        await oracleProvider.associateParty(partyId).catch(error=>{
            this._logger.error(`Unable to associate party id: ${partyId} ` + error);
            throw new UnableToAssociatePartyError(error);
        });

        this._messageProducer.send(null);
    }

    async disassociateParty({ requesterFspId, partyType, partySubType, partyId }: ParticipantDisassociationRequestReceived):Promise<void>{
        const requesterFsp = await this._participantService.getParticipantInfo(requesterFspId);
  
        this.validateParticipant(requesterFsp);
        
        const oracleProvider = await this.getOracleProvider(partyType, partySubType);

        await oracleProvider.disassociateParty(partyId).catch(error=>{
            this._logger.error(`Unable to disassociate party id: ${partyId} ` + error);
            throw new UnableToDisassociatePartyError(error);
        });

        this._messageProducer.send(null);
    }

    async getPartyRequest({ sourceFspId, partyType, partyId, partySubType, currency, destinationFspId }: PartyQueryReceived):Promise<void>{

        const sourceFsp = await this._participantService.getParticipantInfo(sourceFspId);
  
        this.validateParticipant(sourceFsp);

        const destinationFspList: IParticipant[] = await this.getDestinationFspList({ partyId, partyType, partySubType, destinationFspId });


        // Publish the same amount of messages as FSPs received
        for(let i=0 ; i<destinationFspList.length ; i+=1) {
            this._messageProducer.send({ 
                sourceFspId: sourceFspId,
                destinationFspId: destinationFspList[i].id,
                partyType: partyType,
                partyId: partyId,
                partySubType: partySubType,
                currency: currency
            });
        }
    }
    
    async getPartyResponse({ sourceFspId, destinationFspId, partyType, partyId, partySubType, currency, partyName, partyDoB }: PartyInfoAvailable):Promise<void>{
        const sourceFsp = await this._participantService.getParticipantInfo(sourceFspId);


        this.validateParticipant(sourceFsp);

        const destinationFsp = await this._participantService.getParticipantInfo(destinationFspId);

        this.validateParticipant(destinationFsp);

        this._messageProducer.send({ 
            sourceFspId: sourceFspId,
            destinationFspId: destinationFspId,
            partyType: partyType,
            partyId: partyId,
            partySubType: partySubType,
            currency: currency,
            partyName: partyName,
            partyDoB: partyDoB
        });
    }


    //Private methods.
    private validateMessage(message:IAccountLookUpMessage): boolean {
        if(!message.value){
            this._logger.error(`AccountLookUpEventHandler: publishAccountLookUpEvent: message as an invalid format or value`);
            return false;
        }


        if(! Object.values(AccountLookUpEventsType).some(event => event === message?.value?.type)){
            this._logger.error(`AccountLookUpEventHandler: publishAccountLookUpEvent: message type ${message.value.type} is not a valid event type`);
            return false;
        }

        return true;
    }

    private async handleMessage(message:IAccountLookUpMessage):Promise<void> {
        let payload;
        switch(message.value.type){
            case AccountLookUpEventsType.GetParty:
                payload = message.value.payload as PartyQueryReceived;
                await this.getPartyRequest({ 
                    sourceFspId: payload.sourceFspId, 
                    partyType: payload.partyType, 
                    partyId: payload.partyId, 
                    partySubType: payload.partySubType, 
                    currency: payload.currency,
                    destinationFspId: payload.destinationFspId
                });
                break;
            case AccountLookUpEventsType.GetParticipant:
                payload = message.value.payload as ParticipantQueryReceived;
                await this.getParticipant({
                    sourceFspId: payload.sourceFspId, 
                    partyType: payload.partyType, 
                    partyId: payload.partyId, 
                    partySubType: payload.partySubType, 
                    destinationFspId: payload.destinationFspId, 
                    currency: payload.currency
                });
                break;
            case AccountLookUpEventsType.AssociateParty:
                payload = message.value.payload as ParticipantAssociationRequestReceived;
                await this.associateParty({
                    requesterFspId: payload.requesterFspId, 
                    partyType: payload.partyType, 
                    partyId: payload.partyId, 
                    partySubType: payload.partySubType
                });
                break;
            case AccountLookUpEventsType.DisassociateParty:
                payload = message.value.payload as ParticipantDisassociationRequestReceived;
                await this.disassociateParty({
                    requesterFspId: payload.requesterFspId, 
                    partyType: payload.partyType, 
                    partyId: payload.partyId, 
                    partySubType: payload.partySubType
                });
                break;
            default:
                this._logger.error(`AccountLookUpEventHandler: handleMessage: message type ${message.value.type} is not a valid event type`);
                break;
            }
    }

    private async getOracleProvider(partyType:string, partySubType?:string): Promise<IOracleProvider> {

        const oracleProvider = await this._oracleFinder.getOracleProvider(partyType, partySubType).catch(error=>{
            this._logger.error(`Unable to get oracle for type: ${partyType} ` + error);
            throw new UnableToGetOracleError(error);
        });

        if(!oracleProvider) {
            this._logger.debug(`No oracle provider found for partyType: ${partyType}`);
            throw new UnableToGetOracleProviderError(`Oracle provider not found for partyType: ${partyType}`);
        }

		return oracleProvider;
	}

    private async getValidParticipants(partyId:string, partyType:string, partySubType?:string): Promise<IParticipant[]> {

        const oracle = await this._oracleFinder.getOracleProvider(partyType, partySubType);
        
        if(!oracle) {
            throw new NoSuchOracleProviderError(`oracle for ${partyType} not found`);
        }

        // We can have more than one FSP that owns this partyId
        const fspIdList = await oracle.getParticipants(partyId);

        if(!(fspIdList.length > 0)) {
            throw new NoSuchParticipantFspIdError(`partyId:${partyId} has no existing fspId owner`);
        }

        // The participants service returns a list of FSPs with 
        // more info than just a regular ID, example:
        // {
        //     id: string;
        //     isActive: Boolean;
        // }
        const fspList: IParticipant[]  = await this._participantService.getParticipantsInfo(fspIdList);
        
        const validFspList: IParticipant[] = [];

        // We need to check and push the active FSPs to a list we can return
        for(let i=0 ; i<fspList.length ; i+=1) {
            if(fspList[i].isActive) {
                validFspList.push(fspList[i]);
            }
        }
        
        if(!(validFspList.length > 0)) {
            throw new NoValidParticipantFspIdError(`getParticipant partyType:${partyType} has no valid fspIds`);
        }

        return validFspList;
    }
    
    private validateParticipant(participant: IParticipant | null):void{

        if(!participant) {
            throw new NoSuchParticipantFspIdError(`fspId does not exist`);
        }

        if(!participant.isActive) {
            throw new RequiredParticipantIsNotActive(`fspId:${participant.id} is not active`);
        }
    }

    private async getDestinationFspList({ partyId, partyType, partySubType, destinationFspId }: { partyId:string, partyType:string, partySubType?:string, destinationFspId?: string }):Promise<IParticipant[]>{
        
        let destinationFspList: IParticipant[] = [];

        // In this case, the sourceFspId already knows the destinationFspId,
        // so we just need to validate it
        if(destinationFspId) {
            const destinationFsp = await this._participantService.getParticipantInfo(destinationFspId);
            
            this.validateParticipant(destinationFsp);

            if(destinationFsp) {
                destinationFspList.push(destinationFsp);
            }
        } else {
            destinationFspList = await this.getValidParticipants(partyId, partyType, partySubType);
        }  

        return destinationFspList;
    }


}
