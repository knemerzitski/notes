import './dev';
import { createApolloClient } from './init/create-apollo-client';
import { createDefaultApolloClientParams } from './parameters';

export const apolloClient = createApolloClient(createDefaultApolloClientParams());
