import globals from 'globals';
import pluginJs from '@eslint/js';
import tsEslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import graphQLPlugin from '@graphql-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import unicornPlugin from 'eslint-plugin-unicorn';
import configPrettier from 'eslint-config-prettier';
// import configPrettierRecommended from 'eslint-plugin-prettier/recommended';

// TODO remove after upgrading from node 18 and use `import.meta.dirname`
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('eslint').Linter.Config[]} */
/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
  {
    ignores: [
      '**/node_modules',
      '**/out',
      '**/dist',
      '**/eslint.config.mjs',
      '**/graphql.config.ts',
      '**/.prettierrc.cjs',
    ],
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
        // TODO use import.meta.dirname, Node.js >=20.11.0 / >= 21.2.0
        // tsconfigRootDir: import.meta.dirname,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
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

      // Temporary hack: VSCode ESLint doesn't update after graphql-codegen. This stops showing errors no-unsafe after every change.
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
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
