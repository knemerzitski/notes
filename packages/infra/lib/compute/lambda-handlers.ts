import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

import { ApolloHttpLambda, ApolloHttpLambdaProps } from './apollo-http-lambda';
import { WebSocketLambda, WebSocketLambdaProps } from './websocket-lambda';

export interface LambdaHandlersProps {
  apolloHttp: ApolloHttpLambdaProps;
  webSocket: WebSocketLambdaProps;
}

export class LambdaHandlers extends Construct {
  readonly http: NodejsFunction;
  readonly webSocket: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaHandlersProps) {
    super(scope, id);

    this.http = new ApolloHttpLambda(this, 'ApolloHttp', props.apolloHttp).function;
    this.webSocket = new WebSocketLambda(this, 'WebSocket', props.webSocket).function;
  }

  getAll() {
    return [this.http, this.webSocket];
  }
}
