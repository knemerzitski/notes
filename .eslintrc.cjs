module.exports = {
  root: true,
  plugins: ['eslint-plugin-import'],
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
  ignorePatterns: ['.eslintrc.cjs', 'node_modules'],
  rules: {
    'import/order': [
      'warn',
      {
        pathGroups: [
          {
            pattern: '~*/**',
            group: 'external',
            position: 'after',
          },
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: false,
        },
      },
    ],
  },
};
