module.exports = {
  env: { node: true },
  extends: ['eslint:recommended', 'prettier'],
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
