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

import { IOracleFinder, IOracleProvider } from "@mojaloop/account-lookup-bc-domain";
import { MongoOracleFinderRepo, MongoOracleProviderRepo } from "@mojaloop/account-lookup-bc-infrastructure";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";

export interface IAccountLookUpOracles{
    init():Promise<void>;
    getOracleFinder():IOracleFinder;
    getOracleProvider():IOracleProvider[];
    destroy(): Promise<void>;
  }

export class AccountLookUpOracles implements IAccountLookUpOracles{
      
    private DB_HOST: string = process.env.ACCOUNT_LOOKUP_DB_HOST ?? "localhost";
    private DB_PORT_NO: number = parseInt(process.env.ACCOUNT_LOOKUP_DB_PORT_NO ?? "") || 27017;
    private DB_URL = `mongodb://${this.DB_HOST}:${this.DB_PORT_NO}`;
    private DB_NAME = "account-lookup";
    private ORACLE_PROVIDERS_COLLECTION_NAME = "oracle-providers";
    private ORACLE_PROVIDER_PARTIES_COLLECTION_NAME = "oracle-provider-parties";

    private readonly _logger: ILogger;
    private readonly _oracleFinder: IOracleFinder;
    private readonly _oracleProvider: IOracleProvider[];

    constructor(logger:ILogger){
        this._logger = logger;
        this._oracleFinder = new MongoOracleFinderRepo(
            this._logger,
            this.DB_URL,
            this.DB_NAME,
            this.ORACLE_PROVIDERS_COLLECTION_NAME
          );

          this._oracleProvider = [new MongoOracleProviderRepo(
            this._logger,
            this.DB_URL,
            this.DB_NAME,
            this.ORACLE_PROVIDER_PARTIES_COLLECTION_NAME
          )];
    }

    async init(): Promise<void> {
     try{
            this._logger.info("Initializing Oracle Finder");
            await this._oracleFinder.init();
            this._logger.info("Oracle Finder Initialized");

            this._oracleProvider.forEach(async oracleProvider => {
                this._logger.info("Initializing Oracle Provider " + oracleProvider.id);
                await oracleProvider.init();
                this._logger.info("Oracle Provider " + oracleProvider.id + " Initialized");
            });
        }
        catch(err){
            this._logger.error("Unable to initialize Oracles");
            throw err;
        }
      }

      getOracleFinder(): IOracleFinder {
          return this._oracleFinder;
      }

      getOracleProvider(): IOracleProvider[] {
          return this._oracleProvider;
      }

      async destroy(): Promise<void> {
        try{
            this._logger.info("Destroying Oracle Finder");
            await this._oracleFinder.destroy();
            this._logger.info("Oracle Finder Destroyed");

            this._oracleProvider.forEach(async oracleProvider => {
                this._logger.info("Destroying Oracle Provider " + oracleProvider.id);
                await oracleProvider.destroy();
                this._logger.info("Oracle Provider " + oracleProvider.id + " Destroyed");
            });
        }
        catch(err){
            this._logger.error("Unable to destroy Oracles");
            throw err;
        }
      }

  }