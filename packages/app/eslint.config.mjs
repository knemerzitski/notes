import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import cypressPlugin from 'eslint-plugin-cypress/flat';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...rootConfig,
  { ignores: ['src/__generated__', 'scripts'] },
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
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Importing modules
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
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