import mapObject, { mapObjectSkip } from 'map-obj';
import { UserNoteLookupInput } from '../../../../mongoose/operations/lookup/userNoteLookup';
import { paginationStringToInt } from '../../../../mongoose/operations/pagination/relayArrayPagination';
import revisionRecordsPagination from '../../../../mongoose/operations/pagination/revisionRecordsPagination';
import { MergedDeepQuery } from '../../../../mongoose/query-builder';
import { NoteTextField } from '../../../types.generated';
import { NoteQueryType } from '../../mongo-query-mapper/note';
import { NoteBatchLoadContext } from '../noteBatchLoad';

/**
 * Translates query to lookup input used in by userNoteLookup
 */
export default function userNoteQueryToLookupInput(
  userNoteQuery: MergedDeepQuery<NoteQueryType>,
  context: {
    mongoose: {
      models: Pick<NoteBatchLoadContext['mongoose']['models'], 'Note' | 'CollabText'>;
    };
  }
): UserNoteLookupInput<NoteTextField> {
  const { note: noteQuery, ...queryAllExceptNote } = userNoteQuery;

  const userNote_note_Project: Record<string, unknown> = {
    publicId: 1,
  };

  const userNoteProject: MergedDeepQuery<NoteQueryType> = { ...queryAllExceptNote };
  if (!userNoteProject._id) {
    userNoteProject._id = 0;
  }

  let noteLookupInput: UserNoteLookupInput<NoteTextField>['note'] | undefined = undefined;
  let collabTextLookupInput:
    | UserNoteLookupInput<NoteTextField>['collabText']
    | undefined = undefined;
  if (noteQuery) {
    const { id, collabText, ...noteProject } = noteQuery;

    if (id) {
      userNote_note_Project.id = 1;
    }

    if (Object.keys(noteProject).length > 0) {
      noteLookupInput = {
        collectionName: context.mongoose.models.Note.collection.collectionName,
        pipeline: [{ $project: noteProject }],
      };
      Object.assign(userNote_note_Project, noteProject);
    }

    if (collabText) {
      collabTextLookupInput = {
        collectionName: context.mongoose.models.CollabText.collection.collectionName,
        collabText: mapObject(collabText, (key, query) => {
          if (!query) return mapObjectSkip;

          if (!query._id) {
            query._id = 0;
          }

          return [
            key,
            {
              pipeline: [
                ...(query.records?.$paginations
                  ? [
                      {
                        $set: {
                          records: revisionRecordsPagination({
                            defaultSlice: 'end',
                            paginations:
                              query.records.$paginations.map(paginationStringToInt),
                          }),
                        },
                      },
                    ]
                  : []),
                {
                  $project: {
                    ...query,
                    records: query.records?.$query
                      ? {
                          array: {
                            ...query.records.$query,
                            revision: 1,
                          },
                          sizes: 1,
                        }
                      : undefined,
                  },
                },
              ],
            },
          ];
        }),
      };
      userNote_note_Project.collabText = 1;
    }
  }

  return {
    note: noteLookupInput,
    collabText: collabTextLookupInput,
    postLookup: [
      {
        $project: {
          ...userNoteProject,
          ...(Object.keys(userNote_note_Project).length > 0
            ? { note: userNote_note_Project }
            : {}),
        },
      },
    ],
  };
}
