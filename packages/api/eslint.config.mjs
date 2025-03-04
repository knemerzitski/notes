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
    ignores: ['src/graphql/domains/*.generated.ts', 'scripts', 'codegen.ts'],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    // Ignore filename casing for generated resolver files
    files: ['src/graphql/domains/*/resolvers/**'],
    rules: {
      'unicorn/filename-case': ['off'],
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
            {
              target: ['mongodb/**', 'models/**'],
              from: ['services/**', 'graphql/**'],
              message:
                'Do not import from ["services","graphql"] layer in ["mongodb","models"] layer',
            },
            {
              target: 'services/**',
              from: ['graphql/**'],
              message: 'Do not import from "graphql" layer in "services" layer',
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'graphql',
              message:
                'Please import from CommonJS instead "graphql/index.js" (To match realm from "@graphql-tools")',
            },
          ],
        },
      ],
    },
  },
];
