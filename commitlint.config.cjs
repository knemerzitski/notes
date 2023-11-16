const commitTypesConfig = require('./commit-types.config.cjs');

/**
 * Configuration for commitlint
 *
 * @see {@link https://commitlint.js.org/#/} for documentation
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  'type-enum': [2, 'always', commitTypesConfig.map(({ type }) => type)],
  'subject-min-length': [2, 'always', 3],
  'subject-max-length': [2, 'always', 64],
  'body-max-length': [0],
  'body-max-line-length': [0],
  'footer-max-length': [0],
  'footer-max-line-length': [0],
};
