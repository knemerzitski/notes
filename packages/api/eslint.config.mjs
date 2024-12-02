import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...rootConfig,
  {
    ignores: ['src/graphql/domains/*.generated.ts'],
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
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      'import/no-restricted-paths': [
        'error',
        {
          basePath: `${__dirname}/src`,
          zones: [
            {
              target: 'mongodb/**',
              from: ['services/**', 'graphql/**'],
              message:
                'Do not import from "services" or "graphql" layer in "mongodb" layer',
            },
            {
              target: 'services/**',
              from: ['graphql/**'],
              message: 'Do not import from "graphql" layer in "mongodb" layer',
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