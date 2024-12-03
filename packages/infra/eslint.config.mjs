import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...rootConfig,
  {
    ignores: ['cdk.out', 'scripts', 'out', 'lib/cloudfront-functions/viewer-request.ts'],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
];
