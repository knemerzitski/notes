module.exports = {
  env: { node: true },
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: '../..',
      },
    },
  },
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        basePath: `${__dirname}/src`,
        zones: [
          {
            target: '!(changeset2)',
            from: 'changeset2/!(index.ts)',
            message: 'Import from entry point "changeset/index.ts" instead',
          },
        ],
      },
    ],
  },
};
