const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const config = getDefaultConfig(__dirname);

// Allow Metro to resolve imports from /model (outside the app directory)
config.watchFolders = [repoRoot];

module.exports = config;
