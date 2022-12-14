import { AccountLookupAggregate } from "@mojaloop/account-lookup-bc-domain";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import express from "express";
import { validationResult } from "express-validator";

export abstract class BaseRoutes {

    private readonly _mainRouter: express.Router;
    private readonly _logger: ILogger;
    private readonly _accountLookupAggregate: AccountLookupAggregate;
     
    constructor(logger: ILogger, accountLookupAggregate: AccountLookupAggregate) {
        this._mainRouter = express.Router();
        this._logger = logger;
        this._accountLookupAggregate = accountLookupAggregate;
    }

    public get logger(): ILogger {
        return this._logger;
    }
   
    get mainRouter(): express.Router {
        return this._mainRouter;
    }

    get accountLookupAggregate(): AccountLookupAggregate {
        return this._accountLookupAggregate;
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