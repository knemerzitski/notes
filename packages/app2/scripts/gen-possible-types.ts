import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const relEnvPath = `../../../${
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local'
}`;

const envPath = path.join(__dirname, relEnvPath);
dotenv.config({ path: envPath });

const HTTP_URL = process.env.VITE_GRAPHQL_HTTP_URL!;

const args = readArgs();

generatePossibleTypes({
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

  const result = await res.json();

  const possibleTypes = {};

  result.data.__schema.types.forEach((supertype) => {
    if (supertype.possibleTypes) {
      possibleTypes[supertype.name] = supertype.possibleTypes.map(
        (subtype) => subtype.name
      );
    }
  });

  const writePath = path.join(outPath, 'possibleTypes.json');
  fs.writeFile(writePath, JSON.stringify(possibleTypes), (err) => {
    if (err) {
      console.error(`Error writing "${writePath}"`, err);
    } else {
      console.log(`Fragment types successfully extracted to "${writePath}"`);
    }
  });
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
