module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-config$': '<rootDir>/jest/react-native-config.mock.js',
  },
};
