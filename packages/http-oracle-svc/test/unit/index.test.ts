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
import {randomUUID} from "crypto";
import axios from "axios";

import {Service} from "../../src/service";


const partyType:string = "bank";
const partyId:string = randomUUID();
const fspId:string = "12";
const url:string = `http://localhost:3031/participants/${partyType}/${partyId}?currency=UGX`;

const sleep = (ms:number)=>{
	return new Promise(resolve => setTimeout(resolve,ms));
}

describe("application X unit tests", () => {
	beforeAll(async () => {
		await Service.start();

	});

	afterAll(async () => {
		await Service.stop();

	});

	/* Happy path tests */

	test("create test oracle record", async () => {
		// Test item goes here
		// use axios or even better, nod's builtin fetch()
		await axios.request({
			method:"post",
			url:url,
			headers: {
				'Content-Type':"application/json"
			},
			data:JSON.stringify({"fspId":fspId})
		}).then((res)=>{
			console.log(res.data)
			expect(res.status).toEqual(200)
		}).catch((err) => {
			console.log(`Error Encountered in post \n ${err}`);
		});

	});

	test("get test oracle record", async () => {
		// wait for db.json to be updated
		await sleep(3000);
		//verify that the record was created
		await axios.request({
			method:"get",
			url:url
		}).then((res)=>{
			console.log(res.data);
			expect(res.data.fspId).toEqual("12")
		}).catch((err)=>{
			console.log(`Error Encountered in get\n ${err}`);
		});
	});

	test("delete test oracle record", async ()=>{
		await axios.request({
			method:"delete",
			url:url,
			headers:{
				"Content-Type":"application/json"
			},
			data:JSON.stringify({"fspId":fspId})
		}).then((res)=>{
			console.log(res.data)
			expect(res.status).toEqual(200)
		}).catch((err)=>{
			console.log(`Error Encountered in delete\n ${err}`);
		})
	});

	test("test get health",async ()=>{
		await axios.request({
			method:"get",
			url:"http://localhost:3031/health"
		}).then((res)=>{
			console.log(res.data)
			expect(res.data).toBeTruthy()
		})
	})
	/* Non-Happy path tests */

});
