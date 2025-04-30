module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/ai/__tests__'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
};
