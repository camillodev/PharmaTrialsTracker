/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: 'node', // Set the test environment to Node.js
  transform: {
    '^.+\\.tsx?$': 'ts-jest', // Use ts-jest for TypeScript files
  },
  collectCoverage: true, // Enable coverage collection
  coverageDirectory: 'coverage', // Specify the output directory for coverage reports
  collectCoverageFrom: ['src/**/*.{js,ts}', '!**/node_modules/**'], // Specify files to collect coverage from
};

module.exports = config;
