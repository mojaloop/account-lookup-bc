# Account Lookup Bounded Context - Account Lookup HTTP Oracle Service

## Install 

See notes in [Installing and Building](#)

More information on how to install NVM: https://github.com/nvm-sh/nvm

## Build

```bash
npm run build
```

## Run this service

Anywhere in the repo structure:

```bash
npm run packages/http-oracle-svc start
```

## Auto build (watch)

```bash
npm run watch
```

## Unit Tests

```bash
npm run test:unit
```

## Integration Tests

```bash
npm run test:integration
```

## Configuration 

### Environment variables

| Environment Variable | Description    | Example Values         |
|---------------------|-----------------|-----------------------------------------|
| LOG_LEVEL            | Logging level for the application                  | LogLevel.DEBUG |
| REMOTE_ORACLE_PORT | Port No of the remote oracle |  3031 | 
| ORACLE_DB_FILE_PATH | File path of oracle db | "/app/data/db.json" |
