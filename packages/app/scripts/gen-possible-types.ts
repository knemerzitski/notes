/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { format as prettierFormat } from 'prettier';
import { exec } from 'node:child_process';

const FILENAME = 'possible-types.json';

const relEnvPath = `../../../${
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local'
}`;

const envPath = join(__dirname, relEnvPath);
dotenv.config({ path: envPath });

const HTTP_URL = process.env.VITE_GRAPHQL_HTTP_URL!;

const args = readArgs();

await generatePossibleTypes({
  fetchUrl: HTTP_URL,
  outPath: args.file,
});

/**
 * @see {@link https://www.apollographql.com/docs/react/data/fragments/#generating-possibletypes-automatically}
 */
async function generatePossibleTypes({
  fetchUrl,
  outPath,
}: {
  fetchUrl: string;
  outPath: string;
}) {
  console.log(`Fetching possible types from "${fetchUrl}"`);
  const res = await fetchWithReattempt(
    (count) => {
      return fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variables: {},
          query: `
            {
              __schema {
                types {
                  kind
                  name
                  possibleTypes {
                    name
                  }
                }
              }
            }
          `,
        }),
        signal: count === 0 ? AbortSignal.timeout(1) : undefined,
      });
    },
    () => {
      console.log('GraphQL server is not running. Starting it temporarily');
      exec(`npm run -w dev-server server:build && npm run -w dev-server start-detached`);
      return () => {
        console.log('Shutting down GraphQL server');
        exec(`npm run -w dev-server stop`);
      };
    }
  );

  const result: any = await res.json();

  const possibleTypes: any = {};

  result.data.__schema.types.forEach((supertype: any) => {
    if (supertype.possibleTypes) {
      possibleTypes[supertype.name] = supertype.possibleTypes.map(
        (subtype: any) => subtype.name
      );
    }
  });

  const resultPrettyString = await prettierFormat(JSON.stringify(possibleTypes), {
    parser: 'json',
  });

  const writePath = join(outPath, FILENAME);
  writeFileSync(writePath, resultPrettyString);
  console.log(`Fragment types successfully extracted to "${writePath}"`);
}

async function fetchWithReattempt<T>(
  fn: (count: number) => Promise<T>,
  onFail?: () => (() => void) | undefined,
  count = 0
): Promise<T> {
  try {
    return await fn(count);
  } catch (err) {
    if (onFail) {
      const cleanUp = onFail();
      try {
        return await fetchWithReattempt(fn, undefined, count + 1);
      } finally {
        cleanUp?.();
      }
    } else {
      throw err;
    }
  }
}

function readArgs() {
  const fileIndex = process.argv.findIndex((value) => value === '-f');
  if (fileIndex === -1) {
    throw new Error('Expected -f to be specified');
  }
  const file = process.argv[fileIndex + 1];
  if (!file) {
    throw new Error('Expected -f to have file path');
  }

  return {
    file,
  };
}
