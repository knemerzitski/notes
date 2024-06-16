import path from 'path';

import dotenv from 'dotenv';

import { PROJECT_DIR } from './project-dir';

export function loadEnvironmentVariables() {
  const paths = ['../../.env.local'];
  
  if (process.env.NODE_ENV === 'production') {
    paths.unshift(...['../../.env.production.local']);
  } else if (process.env.NODE_ENV === 'test') {
    paths.unshift(...['../../.env.test']);
  }

  paths.forEach((relPath) => {
    const envPath = path.join(PROJECT_DIR, relPath);
    const out = dotenv.config({ path: envPath });
    if (out.parsed) {
      console.log(`Loaded environment variables from '${envPath.toString()}'`);
    }
  });
}

export function assertGetEnvironmentVariables<TKey extends string>(
  names: Readonly<TKey[]>
): Readonly<Record<TKey, string>> {
  return names.reduce<Record<TKey, string>>(
    (map, name) => {
      const value = process.env[name];
      if (value === undefined) {
        throw new Error(
          `Expected environment variable '${name}' to be defined. It can be defined at project root in file '.env.local'`
        );
      }
      map[name] = value;
      return map;
    },
    {} as Record<TKey, string>
  );
}
