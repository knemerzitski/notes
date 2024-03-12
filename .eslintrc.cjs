module.exports = {
  root: true,
  plugins: ['eslint-plugin-import'],
  extends: ['eslint:recommended', 'prettier'],
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
  ignorePatterns: ['.eslintrc.cjs', 'node_modules'],
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
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: false,
        },
      },
    ],
  },
  overrides: [
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
