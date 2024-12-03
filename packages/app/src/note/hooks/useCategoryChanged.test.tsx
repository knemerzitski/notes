import { gql, NormalizedCacheObject } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { it, vi, expect } from 'vitest';

import { NoteCategory } from '../../__generated__/graphql';
import { GraphQLServiceProvider } from '../../graphql/components/GraphQLServiceProvider';

import { createGraphQLService } from '../../graphql/create/service';
import { createDefaultGraphQLServiceParams } from '../../graphql-service';
import { UserIdProvider } from '../../user/context/user-id';


import { getUserNoteLinkId } from '../utils/id';

import { useCategoryChanged } from './useCategoryChanged';

const userId = 'a';

function createNote(
  noteId: string,
  categoryName: string,
  cacheObj: NormalizedCacheObject
) {
  cacheObj[`Note:${noteId}`] = {
    __typename: 'UserNoteLink',
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

it('runs callback on category change', async () => {
  const params = createDefaultGraphQLServiceParams();
  params.terminatingLink = new MockLink([]);
  params.context.getUserId = () => userId;
  const service = createGraphQLService(params);
  const cache = service.client.cache;

  const noteId = '1';

  const cacheObj = {};
  createNote(noteId, NoteCategory.DEFAULT, cacheObj);
  cache.restore(cacheObj);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <GraphQLServiceProvider service={service}>
        <UserIdProvider userId={userId}>{children}</UserIdProvider>
      </GraphQLServiceProvider>
    );
  }

  function setCategory(categoryName: NoteCategory) {
    cache.writeQuery({
      query: gql`
        query Test($id: ObjectID!) {
          userNoteLink(by: { noteId: $id }) {
            categoryName
          }
        }
      `,
      variables: {
        id: noteId,
      },
      data: {
        __typename: 'Query',
        userNoteLink: {
          __typename: 'UserNoteLink',
          id: getUserNoteLinkId(noteId, userId),
          categoryName,
        },
      },
    });
  }

  const callbackFn = vi.fn();

  renderHook(
    () => {
      useCategoryChanged('1', callbackFn);
    },
    {
      wrapper: Wrapper,
    }
  );

  setCategory(NoteCategory.ARCHIVE);
  expect(callbackFn.mock.calls).toStrictEqual([]);
  await new Promise(process.nextTick.bind(process));
  expect(callbackFn.mock.calls).toStrictEqual([
    [NoteCategory.DEFAULT],
    [NoteCategory.ARCHIVE],
  ]);

  setCategory(NoteCategory.DEFAULT);
  await new Promise(process.nextTick.bind(process));
  expect(callbackFn.mock.calls).toStrictEqual([
    [NoteCategory.DEFAULT],
    [NoteCategory.ARCHIVE],
    [NoteCategory.DEFAULT],
  ]);

  cache.evict({
    id: `UserNoteLink:${getUserNoteLinkId(noteId, userId)}`,
  });
  await new Promise(process.nextTick.bind(process));
  expect(callbackFn.mock.calls).toStrictEqual([
    [NoteCategory.DEFAULT],
    [NoteCategory.ARCHIVE],
    [NoteCategory.DEFAULT],
    [false],
  ]);
});
