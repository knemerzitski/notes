import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...rootConfig,
  {
    ignores: ['out-handlers'],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
];
