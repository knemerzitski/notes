import { Duration } from 'aws-cdk-lib';
import { Code } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunctionProps, NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

import { commonProps } from './common-props';

export interface WebSocketLambdaProps {
  codePath: string;
  environment?: NodejsFunctionProps['environment'];
}

export class WebSocketLambda extends Construct {
  readonly function: NodejsFunction;

  constructor(scope: Construct, id: string, props: WebSocketLambdaProps) {
    super(scope, id);

    // Apollo HTTP Request handler
    this.function = new NodejsFunction(this, 'Fn', {
      ...commonProps,
      code: Code.fromAsset(props.codePath),
      timeout: Duration.seconds(5),
      memorySize: 156,
      environment: props.environment,
    });
  }
}
