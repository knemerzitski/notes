import { ResolversTypes } from '../types.generated';

export interface PageInfoMapper {
  hasPreviousPage(): ResolversTypes['Boolean'];
  startCursor(): ResolversTypes['Cursor'];
  hasNextPage(): ResolversTypes['Boolean'];
  endCursor(): ResolversTypes['Cursor'];
}
