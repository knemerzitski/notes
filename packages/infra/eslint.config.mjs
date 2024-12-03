import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...rootConfig,
  {
    ignores: ['cdk.out', 'scripts'],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
];
