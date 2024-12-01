import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { TriggerFunctionProps } from 'aws-cdk-lib/triggers';

export const commonProps: Readonly<
  NodejsFunctionProps & Omit<TriggerFunctionProps, 'code'>
> = {
  handler: 'index.handler',
  runtime: Runtime.NODEJS_22_X,
  logRetention: RetentionDays.ONE_DAY,
};
