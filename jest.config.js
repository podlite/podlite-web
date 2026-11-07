const path = require('path')
module.exports = {
  moduleNameMapper: {
    '^mermaid$': path.resolve(__dirname, 'jest-mermaid-stub.js'),
  },
  moduleDirectories: ['node_modules'],
  modulePaths: ['<rootDir>'],
  snapshotSerializers: ['jest-serializer-html'],
  transform: {
    // marked, which @podlite/schema reads Markdown headings with, is published as ES modules
    // only; the Babel preset Next ships turns it into CommonJS for the tests
    '[/\\\\]node_modules[/\\\\]marked[/\\\\].+\\.js$': ['babel-jest', { presets: ['next/babel'] }],
    '\\.(t|j)sx?$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/jest.tsconfig.json',
    },
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\](?!entity-decode/|marked/).+\\.js$'],
}
