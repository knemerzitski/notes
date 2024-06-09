import { Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export const commonProps: Readonly<NodejsFunctionProps> = {
  handler: 'index.handler',
  runtime: Runtime.NODEJS_18_X,
  logRetention: RetentionDays.ONE_DAY,
  timeout: Duration.seconds(5),
};
