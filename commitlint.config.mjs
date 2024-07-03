/**
 * @typedef {import('@commitlint/types').RulesConfig} RulesConfig
 *
 * @typedef {Object} LintConfig
 * @property {RulesConfig} rules
 */

import commitTypesConfig from './commit-types.config.mjs';

/**
 * Configuration for commitlint
 *
 * @see {@link https://commitlint.js.org/#/} for documentation
 *
 * @type {LintConfig}
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'type-enum': [2, 'always', commitTypesConfig.map(({ type }) => type)],
    'subject-min-length': [2, 'always', 3],
    'subject-max-length': [2, 'always', 64],
    'body-max-length': [0],
    'body-max-line-length': [0],
    'footer-max-length': [0],
    'footer-max-line-length': [0],
  },
};
