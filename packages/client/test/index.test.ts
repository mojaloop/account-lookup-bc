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

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

"use strict";

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {AccountLookupHttpServiceMock} from "./account_lookup_http_service_mock";
import {AccountLookupHttpClient} from "../src";
import {
	IParticipantDTO,
} from "../src";

const BASE_URL_ACCOUNT_LOOKUP_HTTP_SERVICE: string = "http://localhost:1337";
const TIMEOUT_MS_ACCOUNT_LOOKUP_HTTP_CLIENT: number = 5000;

let accountLookupHttpServiceMock: AccountLookupHttpServiceMock;
let accountLookupHttpClient: AccountLookupHttpClient;

describe("account lookup client library - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new ConsoleLogger();
		accountLookupHttpServiceMock = new AccountLookupHttpServiceMock(
			logger,
			BASE_URL_ACCOUNT_LOOKUP_HTTP_SERVICE
		);
		accountLookupHttpClient = new AccountLookupHttpClient(
			logger,
			BASE_URL_ACCOUNT_LOOKUP_HTTP_SERVICE,
			TIMEOUT_MS_ACCOUNT_LOOKUP_HTTP_CLIENT
		);
	});

	// Get participant.
	test("get non-existing participant", async () => {
		const participantId: string = AccountLookupHttpServiceMock.NON_EXISTENT_PARTICIPANT_PARTY_ID;
		const participantType: string = AccountLookupHttpServiceMock.NON_EXISTENT_PARTICIPANT_PARTY_ID;
		const participant: IParticipantDTO = {
			id: participantId,
			timestampLastJournalEntry: 0
		};
		const accountIdReceived: string =
			await accountLookupHttpClient.getParticipant(participant,participantType);
		expect(accountIdReceived).toEqual(participantId);
	});
});
