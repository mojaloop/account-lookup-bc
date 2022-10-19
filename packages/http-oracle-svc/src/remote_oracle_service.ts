import {IOracleProviderAdapter, OracleType} from '@mojaloop/account-lookup-bc-domain';
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import fs, {existsSync} from "fs";
import { readFile, writeFile } from "fs/promises";
import { watch } from "node:fs";

type Association = {
    fspId: string;
    partyId: string;
    partyType: string;
    partySubType: string|null;
    currency: string|null;
}

export class RemoteOracleService implements IOracleProviderAdapter {
    private readonly _logger: ILogger;
    private readonly _filePath: string;
    private _associations:Map<string, Association> = new Map<string, Association>();
    
    constructor(filePath:string, logger:ILogger) {
        this._logger = logger.createChild(this.constructor.name);
        this._filePath = filePath;

        this._logger.info(`Starting RemoteOracle with file path: "${this._filePath}"`);
    }

    oracleId: string;
    type: OracleType;
    
    getParticipantFspId(partyId: string, partyType: string, partySubType: string | null, currency: string | null): Promise<string | null> {
        throw new Error('Method not implemented.');
    }
    associateParticipant(fspId: string, partyId: string, partyType: string, partySubType: string | null, currency: string | null): Promise<null> {
        throw new Error('Method not implemented.');
    }
    disassociateParticipant(fspId: string, partyId: string, partyType: string, partySubType: string | null, currency: string | null): Promise<null> {
        throw new Error('Method not implemented.');
    }

    async init(): Promise<void> {
        const exists = fs.existsSync(this._filePath);

        if(!exists){
            this._logger.info(`File "${this._filePath}" does not exist. Creating it.`);
            return;
        }


        const loadSuccess = await this._loadFromFile();
        if(!loadSuccess){
            this._logger.error(`Failed to load associations from file "${this._filePath}"`);
            throw new Error(`Failed to load associations from file "${this._filePath}"`);
        }


        let fsWait:NodeJS.Timeout | undefined; // debounce wait
        
        watch(this._filePath, async (eventType, filename) => {
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

    private async _loadFromFile(): Promise<boolean>{
        this._associations.clear();
        let fileData: any;
        try{
            const strContents = await readFile(this._filePath, "utf8");
            if(!strContents || !strContents.length){
                return false;
            }
            fileData = JSON.parse(strContents);
        }catch (e) {
            this._logger.error(`Failed to load associations from file "${this._filePath}"`);
            throw new Error(`Failed to load associations from file "${this._filePath}"`);
        }

        if(fileData.associations && Array.isArray(fileData.associations)){
            for (const record of fileData.associations) {
                //check if map already has the key and the value is different
                const newAssociation:Association = {
                    partyId: record.partyId,
                    fspId: record.fspId,
                    partyType: record.partyType,
                    partySubType: record?.partySubType??"NULL",
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

        return true;
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

    private createKey(data:Association):string{
        return `${data.partyId}_${data.partyType}_${data.partySubType}_${data.currency}_${data.fspId}`;
    }

    async getFspId(partyId:string, ): Promise<string | undefined> {
        return this._associations.get(partyId);
    }

    async addAssociation(partyId:string, fspId:string): Promise<void> {
        //check if map already has the key and the value is different
        if(this._associations.has(partyId) && this._associations.get(partyId) !== fspId){
            this._logger.warn(`Duplicate partyId "${partyId}" found in file "${this._filePath}"`);
        }
        else{
            this._associations.set(partyId, fspId);
        }
        await this._saveToFile();
    }

    async removeAssociation(partyId:string,fspId:string): Promise<void> {
        if(this._associations.has(partyId) && this._associations.get(partyId) === fspId){
            this._associations.delete(partyId);
            await this._saveToFile();
        }
        else{
            this._logger.warn(`Association for partyId "${partyId}" not found in file "${this._filePath}"`);
        }

    }

}