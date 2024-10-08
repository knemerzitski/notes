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
      // PascalCase: React components
      files: ['./src/*/components/**'],
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
      // camelCase: React hooks
      files: ['./src/*/hooks/**'],
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
      // PascalCase: GraphQL mutations
      files: ['./src/*/mutations/**'],
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
      // PascalCase: GraphQL type policies
      files: ['./src/*/policies/*'],
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
      // camelCase: GraphQL field policies
      files: ['./src/*/policies/*/*'],
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
