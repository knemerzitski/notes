import globals from 'globals';
import pluginJs from '@eslint/js';
import tsEslint from 'typescript-eslint';
import graphQLPlugin from '@graphql-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import unicornPlugin from 'eslint-plugin-unicorn';
import configPrettier from 'eslint-config-prettier';
// import configPrettierRecommended from 'eslint-plugin-prettier/recommended';

/** @type {import('eslint').Linter.Config[]} */
/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
  // Ignores
  {
    ignores: [
      '**/out',
      '**/dist',
      '**/*.config*.{mjs,ts}',
      '**/.prettierrc.cjs',
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.builtin,
    },
  },
  {
    plugins: {
      unicorn: unicornPlugin,
    },
  },
  {
    // Default filename casing kebab-case
    rules: {
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
        },
      ],
    },
  },

  // Javascript
  pluginJs.configs.recommended,

  // Typescript
  ...tsEslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts?(x)'],
  })),
  ...tsEslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts?(x)'],
  })),
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: '_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
        },
      ],
    },
  },

  // Typescript Import
  {
    ...importPlugin.flatConfigs.recommended,
    files: ['**/*.ts?(x)'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    settings: {
      'import/resolver': {
        typescript: {},
      },
    },
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      'import/order': [
        'warn',
        {
          pathGroups: [
            {
              pattern: '~*/**',
              group: 'external',
              position: 'after',
            },
          ],
          'newlines-between': 'always-and-inside-groups',
          alphabetize: {
            order: 'asc',
            caseInsensitive: false,
          },
        },
      ],
      'import/no-default-export': ['error'],
    },
  },

  // GraphQL
  {
    files: ['**/*.ts?(x)'],
    ignores: ['**/*.{test,cy}.ts?(x)'],
    processor: graphQLPlugin.processor,
  },
  {
    files: ['**/*.graphql'],
    languageOptions: {
      parser: graphQLPlugin.parser,
    },
    plugins: {
      '@graphql-eslint': graphQLPlugin,
    },
    rules: {
      ...graphQLPlugin.configs['flat/schema-recommended'].rules,
      ...graphQLPlugin.configs['flat/operations-recommended'].rules,
      '@graphql-eslint/naming-convention': [
        'error',
        {
          // Allow prefixing operation names with Query, Mutation or Subscription
          OperationDefinition: {},
        },
      ],
      '@graphql-eslint/executable-definitions': 'off',
      '@graphql-eslint/strict-id-in-types': 'off',
      '@graphql-eslint/no-unused-fragments': 'off',
      '@graphql-eslint/require-description': [
        'error',
        {
          types: true,
          rootField: true,
          FieldDefinition: true,
        },
      ],
    },
  },
  configPrettier,
  // eslintPluginPrettierRecommended,
];
