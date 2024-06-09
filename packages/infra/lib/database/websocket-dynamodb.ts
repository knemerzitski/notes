import { Construct } from 'constructs';
import { createCdkTableConstructs } from '~lambda-graphql/dynamodb/schema';

export class WebSocketDynamoDB extends Construct {
  readonly tables: ReturnType<typeof createCdkTableConstructs>;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // WebSocket subscriptions with DynamoDB
    this.tables = createCdkTableConstructs(this, 'DB');
  }
}
