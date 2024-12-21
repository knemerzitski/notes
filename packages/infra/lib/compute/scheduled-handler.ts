import { Duration } from 'aws-cdk-lib';
import { Code, FunctionOptions } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

import { commonProps } from './common-props';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export interface ScheduledFunctionProps {
  codePath: string;
  environment?: FunctionOptions['environment'];
}

/**
 * A handler that is scheduled to run periodically
 */
export class ScheduledFunction extends Construct {
  readonly function: NodejsFunction;
  readonly rule: Rule;

  constructor(scope: Construct, id: string, props: ScheduledFunctionProps) {
    super(scope, id);

    this.function = new NodejsFunction(this, 'Fn', {
      ...commonProps,
      code: Code.fromAsset(props.codePath),
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: props.environment,
    });

    this.rule = new Rule(this, 'Rule', {
      // Every day at 3:00
      schedule: Schedule.cron({
        hour: '3',
        minute: '0',
      }),
    });

    this.rule.addTarget(new LambdaFunction(this.function));
  }
}
