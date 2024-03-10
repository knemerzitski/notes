import path from 'path';

import dotenv from 'dotenv';

const relEnvPath = `../../../${
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local'
}`;

const envPath = path.join(__dirname, relEnvPath);
dotenv.config({ path: envPath });
