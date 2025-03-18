import { GraphQLService } from '../../../../src/graphql/types';

export async function persistCache(graphQLService: GraphQLService) {
  await graphQLService.persistor.persist();
}
