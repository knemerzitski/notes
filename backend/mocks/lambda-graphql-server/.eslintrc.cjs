module.exports = {
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.eslintrc.cjs', 'out'],
  settings: {
    'import/resolver': {
      typescript: {
        project: '../../..',
      },
    },
  },
};
