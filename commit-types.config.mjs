/**
 * @typedef {Object} CommitType
 * @property {string} type
 * @property {string} description
 */

/**
 * @type {CommitType[]}
 */
export default [
  {
    type: 'feat',
    description: 'A new feature',
  },
  {
    type: 'fix',
    description: 'A bug fix',
  },
  {
    type: 'chore',
    description: 'Build process or auxiliary tool changes',
  },
  {
    type: 'ci',
    description: 'CI related changes',
  },
  {
    type: 'docs',
    description: 'Documentation only changes',
  },
  {
    type: 'perf',
    description: 'A code change that improves performance',
  },
  {
    type: 'refactor',
    description: 'A code change that neither fixes a bug or adds a feature',
  },
  {
    type: 'release',
    description: 'Create a release commit',
  },
  {
    type: 'style',
    description: 'Markup, white-space, formatting, missing semi-colons...',
  },
  {
    type: 'test',
    description: 'Adding missing tests',
  },
];
