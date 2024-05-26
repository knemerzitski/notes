module.exports = {
  env: { browser: true, es2020: true },
  ignorePatterns: ['.eslintrc.cjs', 'src/__generated__', 'out', 'node_modules'],
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
      settings: {
        react: {
          version: 'detect',
        },
      },
      extends: [
        'plugin:@typescript-eslint/strict-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked',
        'plugin:react-hooks/recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: __dirname,
      },
      plugins: ['react-refresh'],
      rules: {
        // VSCode ESLint doesn't update after graphql-codegen. This stops showing errors no-unsafe after every change.
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',

        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        'react-hooks/exhaustive-deps': ['error'],
      },
    },
    {
      files: ['src/**/*.cy.[jt]s?(x)'],
      extends: ['plugin:cypress/recommended'],
      env: {
        'cypress/globals': true,
      },
    },
  ],
};
