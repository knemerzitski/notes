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
};
