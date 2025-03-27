import { setDefaultPerPageCount } from '../../../../src/device-preferences/models/per-page-count/set';
import { GraphQLService } from '../../../../src/graphql/types';

export function setPerPageCount({
  perPageCount,
  graphQLService,
}: {
  perPageCount: number;
  graphQLService: GraphQLService;
}) {
  setDefaultPerPageCount(perPageCount, graphQLService.client.cache);
}
