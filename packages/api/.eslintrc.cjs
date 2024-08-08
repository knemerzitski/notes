module.exports = {
  env: { node: true },
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['src/graphql/*.generated.ts', 'node_modules', 'out'],
  settings: {
    'import/resolver': {
      typescript: {
        project: '../..',
      },
    },
  },
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  overrides: [
    {
      // Ignore filename casing for generates resolver files
      files: ['./src/graphql/*/resolvers/**', './src/graphql/utils/graphql/**'],
      rules: {
        'unicorn/filename-case': ['off'],
      },
    },
  ],
};
