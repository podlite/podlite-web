const path = require('path')
module.exports = {
  moduleNameMapper: {
    '^mermaid$': path.resolve(__dirname, 'jest-mermaid-stub.js'),
  },
  moduleDirectories: ['node_modules'],
  modulePaths: ['<rootDir>'],
  snapshotSerializers: ['jest-serializer-html'],
  transform: {
    '\\.(t|j)sx?$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/jest.tsconfig.json',
    },
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\](?!entity-decode/).+\\.js$'],
}
