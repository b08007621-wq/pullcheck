const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const threeEntry = path.join(__dirname, 'node_modules', 'three', 'build', 'three.module.js');
const resolveDefault = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') return { type: 'sourceFile', filePath: threeEntry };
  if (resolveDefault) return resolveDefault(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
