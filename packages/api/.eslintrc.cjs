module.exports = {
  env: { node: true },
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['src/graphql/domains/*.generated.ts', 'node_modules', 'out'],
  settings: {
    'import/resolver': {
      typescript: {
        project: '../..',
      },
    },
  },
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
  overrides: [
    {
      // Ignore filename casing for generated resolver files
      files: ['./src/graphql/domains/*/resolvers/**'],
      rules: {
        'unicorn/filename-case': ['off'],
      },
    },
  ],
};
