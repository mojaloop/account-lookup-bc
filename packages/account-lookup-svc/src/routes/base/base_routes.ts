import { CallSecurityContext, ForbiddenError, IAuthorizationClient, UnauthorizedError } from "@mojaloop/security-bc-public-types-lib";

import { AccountLookupAggregate } from "@mojaloop/account-lookup-bc-domain-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { TokenHelper } from "@mojaloop/security-bc-client-lib";
import express from "express";
import { validationResult } from "express-validator";

declare module "express-serve-static-core" {
    export interface Request {
        securityContext: null | CallSecurityContext;
    }
}

export abstract class BaseRoutes {

    private readonly _mainRouter: express.Router;
    private readonly _logger: ILogger;
    private readonly _tokenHelper: TokenHelper;
    private readonly _accountLookupAggregate: AccountLookupAggregate;
    private readonly _authorizationClient: IAuthorizationClient;

    constructor(accountLookupAggregate: AccountLookupAggregate, authorizationClient: IAuthorizationClient, logger: ILogger,tokenHelper: TokenHelper) {
        this._accountLookupAggregate = accountLookupAggregate;
        this._logger = logger;
        this._mainRouter = express.Router();
        this._tokenHelper = tokenHelper;
        this._authorizationClient = authorizationClient;
        this._mainRouter.use(this._authenticationMiddleware.bind(this));
    }

    public get logger(): ILogger {
        return this._logger;
    }

    private async _authenticationMiddleware(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        const authorizationHeader = req.headers["authorization"];

        if (!authorizationHeader)
        {
            return res.sendStatus(401);
        }

        const bearer = authorizationHeader.trim().split(" ");
        if (bearer.length != 2) {
            return res.sendStatus(401);
        }

        const bearerToken = bearer[1];
        let verified;
        try {
            verified = await this._tokenHelper.verifyToken(bearerToken);
        } catch (err) {
            this._logger.error(err, "unable to verify token");
            return res.sendStatus(401);
        }
        if (!verified) {
            return res.sendStatus(401);
        }

        const decoded = this._tokenHelper.decodeToken(bearerToken);
        if (!decoded.sub || decoded.sub.indexOf("::") == -1) {
            return res.sendStatus(401);
        }

        const subSplit = decoded.sub.split("::");
        const subjectType = subSplit[0];
        const subject = subSplit[1];

        req.securityContext = {
            accessToken: bearerToken,
            clientId: subjectType.toUpperCase().startsWith("APP") ? subject : null,
            username: subjectType.toUpperCase().startsWith("USER") ? subject : null,
            rolesIds: decoded.roles,
        };

        return next();
    }

    protected handleUnauthorizedError(err: Error, res: express.Response): boolean {
        if (err instanceof UnauthorizedError) {
            this._logger.warn(err.message);
            res.status(401).json({
                status: "error",
                msg: err.message,
            });
            return true;
        } else if (err instanceof ForbiddenError) {
            this._logger.warn(err.message);
            res.status(403).json({
                status: "error",
                msg: err.message,
            });
            return true;
        }

        return false;
    }

    protected enforcePrivilege(secCtx: CallSecurityContext, privilegeId: string): void {
        for (const roleId of secCtx.rolesIds) {
            if (this._authorizationClient.roleHasPrivilege(roleId, privilegeId)) {
                return;
            }
        }
        const error = new ForbiddenError("Caller is missing role with privilegeId: " + privilegeId);
        this._logger.isWarnEnabled() && this._logger.warn(error.message);
        throw error;
    }


    get mainRouter(): express.Router {
        return this._mainRouter;
    }

    get accountLookupAggregate(): AccountLookupAggregate {
        return this._accountLookupAggregate;
    }

    public validateRequest(req: express.Request, res: express.Response) : boolean {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() });
            return false;
        }
        return true;
    }
}