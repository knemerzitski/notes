module.exports = {
  root: true,
  plugins: ['eslint-plugin-import'],
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
      files: ['./frontend/web/src/**/*.[jt]s?(x)'],
      processor: '@graphql-eslint/graphql',
    },
    {
      files: [
        './backend/api/src/schema/**/*.graphql',
        './frontend/web/src/schema/**/*.graphql',
      ],
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
      },
      parserOptions: {
        schema: [
          './backend/api/src/schema/**/schema.graphql',
          './frontend/web/src/schema/**/schema.graphql',
        ],
        operations: ['./frontend/web/src/**/*.{graphql,js,ts,jsx,tsx}'],
      },
    },
  ],
};
