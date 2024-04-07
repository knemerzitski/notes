import type { PageInfoResolvers } from '../../../graphql/types.generated';

export const PageInfo: PageInfoResolvers = {
  endCursor: (parent) => {
    return parent.endCursor();
  },
  hasNextPage: (parent) => {
    return parent.hasNextPage();
  },
  hasPreviousPage: (parent) => {
    return parent.hasPreviousPage();
  },
  startCursor: (parent) => {
    return parent.startCursor();
  },
};
