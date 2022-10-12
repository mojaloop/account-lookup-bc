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

// Party
export class InvalidPartyIdError extends Error {
    constructor(message?: string) {
        super(message || "Invalid party id");
    }
}
export class InvalidPartyTypeError extends Error {
    constructor(message?: string) {
        super(message || "Invalid party type");
    }
}

// Participant
export class InvalidParticipantIdError extends Error {
    constructor(message?: string) {
        super(message || "Invalid participant id");
    }
}

export class InvalidParticipantTypeError extends Error {
    constructor(message?: string) {
        super(message || "Invalid participant type");
    }
}
export class InvalidParticipantActiveFlagError extends Error {
    constructor(message?: string) {
        super(message || "Invalid participant active flag");
    }
}
export class NoSuchParticipantError extends Error {
    constructor(message?: string) {
        super(message || "No such participant");
    }
}
export class NoSuchParticipantFspIdError extends Error {
    constructor(message?: string) {
        super(message || "No such participant fsp id");
    }
}

export class RequiredParticipantIsNotActive extends Error {
    constructor(message?: string) {
        super(message || "Required participant is not active");
    }
}

// Participant Association
export class UnableToAssociateParticipantError extends Error {
    constructor(message?: string) {
        super(message || "Unable to associate participant");
    }
}

// Participant Dissociation  
export class UnableToDisassociateParticipantError extends Error {
    constructor(message?: string) {
        super(message || "Unable to disassociate participant");
    }
}

// Oracle
export class NoSuchOracleAdapterError extends Error {
    constructor(message?: string) {
        super(message || "No such oracle adapter");
    }
}
export class UnableToAddOracleError extends Error {
    constructor(message?: string) {
        super(message || "Unable to add oracle");
    }
}
export class NoSuchOracleError extends Error {
    constructor(message?: string) {
        super(message || "No such oracle");
    }
}

// Message Producer
export class InvalidMessagePayloadError extends Error {
    constructor(message?: string) {
        super(message || "Invalid message payload");
    }
}
export class InvalidMessageTypeError extends Error {
    constructor(message?: string) {
        super(message || "Invalid message type");
    }
}
export class UnableToProcessMessageError extends Error {
    constructor(message?: string) {
        super(message || "Unable to process message");
    }
}


