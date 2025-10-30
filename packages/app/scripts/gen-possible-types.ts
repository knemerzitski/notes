/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import dotenv from 'dotenv';
import { format as prettierFormat } from 'prettier';

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

  if (!existsSync(join(__dirname, '../../api-dev-server/out/server/index.mjs'))) {
    console.log('Building GraphQL server');
    execSync(`npm run -w dev-server build:server`);
  }

  const port = new URL(fetchUrl).port;

  console.log(`Starting a temporary GraphQL server on port ${port}...`);
  execSync(
    `export PORT=${port} NO_DB_MODE=1 DEBUG=*:ERROR,*:INFO; npm run -w dev-server start:detached`
  );

  try {
    const res = await fetch(fetchUrl, {
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
    });

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
  } finally {
    console.log('Shutting down GraphQL server');
    execSync(`export PORT=${port}; npm run -w dev-server stop`);
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
