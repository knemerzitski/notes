import { join } from 'node:path';

import dotenv from 'dotenv';


const relEnvPath = `../../../../${
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local'
}`;

const envPath = join(import.meta.dirname, relEnvPath);
dotenv.config({ path: envPath });
