// React Native / Expo-style file skeleton builder for the AI Factory
// 'mobile-template' product type (SDD Phase 5 §8.3). Static-file output
// only — no build/compile step at generation time, and no new
// dependency is installed or required by this repo. `package.json`
// lists conventional Expo/React Native dependency names as descriptive
// placeholders for the buyer to install themselves.

function toPascalCase(str) {
  const cleaned = String(str || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return cleaned || 'Screen';
}

function buildMobileTemplateBundle(config = {}) {
  const mobile = config.mobile || {};
  const appName = mobile.app_name || config.name || 'Untitled App';
  const slug = config.slug || 'untitled-app';
  const rawScreens = Array.isArray(mobile.screens) ? mobile.screens : [];
  const navigationType = mobile.navigation_type === 'tabs' ? 'tabs' : 'stack';

  const seenNames = new Set();
  const screens = rawScreens.map(s => {
    let pascal = toPascalCase(s.name);
    if (!/Screen$/.test(pascal)) pascal = `${pascal}Screen`;
    while (seenNames.has(pascal)) pascal = pascal.replace(/Screen$/, 'Screen2');
    seenNames.add(pascal);
    return { pascal, description: s.description || '' };
  });
  if (screens.length === 0) {
    screens.push({ pascal: 'HomeScreen', description: '' });
  }

  const files = {};

  for (const s of screens) {
    files[`screens/${s.pascal}.js`] = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ${s.description || 'Screen stub — replace with real content.'}
export default function ${s.pascal}() {
  return (
    <View style={styles.container}>
      <Text>${s.pascal}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
`;
  }

  const navigatorImport = navigationType === 'tabs'
    ? "import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';"
    : "import { createNativeStackNavigator } from '@react-navigation/native-stack';";
  const navigatorFactory = navigationType === 'tabs' ? 'createBottomTabNavigator' : 'createNativeStackNavigator';
  const navigatorVar = navigationType === 'tabs' ? 'Tab' : 'Stack';

  const screenImports = screens
    .map(s => `import ${s.pascal} from '../screens/${s.pascal}';`)
    .join('\n');
  const screenEntries = screens
    .map(s => `      <${navigatorVar}.Screen name="${s.pascal.replace(/Screen$/, '')}" component={${s.pascal}} />`)
    .join('\n');

  files['navigation/AppNavigator.js'] = `// Illustrative ${navigationType} navigation config.
// Requires '@react-navigation/native' + '@react-navigation/${navigationType === 'tabs' ? 'bottom-tabs' : 'native-stack'}'
// (see package.json) — not installed by this bundle, see README.md.
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
${navigatorImport}
${screenImports}

const ${navigatorVar} = ${navigatorFactory}();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <${navigatorVar}.Navigator>
${screenEntries}
      </${navigatorVar}.Navigator>
    </NavigationContainer>
  );
}
`;

  files['App.js'] = `import React from 'react';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return <AppNavigator />;
}
`;

  files['app.json'] = JSON.stringify({
    expo: {
      name: appName,
      slug,
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      updates: { fallbackToCacheTimeout: 0 },
      assetBundlePatterns: ['**/*'],
      ios: { supportsTablet: true },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
      },
    },
  }, null, 2) + '\n';

  files['package.json'] = JSON.stringify({
    name: slug,
    version: '1.0.0',
    main: 'node_modules/expo/AppEntry.js',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
    },
    dependencies: {
      expo: '~51.0.0',
      react: '18.2.0',
      'react-native': '0.74.0',
      '@react-navigation/native': '^6.0.0',
      [navigationType === 'tabs' ? '@react-navigation/bottom-tabs' : '@react-navigation/native-stack']: '^6.0.0',
    },
  }, null, 2) + '\n';

  const screenList = screens.length
    ? screens.map(s => `- \`screens/${s.pascal}.js\` — ${s.description || 'stub screen'}`).join('\n')
    : '_No screens configured._';

  files['README.md'] = `# ${appName}

${config.description || ''}

## What's in this bundle

This is a static file skeleton, not a built/compiled app — there is no
build step at generation time and no dependency has been installed.

- \`App.js\` — entry point, renders the navigator.
- \`navigation/AppNavigator.js\` — ${navigationType === 'tabs' ? 'bottom tab' : 'stack'} navigation config.
- \`app.json\` — Expo project config.
- \`package.json\` — dependency list (versions are placeholders for you to install).

## Screens

${screenList}

## Setup

1. Create a fresh Expo project: \`npx create-expo-app ${slug}\`.
2. Copy \`App.js\`, \`navigation/\`, and \`screens/\` into the new project,
   overwriting the generated defaults.
3. Merge the \`expo\` block from this bundle's \`app.json\` into your
   project's \`app.json\`.
4. Install the navigation dependencies listed in this bundle's
   \`package.json\`: \`npx expo install @react-navigation/native @react-navigation/${navigationType === 'tabs' ? 'bottom-tabs' : 'native-stack'} react-native-screens react-native-safe-area-context\`.
5. Run \`npx expo start\`.
`;

  return files;
}

module.exports = { buildMobileTemplateBundle };
