'use strict'

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['./test/integration/**/*.ts'],
  coverageReporters: ['json', 'lcov'],
  clearMocks: true
}
