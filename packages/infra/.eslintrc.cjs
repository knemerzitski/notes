module.exports = {
  extends: ['eslint:recommended', 'prettier'],

  env: { node: true },
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.eslintrc.cjs', 'out', 'cdk.out', 'node_modules'],
  settings: {
    'import/resolver': {
      typescript: {
        project: '../..',
      },
    },
  },

  overrides: [
    {
      files: ['*.[t]s?(x)'],
      extends: 'plugin:@typescript-eslint/recommended',
    },
  ],
};
