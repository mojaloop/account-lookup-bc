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

import nock from "nock";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";

export class RemoteOracleProviderHttpMock {
  // Properties received through the constructor.
  private readonly logger: ILogger;
  private readonly BASE_URL: string;

  constructor(logger: ILogger, baseUrl: string) {
    this.logger = logger;
    this.BASE_URL = baseUrl;
  }

  public setUp(): void {
    nock(this.BASE_URL)
      .persist()

      .get(`/participants/partyTypeNotFound/partyId/?partySubType=partySubType&currency=USD`)
      .reply(404, "Participant not found")

      .get("/participants/partyType/partyId")
      .reply(200, {
        fspId: "fspIdSuccess",
      })

      .post(`/participants/partyTypeNoAssociation/partyId/?partySubType=partySubType&currency=USD`, { fspId: "fspId" })
      .reply(500, "Couldn't associate participant")

      .post(`/participants/partyTypeAssociation/partyId`, { fspId: "fspId" })
      .reply(200, {})

      .delete(`/participants/partyTypeNoDisassociation/partyId`, { fspId: "fspId" })
      .reply(500, "Couldn't disassociate participant")

      .delete(`/participants/partyTypeDisassociation/partyId`, { fspId: "fspId" })
      .reply(200, {})

      .get("/participants/associations")
      .reply(200, [
        {
          fspId: "fspIdSuccess",
          partyType: "partyType",
          partyId: "partyId",
          partySubType: "partySubType",
          currency: "USD",
        },
      ])

      .get(`/health`)
      .reply(200, {});
  }

  public disable(): void {
    nock.restore();
  }

  public enable(): void {
    nock.activate();
  }
}
