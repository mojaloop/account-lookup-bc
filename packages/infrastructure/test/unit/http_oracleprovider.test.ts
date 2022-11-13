
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

import { Oracle } from "@mojaloop/account-lookup-bc-domain";
import {ILogger,ConsoleLogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import { HttpOracleProvider } from "../../../infrastructure/src/oracles/adapters/remote/http_oracleprovider";
import { UnableToInitRemoteOracleProvider } from "../../src/errors";
import { FSP_ID_RESPONSE, NOT_FOUND_PARTY_ID, NOT_FOUND_PARTY_SUB_ID, NOT_FOUND_PARTY_TYPE, PARTY_ID, PARTY_SUB_ID, PARTY_TYPE, RemoteOracleProviderHttpMock } from "../mocks/http_oracleprovider_mock";

const logger: ILogger = new ConsoleLogger();
logger.setLogLevel(LogLevel.FATAL);
let oracleproviderHttpServerMock : RemoteOracleProviderHttpMock;
let remoteOracleProvider: HttpOracleProvider;
const oracle: Oracle = {
    id: "test",
    type: "remote-http",
    endpoint: "http://localhost:3000",
    name: "test",
    partyType: "MSISDN",
    partySubType: null
}

describe("Infrastructure - Remote Oracle Provider Unit tests", () => {
    beforeAll(async () => {
        oracleproviderHttpServerMock = new RemoteOracleProviderHttpMock(logger,oracle.endpoint as string);
        oracleproviderHttpServerMock.setUp();
        //oracleproviderHttpServerMock.enable();
        
        remoteOracleProvider = new HttpOracleProvider(oracle, logger);
    });
    
    afterAll(async () => {
        oracleproviderHttpServerMock.disable();
    });

    test("should set correct values on initialization", async () => {
        // Act
        remoteOracleProvider.init();
        
        // Assert
        expect(remoteOracleProvider.type).toEqual(oracle.type);
        expect(remoteOracleProvider.oracleId).toEqual(oracle.id);
    });

    test("should be able to destroy the oracle provider", async () => {

        // Act && Assert
        await expect(remoteOracleProvider.destroy()).resolves.not.toThrow();

    });

    test("should throw error if oracle endpoint not valid", async () => {
        // Arrange
        const oracle: Oracle = {
            id: "test",
            type: "remote-http",
            endpoint: null,
            name: "test",
            partyType: "MSISDN",
            partySubType: null
        }
        const badRemoteOracleProvider = new HttpOracleProvider(oracle, logger);

        // Act && Assert
        expect(() => badRemoteOracleProvider.init()).toThrow(UnableToInitRemoteOracleProvider);
    
    });

    test("should be able to health check remote oracle",async()=>{
        // Act
        const healthCheck = await remoteOracleProvider.healthCheck();
        
        // Assert
        expect(healthCheck).toEqual(true);
    });

    test("should throw error if couldn't get Participant FspId",async()=>{
        // Act && Assert
        await expect(remoteOracleProvider.getParticipantFspId(NOT_FOUND_PARTY_TYPE,NOT_FOUND_PARTY_ID,NOT_FOUND_PARTY_SUB_ID, null)).rejects.toThrowError();
    });

    test("should be able to get Participant FspId",async()=>{
        // Act
        const result = await remoteOracleProvider.getParticipantFspId("MSISDN","123456789",null, null);
        
        // Assert
        expect(result).toEqual(FSP_ID_RESPONSE);
    });

    test("should throw error if couldn't associate participant",async()=>{
        // Act && Assert
        await expect(remoteOracleProvider.associateParticipant("fakeFspId", NOT_FOUND_PARTY_TYPE,NOT_FOUND_PARTY_ID,NOT_FOUND_PARTY_SUB_ID, null))
            .rejects.toThrowError();
    });

    test("should be able to associate participant",async()=>{
         // Act
         const result = await remoteOracleProvider.associateParticipant("fakeSpId", PARTY_TYPE,PARTY_ID, PARTY_SUB_ID, null);
        
         // Assert
         expect(result).toBeNull();
    });

    test("should throw error if couldn't disassociate participant",async()=>{
        // Act && Assert
        await expect(remoteOracleProvider.disassociateParticipant("fakeFspId", NOT_FOUND_PARTY_TYPE,NOT_FOUND_PARTY_ID,NOT_FOUND_PARTY_SUB_ID, null))
            .rejects.toThrowError();
    });

    test("should be able to disassociate participant",async()=>{
            // Act
            const result = await remoteOracleProvider.disassociateParticipant("fakeFspId", PARTY_TYPE,PARTY_ID, PARTY_SUB_ID, null);
            
            // Assert
            expect(result).toBeNull();
    });

});

