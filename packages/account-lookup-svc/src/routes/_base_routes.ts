import { ILogger } from '@mojaloop/logging-bc-public-types-lib';
import * as express from 'express';
import { validationResult } from "express-validator";

export abstract class BaseRoutes {

    private readonly _mainRouter: express.Router;
    private readonly _logger: ILogger;
     
    constructor(_logger: ILogger) {
        this._mainRouter = express.Router();
        this._logger = _logger;
    }

    public get logger(): ILogger {
        return this.logger;
    }
   
    get mainRouter(): express.Router {
        return this._mainRouter;
    }

    public validateRequest(req: express.Request, res: express.Response<any, Record<string, any>>) : boolean {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() });
            return false;
        }
        return true;
    }
}