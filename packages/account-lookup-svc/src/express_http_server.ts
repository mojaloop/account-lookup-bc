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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {ExpressRoutes} from "./express_routes";
import express from "express";
import http from "http";

export class ExpressHttpServer {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly HOST: string;
	private readonly PORT_NO: number;
	private readonly PATH_ROUTER: string;
	// Other properties.
	private readonly BASE_URL: string;
	private readonly app: express.Express;
	private readonly routes: ExpressRoutes;
	private server: http.Server;

	constructor(
		logger: ILogger,
		host: string,
		portNo: number,
		pathRouter: string,
	) {
		this.logger = logger;
		this.HOST = host;
		this.PORT_NO = portNo;
		this.PATH_ROUTER = pathRouter;

		this.BASE_URL = `http://${this.HOST}:${this.PORT_NO}`;
		this.app = express();
		this.routes = new ExpressRoutes(
			logger,
		);

		this.configure();
	}

	private configure() {
		this.app.use(express.json()); // For parsing application/json.
		this.app.use(express.urlencoded({extended: true})); // For parsing application/x-www-form-urlencoded.
		this.app.use(this.PATH_ROUTER, this.routes.router);
	}

	public init(): void {
		try {
			this.server = this.app.listen(this.PORT_NO, () => {
				this.logger.info("Server on 🚀");
				this.logger.info(`Host: ${this.HOST}`);
				this.logger.info(`Port: ${this.PORT_NO}`);
				this.logger.info(`Base URL: ${this.BASE_URL}`);
			});
		} catch (e: unknown) {
			this.logger.fatal(e);
			throw e;
		}
	}

	public destroy(): void {
		this.server.close();
	}
}
