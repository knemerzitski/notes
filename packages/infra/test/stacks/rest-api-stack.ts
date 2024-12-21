import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { HttpRestApi, HttpRestApiProps } from '../../lib/api/http-rest-api';
import {
  ApolloHttpLambda,
  ApolloHttpLambdaProps,
} from '../../lib/compute/apollo-http-lambda';

export interface NotesStackProps extends StackProps {
  customProps: {
    api: Omit<HttpRestApiProps, 'handler'>;
    apolloHttpLambda: ApolloHttpLambdaProps;
  };
}

export class RestApiStack extends Stack {
  constructor(scope: Construct, id: string, props: NotesStackProps) {
    super(scope, id, props);
    const customProps = props.customProps;

    const httpLambda = new ApolloHttpLambda(
      this,
      'ApolloHttp',
      customProps.apolloHttpLambda
    ).function;

    new HttpRestApi(this, 'RestApiConstruct', {
      handler: httpLambda,
      url: props.customProps.api.url,
    });
  }
}
