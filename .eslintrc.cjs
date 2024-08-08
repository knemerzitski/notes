module.exports = {
  root: true,
  plugins: ['eslint-plugin-import', 'unicorn'],
  extends: ['eslint:recommended', 'prettier'],
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: ['node_modules', 'out', '.eslintrc.cjs'],
  rules: {
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
    'unicorn/filename-case': [
      'error',
      {
        case: 'kebabCase',
      },
    ],
  },
  overrides: [
    {
      files: ['*.[t]s?(x)'],
      extends: [
        'plugin:@typescript-eslint/strict-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
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
    {
      files: ['./packages/app/src/**/*.[jt]s?(x)'],
      processor: '@graphql-eslint/graphql',
    },
    {
      files: ['./packages/api/src/**/*.graphql', './packages/app/src/**/*.graphql'],
      extends: [
        'plugin:@graphql-eslint/schema-recommended',
        'plugin:@graphql-eslint/operations-recommended',
      ],
      rules: {
        '@graphql-eslint/description-style': 'off',
        '@graphql-eslint/require-description': [
          'error',
          {
            OperationDefinition: false,
            FieldDefinition: true,
            DirectiveDefinition: true,
          },
        ],
        '@graphql-eslint/executable-definitions': 'off',
        '@graphql-eslint/strict-id-in-types': 'off',
        '@graphql-eslint/no-unused-fragments': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            ignoreRestSiblings: true,
            argsIgnorePattern: '_',
            destructuredArrayIgnorePattern: '^_',
          },
        ],
      },
      parserOptions: {
        schema: [
          './packages/api/src/**/schema.graphql',
          './packages/app/src/**/schema.graphql',
        ],
        operations: ['./packages/app/src/**/*.{graphql,js,ts,jsx,tsx}'],
      },
    },
  ],
};
