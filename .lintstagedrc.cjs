const path = require('path');

const eslintCommand = (filenames) =>
  `eslint --fix ${filenames.map((f) => path.relative(process.cwd(), f)).join(' ')}`;

/** @type {import("lint-staged").Config} */
module.exports = {
  '*.{js,jsx,ts,tsx}': [eslintCommand],
  '**/*': ['prettier --write --ignore-unknown'],
};
