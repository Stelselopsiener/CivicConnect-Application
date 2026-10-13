/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  roots: [
    '<rootDir>/src/backend' // 👈 Restricts Jest to backend tests only
  ],
};

export default config;