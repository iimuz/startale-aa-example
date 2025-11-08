module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.integration.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
        },
      },
    ],
  },
  silent: true,
  testTimeout: 30000,
};

// Set NODE_ENV to 'test' to prevent server startup during tests
process.env.NODE_ENV = 'test';
