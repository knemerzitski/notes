module.exports = {
  env: { node: true },
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['node_modules', 'out', 'cdk.out', '.eslintrc.cjs'],
  settings: {
    'import/resolver': {
      typescript: {
        project: '../..',
      },
    },
  },
};
