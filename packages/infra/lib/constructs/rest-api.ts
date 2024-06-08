import {
  RestApi,
  EndpointType,
  Cors,
  LambdaIntegration,
} from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import getOrCreateResource from '../utils/getOrCreateResource';

export interface RestApiConstructProps {
  url: string;
  handler: NodejsFunction;
}

export class RestApiConstruct extends Construct {
  readonly api: RestApi;
  readonly url: URL;

  constructor(scope: Construct, id: string, props: RestApiConstructProps) {
    super(scope, id);

    // Setup Rest API
    this.api = new RestApi(this, 'RestApi', {
      restApiName: 'Notes App RestApi',
      description: 'Serves API requests for Notes App',
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

    // Apollo HTTP Handler to Rest API root endpoint
    this.url = new URL(props.url);
    const graphQlResource = getOrCreateResource(
      this.api.root,
      this.url.pathname.split('/').filter((p) => p.trim().length > 0)
    );
    ['POST', 'GET'].forEach((method) => {
      graphQlResource.addMethod(method, new LambdaIntegration(props.handler));
    });
  }
}
