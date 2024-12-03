/**
 * Simple script to check if environment variable 'AWS' is set in project root .env files
 */

import { exit } from 'process';
import { loadEnvironmentVariables } from '../lib/utils/env';

loadEnvironmentVariables();

if (process.env.AWS_CDK) {
  process.exit(0);
} else {
  console.error(`Expected environment variable "AWS" to be defined`);
  exit(1);
}
