const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const config = getDefaultConfig(__dirname);

// Allow Metro to resolve imports from /model (outside the app directory)
config.watchFolders = [repoRoot];

// Limit Metro workers — Windows kills them when memory runs out
config.maxWorkers = 2;

// Block deep Firebase/native subdirectories that Metro doesn't need to watch
// These cause Windows file watcher exhaustion and OOM crashes
config.resolver.blockList = [
  /node_modules\/firebase\/.*\/cordova\/.*/,
  /node_modules\/firebase\/.*\/react-native\/.*/,
  /node_modules\/firebase\/.*\/node\/.*/,
  /node_modules\/@firebase\/.*\/dist\/compat\/.*/,
  /node_modules\/hermes-parser\/.*/,
  /node_modules\/hermes-estree\/.*/,
];

// Disable file hashing for node_modules to reduce memory usage
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: false,
    mangle: false,
  },
};

module.exports = config;
