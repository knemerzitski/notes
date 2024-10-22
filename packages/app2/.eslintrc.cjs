module.exports = {
  env: { browser: true, es2020: true },
  ignorePatterns: ['out', 'node_modules', '.eslintrc.cjs', 'src/__generated__'],
  settings: {
    'import/resolver': {
      typescript: {
        project: '../..',
      },
    },
  },
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@tanstack/router-devtools',
            importNames: ['TanStackRouterDevtools'],
            message:
              'Please use TanStackRouterDevtools from ./components/TanStackRouterDevTools instead.',
          },
          {
            name: '@apollo/client',
            importNames: ['useMutation'],
            message: 'Please use useMutation from ./graphql/hooks/useMutation instead.',
          },
        ],
      },
    ],
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
        'plugin:react-hooks/recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
      ],
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: __dirname,
      },
      plugins: ['react-refresh'],
      rules: {
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        'react-hooks/exhaustive-deps': ['error'],
      },
    },
    {
      files: [
        // React components
        './src/{*,*/*}/components/**',
        // GraphQL mutations
        './src/*/mutations/**',
        // GraphQL type policies
        './src/*/policies/*',
      ],
      rules: {
        'unicorn/filename-case': [
          'error',
          {
            case: 'pascalCase',
          },
        ],
      },
    },
    {
      files: [
        // React hooks
        './src/*/hooks/**',
        './src/*/*/hooks/**',
        // GraphQL field policies
        './src/*/policies/*/*',
      ],
      rules: {
        'unicorn/filename-case': [
          'error',
          {
            case: 'camelCase',
          },
        ],
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
