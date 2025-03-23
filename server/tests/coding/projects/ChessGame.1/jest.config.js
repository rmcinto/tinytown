/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: "jest-environment-jsdom",
  transform: {
    "^.+\.tsx?$": ["ts-jest",{}],
  },
};