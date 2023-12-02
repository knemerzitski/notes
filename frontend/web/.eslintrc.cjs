module.exports = {
  env: { browser: true, es2020: true },
  extends: ['eslint:recommended', 'prettier'],
  ignorePatterns: ['.eslintrc.cjs', 'src/schema/__generated__', 'out', 'node_modules'],
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
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      },
    },
  ],
};
