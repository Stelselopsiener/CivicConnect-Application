/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    'requestLifecycle.test.js',
    'requestRules.test.js',
    'validation.test.js',
    'gateway.test.js'
  ],
};

export default config;