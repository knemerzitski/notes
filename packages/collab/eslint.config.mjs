import path from 'node:path';

import globals from 'globals';

import {
  tsConfigIncludeFromPackagesDir,
  dirnameFromPackagesDir,
} from '../utils/src/eslint/package-import.mjs';

import rootConfig from '../../eslint.config.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...rootConfig,
  {
    ignores: ['coverage'],
  },
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
              target: ['./**'],
              // Outside this package
              from: '../..',
              // Relative to ${PROJECT_DIR}/packages
              except: [
                path.join(dirnameFromPackagesDir(import.meta.dirname), 'node_modules'),
                ...tsConfigIncludeFromPackagesDir(
                  path.join(import.meta.dirname, 'tsconfig.json')
                ),
              ],
              message:
                'Cannot import from a package that is not included in tsconfig.json',
            },
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
