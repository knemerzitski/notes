import type { QueryResolvers } from './../../../types.generated';
export const book: NonNullable<QueryResolvers['book']> = (_parent, _arg, _ctx) => {
  return {
    title: 'hi there',
  };
};
