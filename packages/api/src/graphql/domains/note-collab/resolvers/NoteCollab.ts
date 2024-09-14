import { QueryableCollabText } from '../../../../mongodb/loaders/note/descriptions/collab-text';
import { objectIdToStr } from '../../../../mongodb/utils/objectid';
import { type NoteCollabResolvers } from '../../types.generated';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { InferRaw } from 'superstruct';
import { Changeset } from '~collab/changeset/changeset';

const DEFAULT_COLLAB_TEXT: InferRaw<typeof QueryableCollabText> = {
  updatedAt: new Date(0),
  headText: {
    changeset: Changeset.EMPTY.serialize(),
    revision: 0,
  },
  tailText: {
    changeset: Changeset.EMPTY.serialize(),
    revision: 0,
  },
  records: [],
};

export const NoteCollab: NoteCollabResolvers = {
  text: (parent, _arg, _ctx) => {
    return {
      id: async () => {
        return objectIdToStr(
          (
            await parent.query({
              _id: 1,
            })
          )?._id
        );
      },
      query: createMapQueryFn(parent.query)<typeof QueryableCollabText>()(
        (query) => ({ collabText: query }),
        (result) => result.collabText ?? DEFAULT_COLLAB_TEXT
      ),
    };
  },
};
