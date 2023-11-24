import type { QueryResolvers } from '../../../types.generated';
export const activeSessionIndex: NonNullable<QueryResolvers['activeSessionIndex']> = (
  _parent,
  _arg,
  { auth: auth }
) => {
  if (!auth) return null;

  return auth.sessionIndex;
};
