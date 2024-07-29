import {
  RestApi,
  EndpointType,
  Cors,
  LambdaIntegration,
} from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

import getOrCreateResource from '../utils/getOrCreateResource';

export interface HttpRestApiProps {
  url: string;
  handler: NodejsFunction;
}

export class HttpRestApi extends Construct {
  readonly api: RestApi;
  readonly url: URL;

  constructor(scope: Construct, id: string, props: HttpRestApiProps) {
    super(scope, id);

    // Setup Rest API
    this.api = new RestApi(this, 'Api', {
      restApiName: 'Notes App RestApi',
      description: 'Serves requests for Notes App via HTTP',
      endpointTypes: [EndpointType.REGIONAL],
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 50,
        throttlingRateLimit: 500,
      },
      deploy: true,
      defaultCorsPreflightOptions: {
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowOrigins: Cors.ALL_ORIGINS,
      },
    });

    // Add url as an endpoint to apollo-http-handler lambda
    this.url = new URL(props.url);
    const graphQLResource = getOrCreateResource(
      this.api.root,
      this.url.pathname.split('/').filter((p) => p.trim().length > 0)
    );
    ['POST', 'GET'].forEach((method) => {
      graphQLResource.addMethod(method, new LambdaIntegration(props.handler));
    });
  }
}
