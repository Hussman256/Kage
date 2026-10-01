// Polyfills Privy and viem need on React Native — must load before anything else.
import "fast-text-encoding";
import "react-native-get-random-values";
import "@ethersproject/shims";
// Then the app itself.
import "expo-router/entry";
