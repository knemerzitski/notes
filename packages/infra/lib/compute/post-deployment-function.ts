import { Duration } from 'aws-cdk-lib';
import { Code, FunctionOptions } from 'aws-cdk-lib/aws-lambda';
import { TriggerFunction } from 'aws-cdk-lib/triggers';
import { Construct } from 'constructs';

import { commonProps } from './common-props';

export interface PostDeploymentFunctionProps {
  codePath: string;
  environment?: FunctionOptions['environment'];
}

/**
 * Runs once post deployment
 */
export class PostDeploymentFunction extends Construct {
  readonly function: TriggerFunction;

  constructor(scope: Construct, id: string, props: PostDeploymentFunctionProps) {
    super(scope, id);

    this.function = new TriggerFunction(this, 'TriggerFn', {
      ...commonProps,
      code: Code.fromAsset(props.codePath),
      timeout: Duration.seconds(15),
      memorySize: 128,
      environment: props.environment,
    });
  }
}
