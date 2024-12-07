import { join } from 'node:path';
import {} from 'node:fs';

import { config } from 'dotenv';

import { Logger } from './logging';
import { getProjectRootDir } from './project-dir';

export function loadEnvironmentVariables(logger?: Pick<Logger, 'info'>) {
  const paths = ['.env.local', '.env'];

  if (process.env.NODE_ENV) {
    paths.unshift(
      ...[`.env.${process.env.NODE_ENV}.local`, `.env.${process.env.NODE_ENV}`]
    );
  }

  const projectDir = getProjectRootDir();

  paths.forEach((relPath) => {
    const envPath = join(projectDir, relPath);
    const out = config({ path: envPath });
    if (out.parsed) {
      logger?.info(`Loaded environment variables from '${envPath.toString()}'`);
    }
  });
}

export function assertGetEnvironmentVariables<TKey extends string>(
  names: readonly TKey[]
): Readonly<Record<TKey, string>> {
  return names.reduce<Record<TKey, string>>(
    (map, name) => {
      const value = process.env[name];
      if (value === undefined) {
        throw new Error(
          `Expected environment variable '${name}' to be defined. It can be defined in project root file '.env'`
        );
      }
      map[name] = value;
      return map;
    },
    // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
    {} as Record<TKey, string>
  );
}
