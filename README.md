# account-lookup-bc
**EXPERIMENTAL** vNext Account Lookup Bounded Context

# Install
1. Install `npm`

# Build

Run:
```shell
npm install
```
Then:
```shell
npm run build
```

# Run Unit Tests

```shell
npm run test:unit
```

# Run Integration Tests

```shell
npm run test:integration
```

Make sure you have the following services up and running (available in platform-shared-tools docker-compose files):

- infra
    - mongo
    - kafka
    - zoo

- cross-cutting
	- authentication-svc
	- authorization-svc
	- identity-svc
	- platform-configuration-svc
- apps
	- participants-svc


# Collect coverage (from both unit and integration test types)

After running the unit and/or integration tests:

```shell
npm run posttest
```

You can then consult the html report in:

```shell
coverage/lcov-report/index.html
```

# Run all tests at once
Requires integration tests pre-requisites
```shell
npm run test
```
