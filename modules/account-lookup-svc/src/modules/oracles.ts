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
    private DB_URL: string = `mongodb://${this.DB_HOST}:${this.DB_PORT_NO}`;
    private DB_NAME: string = "account-lookup";
    private ORACLE_PROVIDERS_COLLECTION_NAME: string = "oracle-providers";
    private ORACLE_PROVIDER_PARTIES_COLLECTION_NAME: string = "oracle-provider-parties";

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