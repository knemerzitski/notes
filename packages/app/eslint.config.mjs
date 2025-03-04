import path from 'node:path';

import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import cypressPlugin from 'eslint-plugin-cypress/flat';

import {
  tsConfigIncludeFromPackagesDir,
  dirnameFromPackagesDir,
} from '../utils/src/eslint/package-import.mjs';

import rootConfig from '../../eslint.config.mjs';

const rootRestrictedImports = rootConfig
  .filter(
    (item) => item.files?.includes('**/*.ts?(x)') && item.rules?.['no-restricted-imports']
  )
  .flatMap((item) => item.rules['no-restricted-imports'][1]);

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...rootConfig,
  {
    ignores: [
      'src/__generated__',
      'coverage',
      'scripts',
      'codegen.ts',
      '__EXCLUDE',
      'out-dev',
      'out-test',
      'out-dev-pwa',
    ],
  },
  { files: ['**/*.ts?(x)'] },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2023,
      },
    },
  },

  // React
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // React hooks, refresh
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      'react-hooks/exhaustive-deps': ['error'],
      'react-refresh/only-export-components': ['off'],
    },
  },

  // Typescript
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Importing modules
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
      'no-restricted-imports': [
        'error',
        {
          paths: [
            // Root rpaths
            ...rootRestrictedImports.filter((a) => a.paths).flatMap((a) => a.paths),
            {
              name: '@tanstack/router-devtools',
              importNames: ['TanStackRouterDevtools'],
              message:
                'Please use TanStackRouterDevtools from ./components/TanStackRouterDevTools instead.',
            },
            {
              name: '@apollo/client',
              importNames: ['useMutation'],
              message: 'Please use useMutation from ./graphql/hooks/useMutation instead.',
            },
          ],
          patterns: [
            // Root patterns
            ...rootRestrictedImports.filter((a) => a.patterns).flatMap((a) => a.patterns),
          ],
        },
      ],
    },
  },

  // Filename rules
  {
    files: [
      // React components
      'src/{*,*/*}/components/**',
      // GraphQL mutations
      'src/*/mutations/**',
      // GraphQL type policies
      'src/*/policies/*',
      // GraphQL scalar policies
      'src/*/scalars/*',
    ],
    rules: {
      'unicorn/filename-case': [
        'error',
        {
          case: 'pascalCase',
          ignore: [/graphql/i, /qrcode/i],
        },
      ],
    },
  },
  {
    files: [
      // React hooks
      'src/*/hooks/**',
      'src/*/*/hooks/**',
      // GraphQL field policies
      'src/*/policies/{*,*/*}/*',
    ],
    rules: {
      'unicorn/filename-case': [
        'error',
        {
          case: 'camelCase',
        },
      ],
    },
  },

  // Cypress
  cypressPlugin.configs.recommended,
  cypressPlugin.configs.globals,
];
