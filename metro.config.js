const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const os = require('os');

const config = {
  transformer: {
    minifierConfig: {
      parallel: true,
    },
  },
  maxWorkers: Math.max(1, os.cpus().length - 1),
  cacheVersion: '1.0',
  resetCache: false,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
