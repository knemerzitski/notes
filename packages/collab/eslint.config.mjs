import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
          basePath: `${__dirname}/src`,
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
