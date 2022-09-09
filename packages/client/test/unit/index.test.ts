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

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {ParticipantHttpServiceMock} from "./mock/participant_http_service_mock";
import {IParticipantDTO, ParticipantHttpClient} from "../../participants/src";


const BASE_URL_ACCOUNT_LOOKUP_HTTP_SERVICE: string = "http://localhost:1234";
const TIMEOUT_MS_ACCOUNT_LOOKUP_HTTP_CLIENT: number = 5000;

let participantHttpServiceMock: ParticipantHttpServiceMock;
let participantHttpClient: ParticipantHttpClient;

describe("account lookup client library - unit tests", () => {
	beforeAll(async () => {
		const logger: ILogger = new ConsoleLogger();
		participantHttpServiceMock = new ParticipantHttpServiceMock(
			logger,
			BASE_URL_ACCOUNT_LOOKUP_HTTP_SERVICE
		);
		participantHttpClient = new ParticipantHttpClient(
			logger,
			BASE_URL_ACCOUNT_LOOKUP_HTTP_SERVICE,
			TIMEOUT_MS_ACCOUNT_LOOKUP_HTTP_CLIENT
		);
	});

	// Get participant.
	test("get non-existing participant", async () => {
		const participantId: string = ParticipantHttpServiceMock.NON_EXISTENT_PARTICIPANT_PARTY_ID;
		const participantType: string = ParticipantHttpServiceMock.NON_EXISTENT_PARTICIPANT_PARTY_ID;
		const participant: IParticipantDTO = {
			id: participantId,
			timestamp: 0
		};
		const partyIdReceived =
			await participantHttpClient.getParticipantInfo(participantId);
		expect(partyIdReceived).toEqual(participantId);
	});
});
