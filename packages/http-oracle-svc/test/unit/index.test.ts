/// <reference lib="dom" />
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

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";
import fs from "fs";
import {randomUUID} from "crypto";
import {Service} from "../../src/service";

const partyType:string = "bank";
const partyId:string = randomUUID();
const fspId:string = "12";
const url:string = `http://localhost:3031/participants/${partyType}/${partyId}?currency=UGX`;
// jest.setTimeout(600000)

const filePath = process.env["ORACLE_DB_FILE_PATH"];
const defaultHeaders = new Headers();
defaultHeaders.append("Content-Type", "application/json");


describe("http-oracle-svc unit tests", () => {
	beforeAll(async () => {
		if(filePath && fs.existsSync(filePath)){
			/**  delete the db.json to start the server with no db.json **/
			// Arrange
			fs.unlinkSync(filePath);

			// Act
			const result = Service.start();

			// Assert
			await expect(result).resolves
			await Service.stop();

			/**  populate some data in the db.json to start the server with some data in the db.json **/

			// Arrange
			fs.writeFileSync(
				filePath,
				`{"associations": [{"partyId": "0b09ab3a-9a96-4f28-9672-1c9e4516a3fb","partyType": "bank","currency": "EUR","fspId": "12"},{"partyId": "0b09ab3a-9a96-4f28-9672-1c9e4516a3fb","partyType": "bank","currency": "EUR","fspId": "12"}]}`
			);

			// Act
			await Service.start();

			/**  populate empty data in the db.json to start the server with no data in the db.json **/
			fs.writeFileSync(filePath,``);
			await Service.stop();
		}
		await Service.start();
	});

	afterAll(async () => {
		// await Service.stop();
	});

	/* Happy path tests */
	test("should return 200 when creating a new oracle record", async () => {
		// Arrange
		const reqInit: RequestInit = {
			method: "POST",
			headers: defaultHeaders,
			body: JSON.stringify({"fspId":fspId})
		};

		// Act
		const response = await fetch(url,reqInit);

		// Assert
		expect(response.status).toEqual(200);
	});

	test("should return 200 when creating a new oracle record with no currency", async () => {
		// Arrange
		const reqInit: RequestInit = {
			method: "POST",
			headers: defaultHeaders,
			body: JSON.stringify({"fspId":fspId})
		};

		// Act
		const response = await fetch(`http://localhost:3031/participants/${partyType}/${partyId}`,reqInit);

		// Assert
		expect(response.status).toEqual(200);
	});

	test("should return 500 when creating an oracle record that already exists", async () => {
		// Arrange
		const reqInit: RequestInit = {
			method: "POST",
			headers: defaultHeaders,
			body: JSON.stringify({"fspId":fspId})
		};

		// Act
		const response = await fetch(url,reqInit);

		// Assert
		expect(response.status).toEqual(500);
	});

	test("should return fspId when getting an oracle record that exists", async () => {
		// Arrange
		const reqInit: RequestInit = {
			method: "GET",
		};

		//Act
		const response = await fetch(url,reqInit);
		const data = await response.json();

		//Assert
		expect(data).toEqual({'fspId':'12'});
	});

	test("should return 200 when deleting an oracle record", async ()=>{
		// Arrange
		const reqlInit: RequestInit = {
			method:"DELETE",
			headers:defaultHeaders,
			body: JSON.stringify({"fspId":fspId})
		};

		//Act
		const response  = await fetch(url,reqlInit);

		//Assert
		expect(response.status).toEqual(200)
	});

	test("should return 500 when deleting an oracle that doesn't exist",async ()=>{
		// Arrange
		const reqlInit: RequestInit = {
			method:"DELETE",
			headers:defaultHeaders,
			body: JSON.stringify({"fspId":fspId})
		};

		//Act
		const response  = await fetch(url,reqlInit);

		//Assert
		expect(response.status).toEqual(500);
	});

	test("should return true when getting server health",async ()=>{
		// Arrange
		const reqInit: RequestInit = {
			method:'GET'
		};

		// Act
		const response = await fetch("http://localhost:3031/health",reqInit);
		const data = await response.json();

		// Assert
		expect(data).toBeTruthy();
	})

	/* Non-Happy path tests */
	test("should return 422 when creating an oracle with a missing fspId",async ()=>{
		//Arrange
		const reqInit: RequestInit = {
			method: "POST",
			headers: defaultHeaders,
		};

		//Act
		const response = await fetch(url,reqInit);

		//Assert
		expect(response.status).toEqual(422);
	});

	test("should return 422 when deleting an oracle record with missing fspId", async ()=>{
		// Arrange
		const reqInit: RequestInit = {
			method:"DELETE",
			headers: defaultHeaders
		};

		// Act
		const response = await fetch(url,reqInit);

		// Assert
		expect(response.status).toEqual(422);
	});

	test("should return 404 when getting an oracle record with non existent partyId", async () => {
		// Arrange
		const reqInit: RequestInit = {
			method:"GET"
		};

		// Act
		const response = await fetch(`http://localhost:3031/participants/${partyType}/393990034?currency=UGX`,reqInit);

		// Assert
		expect(response.status).toEqual(404);
	});

	test("return 404 when requesting an endpoint that does not exist", async () => {
		// Arrange
		const reqInit: RequestInit = {
			method:"GET"
		};

		// Act
		const response = await fetch(`http://localhost:3031/fakeEndpoint`,reqInit);

		// Assert
		expect(response.status).toEqual(404);
	});

	test("Stop the server to prepare for the next test that starts the server", async ()=>{
		await Service.stop();
	});

	test("should throw an error db.json exists with wrong content when starting the server with a db.json that has a wrong format", async () => {
		// Arrange
		if(!filePath){
			throw new Error("ORACLE_DB_FILE_PATH was not set");
		}
		fs.unlinkSync(filePath);
		console.log("File deleted");

		// create same file with wrong structure
		fs.writeFileSync(filePath, "wrong content");

		// Act
		const result = Service.start();

		// Assert
		await expect(result).rejects.toThrowError();
	});

	test("should throw an error when trying to a stop server that is not running", async () => {
		// Act
		const result = Service.stop();

		// Assert
		await expect(result).rejects.toThrowError();
	});
});
