import { Changeset } from '~collab/changeset/changeset';
import { QueryableCollabText } from '../../../../mongodb/loaders/note/descriptions/collab-text';
import { objectIdToStr } from '../../../../mongodb/utils/objectid';
import { NoteTextField, type NoteCollabResolvers } from '../../types.generated';

const DEFAULT_COLLAB_TEXT: QueryableCollabText = {
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
  textFields: (parent, arg, _ctx) => {
    const fields = arg.name ? [arg.name] : Object.values(NoteTextField);
    return fields.map((fieldName) => {
      return {
        key: fieldName,
        value: {
          id: async () => {
            const noteId = objectIdToStr(
              (
                await parent.query({
                  _id: 1,
                })
              )?._id
            );
            if (!noteId) return null;

            return `${noteId}:${fieldName}`;
          },
          query: async (query) =>
            (
              await parent.query({
                collab: {
                  texts: {
                    [fieldName]: query,
                  },
                },
              })
            )?.collab?.texts?.[fieldName] ?? DEFAULT_COLLAB_TEXT,
        },
      };
    });
  },
  updatedAt: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        collab: {
          updatedAt: 1,
        },
      })
    )?.collab?.updatedAt;
  },
};
