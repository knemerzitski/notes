import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...rootConfig,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.ts?(x)'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          basePath: `${import.meta.dirname}/src`,
          zones: [
            {
              target: '!(changeset)',
              from: 'changeset/!(index.ts)',
              message: 'Import from entry point "changeset/index.ts" instead',
            },
            {
              target: '!(editor/json-text)',
              from: 'editor/json-text/!(index.ts)',
              message: 'Import from entry point "editor/json-text/index.ts" instead',
            },
          ],
        },
      ],
    },
  },
];
