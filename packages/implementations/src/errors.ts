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


export class OracleTypeNotSupportedError extends Error {
  constructor(message?: string) {
    super(message || "Oracle type not supported");
  }
}

export class NoSuchParticipantError extends Error {
    constructor(message?: string) {
        super(message||"No such participant");
    }
}

export class UnableToGetParticipantError extends Error {
    constructor(message?: string) {
        super(message||"Unable to get participant");
    }
}
export class UnableToInitOracleProvider extends Error {
    constructor(message?: string) {
        super(message || "Unable to initialize the oracle provider");
    }
}
export class UnableToGetOracleError extends Error {
    constructor(message?: string) {
        super(message || 'Unable to get oracle');
    }
}   
export class OracleAlreadyRegisteredError extends Error {
    constructor(message?:string) {
        super(message || 'Oracle already registered');
    }
}
export class UnableToRegisterOracleError extends Error {
    constructor(message?:string) {
        super(message || 'Unable to register oracle');
    }
}
export class UnableToDeleteOracleError extends Error {
    constructor(message?:string) {
        super(message || 'Unable to delete oracle');
    }

}
export class LocalCacheError extends Error {
    constructor(message?: string) {
        super(message || 'Unable to get local cache');
    }
}
export class UnableToCloseDatabaseConnectionError extends Error{
    constructor(message?: string) {
        super(message || 'Unable to close database connection');
    }
}

export class UnableToInitOracleFinderError extends Error {
    constructor(message?: string) {
        super(message || 'Unable to initialize oracle finder');
    }
}

export class UnableToDeleteParticipantAssociationError extends Error {
    constructor(message?: string) {
        super(message || 'Unable to delete participant association');
    }
}

export class UnableToStoreParticipantAssociationError extends Error {
    constructor(message?: string) {
        super(message || 'Unable to store participant association');
    }
}
export class ParticipantAssociationAlreadyExistsError extends Error {
    constructor(message?: string) {
        super(message || 'Participant association already exists');
    }
}

export class UnableToInitRemoteOracleProvider extends Error {
    constructor(message?: string) {
        super(message || 'Unable to initialize remote oracle provider');
    }
}

