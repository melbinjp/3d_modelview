module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    "/node_modules/(?!three)"
  ],
  moduleNameMapper: {
    '^three$': '<rootDir>/test/mocks/three.js',
    'three/examples/jsm/.*': '<rootDir>/test/mocks/three.js',
    '\\.(css|less)$': '<rootDir>/spec/styleMock.js',
    '\\.(glb|gltf|fbx|obj|dae|stl|ply)$': '<rootDir>/spec/fileMock.js',
  },
  setupFiles: ['<rootDir>/test/jest.setup.js', 'jest-canvas-mock'],
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)"
  ],
};
