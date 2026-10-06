const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/components/Model*.tsx'],
    rules: {
      'react/no-unknown-property': [
        'warn',
        { ignore: ['args', 'attach', 'decay', 'dispose', 'geometry', 'intensity', 'material', 'position'] },
      ],
    },
  },
]);
