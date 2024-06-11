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
        CollectionName.Notes | CollectionName.CollabTexts | CollectionName.ShareNoteLinks
      >;
    };
  }
): UserNoteLookupInput<NoteTextField> {
  const {
    note: noteQuery,
    shareNoteLinks: shareNoteLinkQuery,
    ...queryAllRemaining
  } = userNoteQuery;

  const postProject: {
    note: Record<string, unknown>;
    _id?: unknown;
    shareNoteLinks?: unknown;
  } = {
    ...queryAllRemaining,
    note: { publicId: 1 },
  };
  if (!postProject._id) {
    postProject._id = 0;
  }

  let noteLookupInput: UserNoteLookupInput<NoteTextField>['note'] | undefined;
  let collabTextLookupInput:
    | UserNoteLookupInput<NoteTextField>['collabText']
    | undefined = undefined;
  if (noteQuery) {
    const userNote_note_Project: Record<string, unknown> = {};

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

    if (Object.keys(userNote_note_Project).length > 0) {
      Object.assign(postProject.note, userNote_note_Project);
    }
  }

  let shareNoteLinkLookupInput:
    | UserNoteLookupInput<NoteTextField>['shareNoteLink']
    | undefined;
  if (shareNoteLinkQuery?.$query && Object.keys(shareNoteLinkQuery.$query).length > 0) {
    if (!shareNoteLinkQuery.$query._id) {
      shareNoteLinkQuery.$query._id = 0;
    }
    // Ignores $pagination and returns all shareNoteLinks in array
    shareNoteLinkLookupInput = {
      collectionName:
        context.mongodb.collections[CollectionName.ShareNoteLinks].collectionName,
      pipeline: [{ $project: shareNoteLinkQuery.$query }],
    };
    postProject.shareNoteLinks = 1;
  }

  return {
    note: noteLookupInput,
    collabText: collabTextLookupInput,
    shareNoteLink: shareNoteLinkLookupInput,
    postLookup: [
      {
        $project: postProject,
      },
    ],
  };
}
