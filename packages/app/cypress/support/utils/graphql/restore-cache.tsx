import { GraphQLService } from '../../../../src/graphql/types';

export async function restoreCache(graphQLService: GraphQLService) {
  await graphQLService.persistor.restore();
}
