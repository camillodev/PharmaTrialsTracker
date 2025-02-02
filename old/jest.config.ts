import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.{js,ts}', '!**/node_modules/**'],
};

export default config;
