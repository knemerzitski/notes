import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import {
  LambdaHandlersConstruct,
  LambdaHandlersConstructProps,
} from '../constructs/lambda-handlers';
import { RestApiConstruct, RestApiConstructProps } from '../constructs/rest-api';

export interface NotesStackProps extends StackProps {
  customProps: {
    api: Omit<RestApiConstructProps, 'handler'>;
    lambda: LambdaHandlersConstructProps;
  };
}

export class TestNotesStack extends Stack {
  constructor(scope: Construct, id: string, props: NotesStackProps) {
    super(scope, id, props);
    const customProps = props.customProps;

    const handlers = new LambdaHandlersConstruct(
      this,
      'LambdaHandlers',
      customProps.lambda
    );

    new RestApiConstruct(this, 'RestApiConstruct', {
      handler: handlers.http,
      url: props.customProps.api.url,
    });
  }
}
