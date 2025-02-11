import { readdir } from 'node:fs/promises';

const ESLINT_GLOB = '*.{js,jsx,ts,tsx,graphql}';

const packages = (await readdir('packages', { withFileTypes: true }))
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name);

/** @type {import("lint-staged").Config} */
export default {
  // Eslint for any other file not included in packages dir
  [`!(packages/**/${ESLINT_GLOB})`]: 'eslint --fix --max-warnings 0 --no-warn-ignored',
  // Eslint for each package
  ...Object.fromEntries(
    packages.map((packageName) => [
      `packages/${packageName}/**/${ESLINT_GLOB}`,
      `npm run -w ${packageName} eslint:lint-staged`,
    ])
  ),
  '**/*': ['prettier --write --ignore-unknown'],
};
