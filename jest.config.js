module.exports = {
    moduleDirectories: [
      'node_modules'
    ],
    "snapshotSerializers": [
        "jest-serializer-html"
     ],
    transform: {
      "\\.(t|j)sx?$": "ts-jest",
    },
    globals: {
      "ts-jest": {
        "tsconfig": '<rootDir>/jest.tsconfig.json'
      }
    },
    transformIgnorePatterns: [
        "[/\\\\]node_modules[/\\\\](?!entity-decode/).+\\.js$"
      ],
  }