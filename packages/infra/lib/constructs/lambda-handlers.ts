import { Duration } from 'aws-cdk-lib';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunctionProps, NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface LambdaHandlersConstructProps {
  codePath: {
    http: string;
    connect: string;
    message: string;
    disconnect: string;
  };
  environment?: NodejsFunctionProps['environment'];
}

export class LambdaHandlersConstruct extends Construct {
  readonly http: NodejsFunction;
  readonly connect: NodejsFunction;
  readonly message: NodejsFunction;
  readonly disconnect: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaHandlersConstructProps) {
    super(scope, id);

    const commonLambdaHandlerProps: Readonly<NodejsFunctionProps> = {
      handler: 'index.handler',
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.seconds(5),
      memorySize: 128,
      environment: props.environment,
    };

    // Apollo HTTP Request handler
    this.http = new NodejsFunction(this, 'ApiApolloHttpHandlerLambda', {
      ...commonLambdaHandlerProps,
      code: Code.fromAsset(props.codePath.http),
      timeout: Duration.seconds(8),
      memorySize: 256,
    });

    // Websocket CONNECT handler
    this.connect = new NodejsFunction(
      this,
      'ApiWebSocketSubscriptionConnectHandlerLambda',
      {
        ...commonLambdaHandlerProps,
        code: Code.fromAsset(props.codePath.connect),
        timeout: Duration.seconds(5),
        memorySize: 156,
      }
    );

    // Websocket MESSAGE handler
    this.message = new NodejsFunction(
      this,
      'ApiWebSocketSubscriptionMessageHandlerLambda',
      {
        ...commonLambdaHandlerProps,
        code: Code.fromAsset(props.codePath.message),
        timeout: Duration.seconds(5),
        memorySize: 156,
      }
    );

    // Websocket DISCONNECT handler
    this.disconnect = new NodejsFunction(
      this,
      'ApiWebSocketSubscriptionDisconnectHandlerLambda',
      {
        ...commonLambdaHandlerProps,
        code: Code.fromAsset(props.codePath.disconnect),
        timeout: Duration.seconds(5),
        memorySize: 156,
      }
    );
  }

  getAll() {
    return [this.http, this.connect, this.message, this.disconnect];
  }
}
