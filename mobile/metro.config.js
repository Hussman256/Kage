// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Package-exports workarounds from Privy's Expo setup guide
// (https://docs.privy.io/basics/react-native/installation). RN 0.79+ enables
// package exports by default, and these packages don't resolve correctly with it.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // `isows` (a viem dependency)
  if (moduleName === "isows") {
    return context.resolveRequest({ ...context, unstable_enablePackageExports: false }, moduleName, platform);
  }
  // zustand@4
  if (moduleName.startsWith("zustand")) {
    return context.resolveRequest({ ...context, unstable_enablePackageExports: false }, moduleName, platform);
  }
  // `jose`: use the browser build
  if (moduleName === "jose") {
    return context.resolveRequest({ ...context, unstable_conditionNames: ["browser"] }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
