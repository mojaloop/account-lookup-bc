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

import {IOracleProviderAdapter, OracleType} from '@mojaloop/account-lookup-bc-domain';
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import fs, {existsSync} from "fs";
import { readFile, writeFile } from "fs/promises";
import { watch } from "node:fs";

type Association = {
    fspId: string;
    partyType: string;
    partyId: string;
    partySubId: string|null;
    currency: string|null;
}

export class RemoteOracle implements IOracleProviderAdapter {
    private readonly _logger: ILogger;
    private readonly _filePath: string;
    private _associations:Map<string, Association> = new Map<string, Association>();
    private _fileWatcher: fs.FSWatcher;
    
    constructor(filePath:string, logger:ILogger) {
        this._logger = logger;
        this._filePath = filePath;

        this._logger.info(`Starting RemoteOracle with file path: "${this._filePath}"`);
    }
    
    oracleId: string;
    type: OracleType;
    
    async init(): Promise<void> {
        const exists = fs.existsSync(this._filePath);

        if(!exists){
            this._logger.info(`File "${this._filePath}" does not exist. Creating it.`);
            return;
        }

        await this._loadFromFile();

        let fsWait:NodeJS.Timeout | undefined; // debounce wait
        
        this._fileWatcher = watch(this._filePath, async (eventType, filename) => {
            if (eventType === "change") {
                if (fsWait) return;
                fsWait = setTimeout(() => {
                    fsWait = undefined;
                }, 100);
               this._logger.info(`File "${this._filePath}" changed. Reloading associations.`);
               await this._loadFromFile();
            }
        });
    }

    async destroy(): Promise<void> {
        this._fileWatcher.close();
    }

    private async _loadFromFile(): Promise<void>{
        this._associations.clear();
        let fileData: any;
        try{
            const strContents = await readFile(this._filePath, "utf8");
            if(!strContents || !strContents.length){
                 this._logger.info(`File "${this._filePath}" is empty. No associations to load.`);
                 return;
            }
            fileData = JSON.parse(strContents);
        }catch (e) {
            this._logger.error(`Failed to load associations from file "${this._filePath} - ${e}"`);
            throw new Error(`Failed to load associations from file "${this._filePath}"`);
        }

        if(fileData.associations && Array.isArray(fileData.associations)){
            for (const record of fileData.associations) {
                //check if map already has the key and the value is different
                const newAssociation:Association = {
                    partyId: record.partyId,
                    fspId: record.fspId,
                    partyType: record.partyType,
                    partySubId: record?.partySubId??"NULL",
                    currency: record?.currency??"NULL",
                };
                //Create key from partyId, partyType, partySubType and currency
                const key = this.createKey(newAssociation);

                if(this._associations.has(key)){
                    this._logger.warn(`Duplicate association found in file "${this._filePath}"`);
                }
                else{
                    this._associations.set(key, newAssociation);
                }
                
            }
        }

        this._logger.info(`Successfully read file contents - associations: ${this._associations.size}`);
    }
    
    private async _saveToFile():Promise<void>{
        try{
            const obj = {
                associations: Array.from(this._associations.values()),
            };
            const strContents = JSON.stringify(obj, null, 4);
            await writeFile(this._filePath, strContents, "utf8");
        }catch (e) {
            this._logger.error(`Failed to save associations to file "${this._filePath}"`);
            throw new Error(`Failed to save associations to file "${this._filePath}"`);
        }
    }

    private createKey(data:Omit<Association,"fspId">):string{
        const checkNull = (value:string|null|undefined):string => {
            return (value === null || value === undefined)?"NULL":value;
        };
        return `${data.partyId}-${data.partyType}-${checkNull(data.partySubId)}-${checkNull(data.currency)}`;
    }

    async getParticipantFspId(partyType:string, partyId: string, partySubId:string|null, currency:string| null ):Promise<string|null> {
        const key = this.createKey({partyId, partyType, partySubId, currency});
        const association = this._associations.get(key);
        if(association){
            this._logger.debug(`Found association for partyId: ${partyId}, partyType: ${partyType}, partySubId: ${partySubId}, currency: ${currency}`);
            return association.fspId;
        }
        this._logger.debug(`No association found for partyId: ${partyId}, partyType: ${partyType}, partySubId: ${partySubId}, currency: ${currency}`);
        return null;
    }
    
    async associateParticipant(fspId:string, partyType:string, partyId: string,partySubId:string|null, currency:string| null): Promise<null> {
       //Create key from partyId, partyType,partySubType and currency
        const key = this.createKey({partyId, partyType, partySubId, currency});
        const association = this._associations.get(key);
        
        if(association){
            this._logger.error(`Association already exists for partyId: ${partyId}, partyType: ${partyType}, partySubId: ${partySubId}, currency: ${currency}`);
            throw new Error(`Duplicate association found for partyId, partyType, partySubType and currency: ${partyId}, ${partyType}, ${partySubId}, ${currency}`);
        }
        else{
            this._associations.set(key, {partyId, partyType, partySubId, currency, fspId});
            this._logger.info(`Successfully added association for partyId: ${partyId}, partyType: ${partyType}, partySubId: ${partySubId}, currency: ${currency} with fspId: ${fspId}`);
            this._saveToFile();
            return null;
        }
    }

    async disassociateParticipant(fspId:string, partyType:string, partyId: string ,partySubId:string|null, currency:string| null): Promise<null> {
        const key = this.createKey({partyId, partyType, partySubId, currency});
        const association = this._associations.get(key);

        if(association && association.fspId === fspId){
            this._associations.delete(key);
            this._saveToFile();
            this._logger.debug(`Successfully removed association for partyId: ${partyId}, partyType: ${partyType}, partySubId: ${partySubId}, currency: ${currency} with fspId: ${fspId}`);
            return null;
        }
        else{
            this._logger.error(`No association found for partyType: ${partyType}, partyId: ${partyId}, partySubId: ${partySubId}, currency: ${currency} and fspId: ${fspId}`);
            throw new Error(`No association found for partyId, partyType,
            partySubType and currency: ${partyId}, ${partyType}, ${partySubId}, ${currency}`);
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }

}

