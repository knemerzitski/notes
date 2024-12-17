import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { isEnvironmentVariableTruthy } from './string/is-environment-variable-truthy';

/**
 * Looks for nearest ancestor with `.git` directory
 * @returns Absolute path to project ROOT directory
 */
export function getProjectRootDir(startPath?: string) {
  if (isEnvironmentVariableTruthy(process.env.LAMBDA)) {
    return '.';
  }

  if (!startPath) {
    const thisOrTranspiledFileDir = import.meta.dirname;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (thisOrTranspiledFileDir === undefined) {
      throw new Error(`Please use Node v22.0.0 or higher. Run command "nvm use""`);
    }
    startPath = thisOrTranspiledFileDir;
  }

  const stack = [startPath];

  let checkPath: string | undefined;
  while ((checkPath = stack.pop()) != null) {
    if (existsSync(join(checkPath, '.git'))) {
      return checkPath;
    }

    const nextPath = join(checkPath, '..');
    if (nextPath !== checkPath) {
      stack.push(nextPath);
    }
  }

  throw new Error(`Failed to find project directory starting from ${startPath}`);
}
