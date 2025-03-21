/**
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

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

import { Collection, Document, MongoClient, WithId } from "mongodb";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import {
  NoSuchOracleError,
  OracleAlreadyRegisteredError,
  UnableToCloseDatabaseConnectionError,
  UnableToDeleteOracleError,
  UnableToGetOracleError,
  UnableToInitOracleFinderError,
  UnableToRegisterOracleError,
} from "../errors";
import { IOracleFinder, Oracle } from "@mojaloop/account-lookup-bc-domain-lib";

export class MongoOracleFinderRepo implements IOracleFinder {
  private readonly _logger: ILogger;
  private readonly _connectionString: string;
  private readonly _dbName;
  private readonly _collectionName = "oracles";
  private mongoClient: MongoClient;
  private oracleProviders: Collection;

  constructor(logger: ILogger, connectionString: string, dbName: string) {
    this._logger = logger.createChild(this.constructor.name);
    this._connectionString = connectionString;
    this._dbName = dbName;
  }

  async init(): Promise<void> {
    try {
      this.mongoClient = new MongoClient(this._connectionString);
      await this.mongoClient.connect();
      this.oracleProviders = this.mongoClient.db(this._dbName).collection(this._collectionName);
    } catch (error: unknown) {
      const errorMessage = `Unable to connect to the database: ${(error as Error).message}`;
      this._logger.error(errorMessage + `  - ${error}`);
      throw new UnableToInitOracleFinderError(errorMessage);
    }
  }

  async destroy(): Promise<void> {
    try {
      await this.mongoClient.close();
    } catch (error: unknown) {
      const errorMessage = `Unable to close the database connection: ${(error as Error).message}`;
      this._logger.error(errorMessage + `  - ${error}`);
      throw new UnableToCloseDatabaseConnectionError(errorMessage);
    }
  }

  async addOracle(oracle: Oracle): Promise<void> {
    const oracleAlreadyPresent: Document | null = await this.oracleProviders
      .findOne({
        partyType: oracle.partyType,
        type: oracle.type,
        id: oracle.id,
        name: oracle.name,
        endpoint: oracle.endpoint,
      })
      .catch((error: unknown) => {
          const errorMessage = `Unable to get oracle: ${(error as Error).message}`;
          this._logger.error(errorMessage + `  - ${error}`);
          throw new UnableToGetOracleError(errorMessage);
        }
      );

    if (oracleAlreadyPresent) {
      const errorMessage = `Oracle already present: ${oracle.id}`;
      this._logger.error(errorMessage);
      throw new OracleAlreadyRegisteredError(errorMessage);
    }

    try {
      await this.oracleProviders.insertOne(oracle);
    } catch (error: unknown) {
      const errorMessage = `Unable to insert oracle: ${(error as Error).message}`;
      this._logger.error(errorMessage + `  - ${error}`);
      throw new UnableToRegisterOracleError(errorMessage);
    }
  }

  async removeOracle(id: string): Promise<void> {
    const deleteResult = await this.oracleProviders.deleteOne({ id }).catch(
      (error: unknown) => {
        const errorMessage = `Unable to delete oracle: ${(error as Error).message}`;
        this._logger.error(errorMessage + `  - ${error}`);
        throw new UnableToDeleteOracleError(errorMessage);
      }
    );

    if (deleteResult.deletedCount == 1) {
      return;
    } else {
      const errorMessage = `Oracle with id ${id} not found`;
      this._logger.info(errorMessage);
      throw new NoSuchOracleError(errorMessage);
    }
  }

  async getAllOracles(): Promise<Oracle[]> {
    const oracles = await this.oracleProviders
      .find()
      .toArray()
      .catch(
        (error: unknown) => {
          const errorMessage = `Unable to get all oracles: ${(error as Error).message}`;
          this._logger.error(errorMessage + `  - ${error}`);
          throw new UnableToGetOracleError(errorMessage);
        }
      );

    const mappedOracles: Oracle[] = [];

    oracles.map((oracle: WithId<Document>) => {
      mappedOracles.push(this.mapToOracle(oracle));
    });

    return mappedOracles;
  }

  async getOracleById(id: string): Promise<Oracle | null> {
    const oracle = await this.oracleProviders.findOne({ id: id }).catch(
      (error: unknown) => {
        const errorMessage = `Unable to get oracle by id: ${(error as Error).message}`;
        this._logger.error(errorMessage + `  - ${error}`);
        throw new UnableToGetOracleError(errorMessage);
      }
    );

    if (!oracle) {
      return null;
    }

    return this.mapToOracle(oracle);
  }

  async getOracleByName(name: string): Promise<Oracle | null> {
    const oracle = await this.oracleProviders
      .findOne({ name: name })
      .catch((error: unknown) => {
        const errorMessage = `Unable to get oracle by name: ${(error as Error).message}`;
        this._logger.error(errorMessage + `  - ${error}`);
        throw new UnableToGetOracleError(errorMessage);
      });

    if (!oracle) {
      return null;
    }

    return this.mapToOracle(oracle);
  }

  async getOracle(partyType: string, currency: string | null): Promise<Oracle | null> {
    const oracles: Document | null = await this.oracleProviders
      .find({
        partyType: partyType,
      })
      .toArray()
      .catch((error: unknown) => {
        const errorMessage = `Unable to get oracle: ${(error as Error).message}`;
        this._logger.error(errorMessage + `  - ${error}`);
        throw new UnableToGetOracleError(errorMessage);
      });

    const mappedOraclesWithCurrency: Oracle[] = [];
    const mappedOraclesWithoutCurrency: Oracle[] = [];

    oracles.map((oracle: WithId<Document>) => {
      if (oracle.currency === currency) {
        mappedOraclesWithCurrency.push(this.mapToOracle(oracle));
      } else {
        mappedOraclesWithoutCurrency.push(this.mapToOracle(oracle));
      }
    });

    const oracle = mappedOraclesWithCurrency.shift() ?? mappedOraclesWithoutCurrency.shift() ?? null;

    if (!oracle) {
      const errorMessage = `Oracle with partyType ${partyType}  and currency ${currency} not found`;
      this._logger.info(errorMessage);
      throw new NoSuchOracleError(errorMessage);
    }

    return oracle;
  }

  private mapToOracle(oracle: Document): Oracle {
    return {
      id: oracle.id,
      name: oracle.name,
      partyType: oracle.partyType,
      endpoint: oracle.endpoint,
      type: oracle.type,
      currency: oracle.currency,
    };
  }
}
