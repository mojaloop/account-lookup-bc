/*****
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

* Arg Software
- José Antunes <jose.antunes@arg.software>
- Rui Rocha <rui.rocha@arg.software>
*****/

"use strict";

export enum AccountLookupPrivileges {
    VIEW_ALL_ORACLES = "ACCOUNT_LOOKUP_VIEW_ALL_ORACLES",
    CREATE_ORACLE = "ACCOUNT_LOOKUP_CREATE_ORACLE",
    REMOVE_ORACLE = "ACCOUNT_LOOKUP_REMOVE_ORACLE",
    VIEW_ALL_ORACLE_ASSOCIATIONS = "ACCOUNT_LOOKUP_VIEW_ALL_ORACLE_ASSOCIATIONS"
}

export const AccountLookupPrivilegesDefinition = [
    {
        privId: AccountLookupPrivileges.VIEW_ALL_ORACLES,
        labelName: "View All Oracles",
        description: "Allows for the retrieval of any oracles"
    },
    {
        privId: AccountLookupPrivileges.CREATE_ORACLE,
        labelName: "Register new Oracles in the system",
        description: "Allows for the creation of an oracle"
    },
    {
        privId: AccountLookupPrivileges.REMOVE_ORACLE,
        labelName: "Remove existing Oracles from the system",
        description: "Allows for the removal of an oracle"
    },
    {
        privId: AccountLookupPrivileges.VIEW_ALL_ORACLE_ASSOCIATIONS,
        labelName: "View All Oracle Associations",
        description: "Allows for the retrieval of any oracle association"
    }
];


