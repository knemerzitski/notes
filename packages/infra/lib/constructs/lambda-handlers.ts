import { Duration } from 'aws-cdk-lib';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunctionProps, NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface LambdaHandlersConstructProps {
  codePath: {
    http: string;
    webSocket: string;
  };
  environment?: NodejsFunctionProps['environment'];
}

export class LambdaHandlersConstruct extends Construct {
  readonly http: NodejsFunction;
  readonly webSocket: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaHandlersConstructProps) {
    super(scope, id);

    const commonLambdaHandlerProps: Readonly<NodejsFunctionProps> = {
      handler: 'index.handler',
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.seconds(5),
      environment: props.environment,
    };

    // Apollo HTTP Request handler
    this.http = new NodejsFunction(this, 'ApolloHttp', {
      ...commonLambdaHandlerProps,
      code: Code.fromAsset(props.codePath.http),
      timeout: Duration.seconds(8),
      memorySize: 256,
    });

    // Websocket subscriptions handler
    this.webSocket = new NodejsFunction(this, 'WebSocket', {
      ...commonLambdaHandlerProps,
      code: Code.fromAsset(props.codePath.webSocket),
      timeout: Duration.seconds(5),
      memorySize: 156,
    });
  }

  getAll() {
    return [this.http, this.webSocket];
  }
}
