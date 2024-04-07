import type { BookResolvers } from './../../types.generated';
export const Book: BookResolvers = {
  page(parent) {
    return {
      content: 'page content for' + parent.title,
    };
  }
};
