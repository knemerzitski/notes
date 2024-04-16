import mapObject, { mapObjectSkip } from 'map-obj';
import { UserNoteLookupInput } from '../../../../mongodb/operations/lookup/userNoteLookup';
import { paginationStringToInt } from '../../../../mongodb/operations/pagination/relayArrayPagination';
import revisionRecordsPagination from '../../../../mongodb/operations/pagination/revisionRecordsPagination';
import { MergedDeepQuery } from '../../../../mongodb/query-builder';
import { NoteTextField } from '../../../types.generated';
import { NoteQuery } from '../../mongo-query-mapper/note';
import { ApiGraphQLContext } from '../../../context';
import { CollectionName } from '../../../../mongodb/collections';

/**
 * Translates query to lookup input used in by userNoteLookup
 */
export default function userNoteQueryToLookupInput(
  userNoteQuery: MergedDeepQuery<NoteQuery>,
  context: {
    mongodb: {
      collections: Pick<
        ApiGraphQLContext['mongodb']['collections'],
        CollectionName.Notes | CollectionName.CollabTexts
      >;
    };
  }
): UserNoteLookupInput<NoteTextField> {
  const { note: noteQuery, ...queryAllExceptNote } = userNoteQuery;

  const userNote_note_Project: Record<string, unknown> = {
    publicId: 1,
  };

  const userNoteProject: MergedDeepQuery<NoteQuery> = { ...queryAllExceptNote };
  if (!userNoteProject._id) {
    userNoteProject._id = 0;
  }

  let noteLookupInput: UserNoteLookupInput<NoteTextField>['note'] | undefined = undefined;
  let collabTextLookupInput:
    | UserNoteLookupInput<NoteTextField>['collabText']
    | undefined = undefined;
  if (noteQuery) {
    const { id, collabTexts, ...noteProject } = noteQuery;

    if (id) {
      userNote_note_Project.id = 1;
    }

    if (Object.keys(noteProject).length > 0) {
      noteLookupInput = {
        collectionName: context.mongodb.collections[CollectionName.Notes].collectionName,
        pipeline: [{ $project: noteProject }],
      };
      Object.assign(userNote_note_Project, noteProject);
    }

    if (collabTexts) {
      collabTextLookupInput = {
        collectionName:
          context.mongodb.collections[CollectionName.CollabTexts].collectionName,
        collabTexts: mapObject(collabTexts, (key, query) => {
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
      userNote_note_Project.collabTexts = 1;
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
