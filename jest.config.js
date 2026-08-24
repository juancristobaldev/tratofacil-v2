module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|@react-navigation|@gorhom/bottom-sheet|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-geolocation-service|lucide-react-native|supercluster|kdbush|@shopify/flash-list)/',
  ],
  moduleNameMapper: {
    '^react-native-config$': '<rootDir>/jest/react-native-config.mock.js',
    '^react-native-maps$': '<rootDir>/jest/react-native-maps.mock.js',
  },
};
