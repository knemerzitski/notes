import path from 'node:path';
import process from 'node:process';

const eslintCommand = (filenames) =>
  `eslint --fix ${filenames.map((f) => path.relative(process.cwd(), f)).join(' ')}`;

/** @type {import("lint-staged").Config} */
export default {
  '*.{js,jsx,ts,tsx,graphql}': [eslintCommand],
  '**/*': ['prettier --write --ignore-unknown'],
};
