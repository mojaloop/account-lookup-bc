# account-lookup-bc
**EXPERIMENTAL** vNext Account Lookup Bounded Context

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/account-lookup-bc.svg?style=flat)](https://github.com/mojaloop/account-lookup-bc/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/account-lookup-bc.svg?style=flat)](https://github.com/mojaloop/account-lookup-bc/releases)
[![Docker pulls](https://img.shields.io/docker/pulls/mojaloop/account-lookup-bc.svg?style=flat)](https://hub.docker.com/r/mojaloop/account-lookup-bc)
[![CircleCI](https://circleci.com/gh/mojaloop/account-lookup-bc.svg?style=svg)](https://circleci.com/gh/mojaloop/account-lookup-bc)

The Accounts Lookup BC is responsible for locating and associating participants and parties with party or participant triggered transactions. 
It implements the following usecases : 
- Participant Look-up
- Party Look-up
- Manage Participants Registry information

## Contents
- [account-lookup-bc](#account-lookup-bc)
  - [Contents](#contents)
  - [Packages](#packages)
  - [Running Locally](#running-locally)
  - [Configuration](#configuration)
  - [Logging](#logging)
  - [Tests](#tests)
  - [Auditing Dependencies](#auditing-dependencies)
  - [CI/CD](#cicd-pipelines)
  - [Documentation](#documentation)

## Packages
The Account Lookup BC consists of the following packages;

`account-lookup-svc`
Account Lookup and Discovery Service.
[README](packages/account-lookup-svc/README.md)

`client-lib`
Client library types.
[README](./packages/client-lib/README.md)

`domain-lib`
Domain library types.
[README](./packages/domain-lib/README.md)

`http-oracle-svc`
HTTP Oracle Service.
[README](./packages/http-oracle-svc/README.md)

`implementation-lib`
Account Lookup Infrastructure Library.
[README](packages/implementations-lib/README.md)

`shared-mocks-lib`
Mock implementation used for testing.
[README](./packages/shared-mocks-lib/README.md)

## Running Locally

Please follow the instruction in [Onboarding Document](Onboarding.md) to setup and run the service locally.

## Configuration

See the README.md file on each services for more Environment Variable Configuration options.

## Logging

Logs are sent to standard output by default.

## Tests

### Unit Tests

```bash
npm run test:unit
```

### Run Integration Tests

```shell
npm run test:integration
```

### Run all tests at once
Requires integration tests pre-requisites
```shell
npm run test
```

### Collect coverage (from both unit and integration test types)

After running the unit and/or integration tests:

```shell
npm run posttest
```

You can then consult the html report in:

```shell
coverage/lcov-report/index.html
```

## Auditing Dependencies
We use npm audit to check dependencies for node vulnerabilities. 

To start a new resolution process, run:
```
npm run audit:fix
``` 

You can check to see if the CI will pass based on the current dependencies with:

```
npm run audit:check
```

## CI/CD Pipelines

### Execute locally the pre-commit checks - these will be executed with every commit and in the default CI/CD pipeline 

Make sure these pass before committing any code
```
npm run pre_commit_check
```

### Work Flow 

 As part of our CI/CD process, we use CircleCI. The CircleCI workflow automates the process of publishing changed packages to the npm registry and building Docker images for select packages before publishing them to DockerHub. It also handles versioning, tagging commits, and pushing changes back to the repository.

The process includes five phases. 
1. Setup : This phase initializes the environment, loads common functions, and retrieves commits and git change history since the last successful CI build.

2. Detecting Changed Package.

3. Publishing Changed Packages to NPM.

4. Building Docker Images and Publishing to DockerHub.

5. Pushing Commits to Git.

 All code is automatically linted, built, and unit tested by CircleCI pipelines, where unit test results are kept for all runs. All libraries are automatically published to npm.js, and all Docker images are published to Docker Hub.

## Documentation
The following documentation provides insight into the Settlements Bounded Context.

- **Technical Flows** - [`../docs/flows`](docs/flows/)
- **Reference Architecture** - https://mojaloop.github.io/reference-architecture-doc/boundedContexts/accountLookupAndDiscovery/ 
- **Work Sessions** - https://docs.google.com/document/d/1Nm6B_tSR1mOM0LEzxZ9uQnGwXkruBeYB2slgYK1Kflo/edit#heading=h.6w64vxvw6er4
