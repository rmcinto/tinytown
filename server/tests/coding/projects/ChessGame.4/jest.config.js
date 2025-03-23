module.exports = {
  preset: 'babel-jest',
  testEnvironment: 'node',
  globals: {
    'babel-jest': {
      tsconfig: './tsconfig.json',
      useESM: false
    }
  },
  transform: {
    '^.+\.(ts|tsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '\.(css|sass|scss)$': 'identity-obj-proxy'
  },
  testMatch: ["**/tests/**/*.(test|spec).(ts|tsx)"]
};
