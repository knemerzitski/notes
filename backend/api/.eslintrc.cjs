module.exports = {
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['src/schema/*.generated.ts'],
  settings: {
    'import/resolver': {
      typescript: {
        project: '../..',
      },
    },
  },
};
