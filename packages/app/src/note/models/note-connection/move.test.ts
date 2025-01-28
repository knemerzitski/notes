/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloCache, gql, NormalizedCacheObject } from '@apollo/client';
import { it, expect, beforeEach, describe, vi, afterEach } from 'vitest';

import { NoteCategory, ListAnchorPosition } from '../../../__generated__/graphql';
import { createGraphQLService } from '../../../graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../../graphql-service';
import * as generateId from '../../../user/models/local-user/generate-id';
import { setCurrentUser } from '../../../user/models/signed-in-user/set-current';
import { getUserNoteLinkId } from '../../utils/id';

import { moveNoteInConnection } from './move';

let cache: ApolloCache<NormalizedCacheObject>;
const userId = 'a';
const danglingNoteId = 'dangling';

beforeEach(() => {
  vi.spyOn(generateId, 'generateSignedInUserId').mockReturnValueOnce(userId);
  const params = createDefaultGraphQLServiceParams();
  const service = createGraphQLService(params);
  cache = service.client.cache;

  const cacheObj = {};
  createNotesAndAddToList(['1', '2', '3', '4'], 'default', cacheObj);
  createNotesAndAddToList(['a', 'b', 'c', 'd'], 'archive', cacheObj);
  createNotesAndAddToList([], 'empty', cacheObj);
  createNote(danglingNoteId, 'unknown', cacheObj);
  cache.restore(cacheObj);
  setCurrentUser(userId, cache);
});

afterEach(() => {
  vi.clearAllMocks();
});

function _userNoteLinkId(noteId: string) {
  return getUserNoteLinkId(noteId, userId);
}

function createNote(
  noteId: string,
  categoryName: string,
  cacheObj: NormalizedCacheObject
) {
  cacheObj[`Note:${noteId}`] = {
    __typename: 'Note',
    id: noteId,
  };

  const noteLinkId = getUserNoteLinkId(noteId, userId);
  cacheObj[`UserNoteLink:${noteLinkId}`] = {
    __typename: 'UserNoteLink',
    id: noteLinkId,
    categoryName,
    note: { __ref: `Note:${noteId}` },
  };
}

function addNoteToList(
  noteId: string,
  categoryName: string,
  cacheObj: NormalizedCacheObject
) {
  const signedInUserKey = `SignedInUser:${userId}`;
  let signedInUser: any = cacheObj[signedInUserKey];
  if (!signedInUser) {
    signedInUser = {
      __typename: 'SignedInUser',
      id: userId,
    };
  }
  cacheObj[signedInUserKey] = signedInUser;

  const noteLinkConnectionKey = `noteLinkConnection:{"category":"${categoryName}"}`;
  let noteLinkConnection: any = signedInUser[noteLinkConnectionKey];
  if (!noteLinkConnection) {
    noteLinkConnection = {
      __typename: 'UserNoteLinkConnection',
      edges: [],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
      },
    };
    signedInUser[noteLinkConnectionKey] = noteLinkConnection;
  }

  noteLinkConnection.edges.push({
    __typename: 'UserNoteLinkEdge',
    node: {
      __ref: `UserNoteLink:${getUserNoteLinkId(noteId, userId)}`,
    },
  });

  const noteLink = cacheObj[`UserNoteLink:${getUserNoteLinkId(noteId, userId)}`]!;
  noteLink.connectionCategoryName = categoryName;
}

function createNotesAndAddToList(
  noteIds: string[],
  categoryName: string,
  cacheObj: NormalizedCacheObject
) {
  noteIds.forEach((noteId) => {
    createNote(noteId, categoryName, cacheObj);
    addNoteToList(noteId, categoryName, cacheObj);
  });
}

function getCacheNoteIds(categoryName: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data: any = cache.readQuery({
    query: gql(`
      query($userId: ObjectID!) {
        signedInUser(by: {id: $userId}) {
          id
          noteLinkConnection(category: $category) {
            edges {
              node {
                id
                note {
                  id
                }
              }
            }
          }
        }
      }
    `),
    variables: {
      userId,
      category: categoryName,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return data.signedInUser.noteLinkConnection.edges.map((edge: any) => edge.node.note.id);
}

describe('same category', () => {
  it('left to right, after', () => {
    moveNoteInConnection(
      {
        noteId: '1',
      },
      {
        categoryName: 'default' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('3'),
        },
        anchorPosition: ListAnchorPosition.AFTER,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['2', '3', '1', '4']);
  });

  it('left to right, before', () => {
    moveNoteInConnection(
      {
        noteId: '1',
      },
      {
        categoryName: 'default' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('3'),
        },
        anchorPosition: ListAnchorPosition.BEFORE,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['2', '1', '3', '4']);
  });

  it('right to left, after', () => {
    moveNoteInConnection(
      {
        noteId: '3',
      },
      {
        categoryName: 'default' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('1'),
        },
        anchorPosition: ListAnchorPosition.AFTER,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['1', '3', '2', '4']);
  });

  it('right to left, before', () => {
    moveNoteInConnection(
      {
        noteId: '3',
      },
      {
        categoryName: 'default' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('1'),
        },
        anchorPosition: ListAnchorPosition.BEFORE,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['3', '1', '2', '4']);
  });

  it('anchor points to same index, after', () => {
    moveNoteInConnection(
      {
        noteId: '3',
      },
      {
        categoryName: 'default' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('2'),
        },
        anchorPosition: ListAnchorPosition.AFTER,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['1', '2', '3', '4']);
  });

  it('anchor points to same index, before', () => {
    moveNoteInConnection(
      {
        noteId: '2',
      },
      {
        categoryName: 'default' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('3'),
        },
        anchorPosition: ListAnchorPosition.BEFORE,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['1', '2', '3', '4']);
  });

  it('anchor self, after', () => {
    moveNoteInConnection(
      {
        noteId: '3',
      },
      {
        categoryName: 'default' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('3'),
        },
        anchorPosition: ListAnchorPosition.AFTER,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['1', '2', '3', '4']);
  });

  it('anchor self, before', () => {
    moveNoteInConnection(
      {
        noteId: '3',
      },
      {
        categoryName: 'default' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('3'),
        },
        anchorPosition: ListAnchorPosition.BEFORE,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['1', '2', '3', '4']);
  });
});

describe('from one category to other', () => {
  it('before', () => {
    moveNoteInConnection(
      {
        noteId: '2',
      },
      {
        categoryName: 'archive' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('c'),
        },
        anchorPosition: ListAnchorPosition.BEFORE,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['1', '3', '4']);
    expect(getCacheNoteIds('archive')).toStrictEqual(['a', 'b', '2', 'c', 'd']);
  });

  it('after', () => {
    moveNoteInConnection(
      {
        noteId: '2',
      },
      {
        categoryName: 'archive' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('c'),
        },
        anchorPosition: ListAnchorPosition.AFTER,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['1', '3', '4']);
    expect(getCacheNoteIds('archive')).toStrictEqual(['a', 'b', 'c', '2', 'd']);
  });
});

describe('not in any category', () => {
  it('before', () => {
    moveNoteInConnection(
      {
        noteId: danglingNoteId,
      },
      {
        categoryName: 'default' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('3'),
        },
        anchorPosition: ListAnchorPosition.BEFORE,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual([
      '1',
      '2',
      danglingNoteId,
      '3',
      '4',
    ]);
  });

  it('after', () => {
    moveNoteInConnection(
      {
        noteId: danglingNoteId,
      },
      {
        categoryName: 'default' as NoteCategory,
        anchorUserNoteLink: {
          id: _userNoteLinkId('3'),
        },
        anchorPosition: ListAnchorPosition.AFTER,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual([
      '1',
      '2',
      '3',
      danglingNoteId,
      '4',
    ]);
  });
});

describe('no anchor', () => {
  it('not in any category, insert at 0', () => {
    moveNoteInConnection(
      {
        noteId: danglingNoteId,
      },
      {
        categoryName: 'default' as NoteCategory,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual([
      danglingNoteId,
      '1',
      '2',
      '3',
      '4',
    ]);
  });

  it('in same category, no change', () => {
    moveNoteInConnection(
      {
        noteId: '3',
      },
      {
        categoryName: 'default' as NoteCategory,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['1', '2', '3', '4']);
  });

  it('in different category, insert at 0', () => {
    moveNoteInConnection(
      {
        noteId: 'a',
      },
      {
        categoryName: 'default' as NoteCategory,
      },
      cache
    );

    expect(getCacheNoteIds('default')).toStrictEqual(['a', '1', '2', '3', '4']);
    expect(getCacheNoteIds('archive')).toStrictEqual(['b', 'c', 'd']);
  });
});

it('note not found throws error', () => {
  expect(() =>
    moveNoteInConnection(
      {
        noteId: 'ABC',
      },
      {
        categoryName: NoteCategory.ARCHIVE,
      },
      cache
    )
  ).toThrow();
});
