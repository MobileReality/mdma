// Metro config for a pnpm monorepo: watch the workspace root, resolve modules
// from both the app and the root, and honor the workspace packages' `exports`
// maps (spec/runtime/renderer-react-native all publish via `exports` → dist).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// The workspace packages ship ESM via the `exports` field; let Metro read it.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_enableSymlinks = true;

// Force a single copy of react / react-native. pnpm installs a second
// react-native (0.76.x) under renderer-react-native's devDeps; if Metro
// resolves the renderer's `import 'react-native'` to that copy, the app ends up
// with two React Native runtimes and crashes at startup with
// "TurboModuleRegistry.getEnforcing('PlatformConstants') could not be found".
// Overriding the origin to the app root makes hierarchical resolution always
// find the app's copy for these packages (bare specifier and subpaths).
const FORCE_FROM_APP_ROOT = new Set(['react', 'react-native']);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const base = moduleName.split('/')[0];
  if (FORCE_FROM_APP_ROOT.has(base)) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'index.ts') },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
