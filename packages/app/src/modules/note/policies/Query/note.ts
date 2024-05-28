import { FieldPolicy, Reference } from '@apollo/client';
import { Query } from '../../../../__generated__/graphql';
import { getNoteReferenceByContentId } from '../../note-by-content-id';
import { EvictFieldPolicy } from '../../../apollo-client/policy/evict';

export const note: FieldPolicy<Query['note'], Query['note'] | Reference> &
  EvictFieldPolicy = {
  // Read single note from previously cached list of notes
  read(existing, { args, cache }) {
    if (typeof args?.contentId === 'string') {
      return getNoteReferenceByContentId(cache, args.contentId);
    }
    return existing;
  },
  merge: false,
};
