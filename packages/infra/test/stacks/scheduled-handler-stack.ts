import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import {
  ScheduledFunction,
  ScheduledFunctionProps,
} from '../../lib/compute/scheduled-handler';

export interface NotesStackProps extends StackProps {
  customProps: {
    scheduled: ScheduledFunctionProps;
  };
}

export class ScheduledHandlerStack extends Stack {
  constructor(scope: Construct, id: string, props: NotesStackProps) {
    super(scope, id, props);
    const customProps = props.customProps;

    new ScheduledFunction(this, 'Scheduled', customProps.scheduled);
  }
}
