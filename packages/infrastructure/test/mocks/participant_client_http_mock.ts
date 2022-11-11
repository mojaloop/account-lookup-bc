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
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

export class ParticipantClientHttpMock {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly BASE_URL: string;
	// Other properties.
	public static readonly NON_EXISTING_PARTICIPANT_ID: string = "non-existing-participant-id";
	public static readonly EXISTING_PARTICIPANT_ID: string = "existing-participant-id";
	public static readonly participant = {id:1, name:"Test", currency:"USD", isActive:true, createdDate:"2019-01-01T00:00:00.000Z", modifiedDate:"2019-01-01T00:00:00.000Z"};
	

	constructor(
		logger: ILogger,
		baseUrl: string
	) {
		this.logger = logger;
		this.BASE_URL = baseUrl;
	}

	public setUp(): void {
		// Get participant.
		nock(this.BASE_URL)
			.persist()
			.get("/participants")
			.query({ fspId: ParticipantClientHttpMock.NON_EXISTING_PARTICIPANT_ID })
			.reply(404,"Participant not found");
		nock(this.BASE_URL)
			.persist()
			.get("/participants")
			.query({ fspId: ParticipantClientHttpMock.EXISTING_PARTICIPANT_ID })
			.reply(200, ParticipantClientHttpMock.participant);
		
	}

	public disable(): void {
		nock.restore();
	}

	public enable(): void {
		nock.activate();
	}
}