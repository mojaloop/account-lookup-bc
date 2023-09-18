/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 ******/

"use strict";

import nock from "nock";
import {
  ID_1,
  ID_2,
  FSP_ID,
  FSP_ID2,
  FSP_ID_WITH_CURRENCY_EUR,
  FSP_ID_WITH_CURRENCY_USD,
  FSP_ID_WITH_SUB_TYPE,
  PARTY_ID,
  PARTY_TYPE,
} from "./data";

export class HttpAccountLookupServiceMock {
  private readonly BASE_URL: string;
  private readonly TOKEN_URL: string;

  constructor(baseUrl: string, tokenUrl: string) {
    this.BASE_URL = baseUrl;
    this.TOKEN_URL = tokenUrl;
  }

  public setUp(): void {
    const tokenScope = nock(this.TOKEN_URL).persist().get("/").reply(200, {
      isMock: true, // indicative
      token_type: "Bearer",
      scope: null,
      access_token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1iYy11aSIsInJvbGVzIjpbIjNmMmVkOWJlLTc4MTMtNGYxYi1iYjEyLWE2NWExODViMTY5YiJdLCJpYXQiOjE2ODcyMTc2MTQsImV4cCI6MTcxODg0MDAxNCwiYXVkIjoibW9qYWxvb3Audm5leHQuZGVmYXVsdF9hdWRpZW5jZSIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzIwMS8iLCJzdWIiOiJ1c2VyOjp1c2VyIiwianRpIjoiMmI5MzIyZmQtMzNhZi00ZDJiLTk4N2UtMjQwNjlmMWM0M2ZiIn0.zpU-HoqZK5U4ExUTpBCv_HqS0z6l0YN3oKIjvwueNwc",
      expires_in: 604800,
      refresh_token: null,
      refresh_token_expires_in: null,
    });

    tokenScope.on("request", (req, interceptor) => {
      console.log("interceptor matched request", interceptor.uri);
    });

    const lookupScope = nock(this.BASE_URL)
      .persist()
      .get(`/account-lookup/${PARTY_ID}/${PARTY_TYPE}`)
      .reply(200, FSP_ID)

      .get(`/account-lookup/${PARTY_ID}/${PARTY_TYPE}`)
      .query({ currency: "EUR" })
      .reply(200, FSP_ID_WITH_CURRENCY_EUR)

      .post("/account-lookup", {
        [ID_1]: {
          partyId: PARTY_ID,
          partyType: PARTY_TYPE,
          currency: null,
        },
        [ID_2]: {
          partyId: PARTY_ID,
          partyType: PARTY_TYPE,
          currency: "USD",
        },
      })
      .reply(200, { [ID_1]: FSP_ID, [ID_2]: FSP_ID2 })

      .post("/account-lookup", {
        [ID_1]: {
          currency: null,
        },
        [ID_2]: {
          partyId: PARTY_ID,
          partyType: PARTY_TYPE,
          currency: "USD",
        },
      })
      .reply(422, "Invalid Body");

    lookupScope.on("request", (req, interceptor) => {
      console.log("interceptor matched request", interceptor.uri);
    });
  }

  public disable(): void {
    nock.restore();
  }
}
