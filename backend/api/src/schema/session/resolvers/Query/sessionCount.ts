import type { QueryResolvers } from '../../../types.generated';
export const sessionCount: NonNullable<QueryResolvers['sessionCount']> = (
  _parent,
  _arg,
  { auth: auth }
) => {
  if (!auth) return null;

  return auth.sessions.length;
};
