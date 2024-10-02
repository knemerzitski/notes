import './dev';
import { createApolloClient } from './init/apollo-client';
import { createDefaultApolloClientParams } from './parameters';

export const apolloClient = createApolloClient(createDefaultApolloClientParams());
