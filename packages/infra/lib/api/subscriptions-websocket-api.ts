import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface SubscriptionsWebSocketApiProps {
  url: string;
  handler: NodejsFunction;
}

export class SubscriptionsWebSocketApi extends Construct {
  readonly api: WebSocketApi;
  readonly url: URL;
  readonly stage: WebSocketStage;

  constructor(scope: Construct, id: string, props: SubscriptionsWebSocketApiProps) {
    super(scope, id);

    this.url = new URL(props.url);

    // WebSocket API stageName cannot contain any slashes
    const webSocketStageName = this.url.pathname.substring(1);
    if (webSocketStageName.includes('/')) {
      throw new Error(
        `WebSocket url pathname cannot contain any slashes: ${webSocketStageName}`
      );
    }

    this.api = new WebSocketApi(this, 'Api', {
      apiName: 'Notes App WebSocketApi',
      description: 'Handles GraphQL subscriptions for Notes App',
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'WsConnectIntegration',
          props.handler
        ),
      },
      defaultRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'WsMessageIntegration',
          props.handler
        ),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          'WsDisconnectIntegration',
          props.handler
        ),
      },
    });

    this.stage = new WebSocketStage(this, 'Stage', {
      webSocketApi: this.api,
      stageName: webSocketStageName,
      autoDeploy: true,
      throttle: {
        rateLimit: 500,
        burstLimit: 50,
      },
    });
  }
}
