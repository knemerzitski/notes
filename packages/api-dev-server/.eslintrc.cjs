module.exports = {
  env: { node: true },
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.eslintrc.cjs', 'out', 'out-handlers', 'node_modules'],
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
      extends: [
        'plugin:@typescript-eslint/strict-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked',
      ],
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
        '@typescript-eslint/no-invalid-void-type': 'off',
      },
    },
  ],
};
