import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

// packages/api-dev-server/out/server.index.mjs
const __dirname = dirname(fileURLToPath(import.meta.url));

const relEnvPath = `../../../../${
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local'
}`;

const envPath = join(__dirname, relEnvPath);
dotenv.config({ path: envPath });
