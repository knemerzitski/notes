import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...rootConfig,
  {
    ignores: ['cdk.out', 'assert-aws-cdk.ts'],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
];
