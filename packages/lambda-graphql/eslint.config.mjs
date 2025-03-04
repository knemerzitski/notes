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
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['**/*.ts?(x)'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
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
          ],
        },
      ],
    },
  },
];
