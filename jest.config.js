"use strict"

module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["<rootDir>/test/integration/**/*.test.ts"],
	passWithNoTests: true,
	collectCoverage: true,
	collectCoverageFrom: [
		"**/src/**/*.ts",
		"!**/src/**/index.ts",
		"!**/shared-mocks-lib/**/*",
	],
	coverageReporters: ["text", ["json", {file: "integration-final.json"}]],
	coverageDirectory: "./coverage/",
	clearMocks: true,
	coverageThreshold: {
		"global": {
			"branches": 90,
			"functions": 90,
			"lines": 90,
			"statements": -10
		}
	},
	moduleNameMapper: {
		"@mojaloop/account-lookup-bc-implementations-lib": "<rootDir>/packages/implementations-lib/src",
		"@mojaloop/account-lookup-bc-domain-lib": "<rootDir>/packages/domain-lib/src",
		"@mojaloop/account-lookup-bc-account-lookup-svc": "<rootDir>/packages/account-lookup-svc/src",
	}

}
