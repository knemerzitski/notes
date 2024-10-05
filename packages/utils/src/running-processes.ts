import { exec } from 'child_process';
import { join } from 'path';

export function assertMongoDBIsRunning() {
  const mongoDBDockerPath = join(__dirname, '../../../docker/mongodb');
  exec(`cd ${mongoDBDockerPath} && docker compose ps`, (err, stdout) => {
    if (!err && !stdout.includes('mongod')) {
      console.error(
        `MongoDB container is not running.\n` +
          `Please start MongoDB container with command 'npm run mongodb:start'`
      );
      process.exit(1);
    }
  });
}

export function assertDynamoDBIsRunning() {
  const dynamoDBDockerPath = join(__dirname, '../../../docker/dynamodb');
  exec(`cd ${dynamoDBDockerPath} && docker compose ps`, (err, stdout) => {
    if (!err && !stdout.includes('dynamodb-local')) {
      console.error(
        `DynamoDB container is not running.\n` +
          `Please start DynamoDB container with command 'npm run dynamodb:start'`
      );
      process.exit(1);
    }
  });
}

export function assertSamApiIsRunning() {
  // Ensure sam local api is running
  exec(`curl -I -X OPTIONS http://127.0.0.1:3000/graphql`, (err, stdout) => {
    if (!err && !stdout.startsWith('HTTP/1.1 200 OK')) {
      console.error(
        `SAM local API is not running.\n` +
          `Please start API with command 'npm run -w infra test:int:start-api'. \n` +
          `Cloudformation must be syntheized: 'npm run -w infra test:int:synth'.`
      );
      process.exit(1);
    }
  });
}
