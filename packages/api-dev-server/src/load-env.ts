import { join } from 'node:path';

import dotenv from 'dotenv';


console.log(process.env);

const relEnvPath = `../../../../${
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local'
}`;

const envPath = join(import.meta.dirname, relEnvPath);
console.log('load env', envPath)

dotenv.config({ path: envPath });
