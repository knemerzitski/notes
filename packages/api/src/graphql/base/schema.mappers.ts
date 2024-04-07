import { ResolverTypeWrapper } from '../types.generated';

export interface PageInfoMapper {
  hasPreviousPage(): ResolverTypeWrapper<boolean>;
  startCursor(): ResolverTypeWrapper<string>;
  hasNextPage(): ResolverTypeWrapper<boolean>;
  endCursor(): ResolverTypeWrapper<string>;
}
