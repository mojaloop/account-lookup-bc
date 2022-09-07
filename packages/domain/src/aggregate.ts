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
import { GetParticipantError, GetPartyError, NoSuchParticipantError, NoSuchPartyError, UnableToAssociateParticipantError, UnableToAssociatePartyError, UnableToDisassociateParticipantError, UnableToDisassociatePartyError, UnableToGetOracleError, UnableToGetOracleProviderError } from "./errors";
import { IMessagePublisher, IOracleFinder, IOracleProvider} from "./interfaces/infrastructure";
import { IParticipant, IParty } from "./types";

export class AccountLookupAggregate {
	private readonly logger: ILogger;
	private readonly oracleFinder: IOracleFinder;
	private readonly oracleProviders: IOracleProvider[];
    private readonly messagePublisher: IMessagePublisher;  

	constructor(
		logger: ILogger,
        oracleFinder:IOracleFinder,
        oracleProviders:IOracleProvider[],
        messagePublisher:IMessagePublisher
	) {
		this.logger = logger;
		this.oracleFinder = oracleFinder;
		this.oracleProviders = oracleProviders;
        this.messagePublisher = messagePublisher;
    }

    async init(): Promise<void> {
		try {
            this.oracleFinder.init();
            this.logger.debug("Oracle finder initialized");
            for await (const oracle of this.oracleProviders) {
                await oracle.init();
                this.logger.debug("Oracle provider initialized with id" + oracle.id);
            }
            // this.messagePublisher.init()
		} catch (error: unknown) {
			this.logger.fatal("Unable to intialize account lookup aggregate" + error);
			throw error;
		}
	}

	async destroy(): Promise<void> {
        try{
		await this.oracleFinder.destroy();
        for await (const oracle of this.oracleProviders) {
            oracle.destroy();
        }
        }
        catch(error){
            this.logger.fatal("Unable to destroy account lookup aggregate" + error);
            throw error;
        }
	}

    //Party.
    async getPartyByTypeAndIdRequest(partyType:string, partyId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        const party = await oracleProvider.getPartyByTypeAndId(partyType, partyId)
        .catch(error=>{
            this.logger.error(`Unable to get party by type: ${partyType} and id: ${partyId} ` + error);
            throw new GetPartyError(error);
        });

        if (!party) {
            this.logger.debug(`No party by type: ${partyType} and id: ${partyId} found`);
            throw new NoSuchPartyError();
        }

        this.messagePublisher.send({ 
            id: partyId,
            type: partyType,
        });
    }
    
    async getPartyByTypeAndIdResponse(partyType:string, partyId:string):Promise<IParty|null|undefined>{
        const oracleProvider = await this.getOracleProvider(partyType);

        const party = await oracleProvider.getPartyByTypeAndId(partyType, partyId)
        .catch(error=>{
            this.logger.error(`Unable to get party by type: ${partyType} and id: ${partyId} ` + error);
            throw new GetPartyError(error);
        });

        if (!party) {
            this.logger.debug(`No party by type: ${partyType} and id: ${partyId} found`);
            throw new NoSuchPartyError();
        }
        
        return party;
    }

    async getPartyByTypeAndIdAndSubIdRequest(partyType:string, partyId:string, partySubId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        const party = await oracleProvider.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId)
        .catch(error=>{
            this.logger.error(`Unable to get party by type: ${partyType} and id: ${partyId}  and subId: ${partySubId} ` + error);
            throw new GetPartyError(error);
        });

        if (!party) {
            this.logger.debug(`No party by type: ${partyType} and id: ${partyId} and subId: ${partySubId} found`);
            throw new NoSuchPartyError();
        }

        this.messagePublisher.send({ 
            id: partyId,
            type: partyType,
            subId: partySubId
        });
    }

    async getPartyByTypeAndIdAndSubIdResponse(partyType:string, partyId:string, partySubId:string):Promise<IParty|null|undefined>{
        const oracleProvider = await this.getOracleProvider(partyType);

        const party = await oracleProvider.getPartyByTypeAndIdAndSubId(partyType, partyId, partySubId)
        .catch(error=>{
            this.logger.error(`Unable to get party by type: ${partyType} and id: ${partySubId} and subId: ${partySubId} ` + error);
            throw new GetPartyError(error);
        });

        if (!party) {
            this.logger.debug(`No party by type: ${partyType} and id: ${partyId} and subId: ${partySubId} found`);
            throw new NoSuchPartyError();
        }
        
        return party;
    }

    async associatePartyByTypeAndId(partyType:string, partyId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.associatePartyByTypeAndId(partyType, partyId).catch(error=>{
            this.logger.error(`Unable to associate party by type: ${partyType} and id: ${partyId} ` + error);
            throw new UnableToAssociatePartyError(error);
        });
    }

    async associatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.associatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId).catch(error=>{
            this.logger.error(`Unable to associate party by type: ${partyType} and id: ${partyId} and subId:${partySubId} ` + error);
            throw new UnableToAssociatePartyError(error);
        });
    }

    async disassociatePartyByTypeAndId(partyType:string, partyId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.disassociatePartyByTypeAndId(partyType, partyId).catch(error=>{
            this.logger.error(`Unable to disassociate party by type: ${partyType} and id: ${partyId} ` + error);
            throw new UnableToDisassociatePartyError(error);
        });
    }

    async disassociatePartyByTypeAndIdAndSubId(partyType:string, partyId:string, partySubId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(partyType);

        await oracleProvider.disassociatePartyByTypeAndIdAndSubId(partyType, partyId, partySubId).catch(error=>{
            this.logger.error(`Unable to disassociate party by type: ${partyType} and id: ${partyId} and subId:${partySubId} ` + error);
            throw new UnableToDisassociatePartyError(error);
        });
    }

    //Participant.
    async getParticipantByTypeAndId(participantType:string, participantId:string):Promise<IParticipant|null|undefined>{
        // const cachedParticipant:IParticipant = this.cacheControl.get(participantType, participantId);

        //if(cachedParticipant) {
          //  return cachedParticipant;
        //}

        const oracleProvider = await this.getOracleProvider(participantType);

        const party = await oracleProvider.getParticipantByTypeAndId(participantType, participantId)
        .catch(error=>{
            this.logger.error(`Unable to get party by type: ${participantType} and id: ${participantId} ` + error);
            throw new GetParticipantError(error);
        });

        if (!party) {
            this.logger.debug(`No party by type: ${participantType} and id: ${participantId} found`);
            throw new NoSuchParticipantError();
        }
        
        return party;

    }

    async getParticipantByTypeAndIdAndSubId(participantType:string, participantId:string, participantSubId:string):Promise<IParticipant|null|undefined>{
        const oracleProvider = await this.getOracleProvider(participantType);

        const party = await oracleProvider.getParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId)
            .catch(error=>{
                this.logger.error(`Unable to get party by type: ${participantType} and id: ${participantId} and subId:${participantSubId} ` + error);
                throw new GetParticipantError(error);
            });

        if (!party) {
            this.logger.debug(`No party by type: ${participantType} and id: ${participantId}  and subId:${participantSubId} found`);
            throw new NoSuchParticipantError();
        }

        return party;
    }

    async associateParticipantByTypeAndId(participantType:string, participantId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(participantType);

        await oracleProvider.associateParticipantByTypeAndId(participantType, participantId).catch(error=>{
            this.logger.error(`Unable to associate party by type: ${participantType} and id: ${participantId} ` + error);
            throw new UnableToAssociateParticipantError(error);
        });
    }

    async associateParticipantByTypeAndIdAndSubId(participantType:string, participantId:string, participantSubId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(participantType);

        await oracleProvider.associateParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId).catch(error=>{
            this.logger.error(`Unable to associate party by type: ${participantType} and id: ${participantId} and subId:${participantSubId} ` + error);
            throw new UnableToAssociateParticipantError(error);
        });
    }

    async disassociateParticipantByTypeAndId(participantType:string, participantId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(participantType);

        await oracleProvider.disassociateParticipantByTypeAndId(participantType, participantId).catch(error=>{
            this.logger.error(`Unable to disassociate party by type: ${participantType} and id: ${participantId} ` + error);
            throw new UnableToDisassociateParticipantError(error);
        });
    }

    async disassociateParticipantByTypeAndIdAndSubId(participantType:string, participantId:string, participantSubId:string):Promise<void>{
        const oracleProvider = await this.getOracleProvider(participantType);

        await oracleProvider.disassociateParticipantByTypeAndIdAndSubId(participantType, participantId, participantSubId).catch(error=>{
            this.logger.error(`Unable to disassociate party by type: ${participantType} and id: ${participantId} and subId:${participantSubId} ` + error);
            throw new UnableToDisassociateParticipantError(error);
        });
    }

    //Private.
    private async getOracleProvider(partyType:string): Promise<IOracleProvider> {
        const oracleId = await this.oracleFinder.getOracleForType(partyType).catch(error=>{
            this.logger.error(`Unable to get oracle for type: ${partyType} ` + error);
            throw new UnableToGetOracleError(error);
        });

        if(!oracleId) {
            this.logger.debug(`No oracle found for type: ${partyType}`);
            throw new UnableToGetOracleError(`Oracle not found for partyType: ${partyType}`);
        }

        const oracleProvider = this.oracleProviders.find(oracleProvider => oracleProvider.id === oracleId);

        if(!oracleProvider) {
            this.logger.debug(`No oracle provider found for id: ${oracleId}`);
            throw new UnableToGetOracleProviderError(`Oracle provider not found for oracleId: ${oracleId}`);
        }

		return oracleProvider;
	}
}
