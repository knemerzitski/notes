module.exports = {
  root: true,
  plugins: ['eslint-plugin-import'],
  rules: {
    'import/order': [
      'warn',
      {
        pathGroups: [
          {
            pattern: '~/**',
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
