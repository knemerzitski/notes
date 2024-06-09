import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { RestApiConstruct, RestApiConstructProps } from '../constructs/rest-api';
import { ApolloHttpLambda, ApolloHttpLambdaProps } from '../compute/apollo-http-lambda';

export interface NotesStackProps extends StackProps {
  customProps: {
    api: Omit<RestApiConstructProps, 'handler'>;
    apolloHttpLambda: ApolloHttpLambdaProps;
  };
}

export class TestNotesStack extends Stack {
  constructor(scope: Construct, id: string, props: NotesStackProps) {
    super(scope, id, props);
    const customProps = props.customProps;

    const httpLambda = new ApolloHttpLambda(
      this,
      'ApolloHttp',
      customProps.apolloHttpLambda
    ).function;

    new RestApiConstruct(this, 'RestApiConstruct', {
      handler: httpLambda,
      url: props.customProps.api.url,
    });
  }
}
