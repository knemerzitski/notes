import { FieldPolicy, Reference } from '@apollo/client';
import { Query } from '../../../../__generated__/graphql';
import { getNoteReferenceByContentId } from '../../note-by-content-id';

export const note: FieldPolicy<Query['note'], Query['note'] | Reference> = {
  // Read single note from previously cached list of notes
  read(existing, { args }) {
    if (typeof args?.contentId === 'string') {
      return getNoteReferenceByContentId(args.contentId);
    }
    return existing;
  },
};
