/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import mapObject from 'map-obj';
import { assert, beforeAll, expect, it } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import { createGraphQLResolversContext } from '../../../../__test__/helpers/graphql/graphql-context';
import {
  mongoCollections,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import {
  populateNotes,
  populateNotesWithText,
} from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { GraphQLResolversContext } from '../../../context';
import { NoteConnection, NoteTextField } from '../../../types.generated';

const QUERY = `#graphql
  query($searchText: String! $after: String, $first: NonNegativeInt) {
    notesAdvancedSearchConnection(searchText: $searchText, after: $after, first: $first){
      notes {
        textFields {
          key
          value {
            headText {
              changeset
            }
          }
        }
      }
    }
  }
`;

let populateResult: ReturnType<typeof populateNotes>;
let user: UserSchema;
let contextValue: GraphQLResolversContext;

beforeAll(async () => {
  faker.seed(42347);
  await resetDatabase();

  populateResult = populateNotesWithText([
    {
      [NoteTextField.TITLE]: 'foo',
      [NoteTextField.CONTENT]: 'bar',
    },
    {
      [NoteTextField.TITLE]: 'bar',
      [NoteTextField.CONTENT]: 'bar',
    },
    {
      [NoteTextField.TITLE]: 'foo',
      [NoteTextField.CONTENT]: 'foo',
    },
  ]);

  user = populateResult.user;

  await populateExecuteAll();

  contextValue = createGraphQLResolversContext(user);

  // TOOD defined search index in note schema
  const searchIndexes = await mongoCollections.notes.listSearchIndexes().toArray();
  if (searchIndexes.length > 0) {
    await mongoCollections.notes.dropSearchIndex('collabTextsHeadText');
  }
  await mongoCollections.notes.createSearchIndex({
    name: 'collabTextsHeadText',
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          userNotes: {
            type: 'document',
            fields: {
              userId: {
                type: 'objectId',
              },
            },
          },
          collabTexts: {
            type: 'document',
            fields: mapObject(NoteTextField, (_key, fieldName) => [
              fieldName,
              {
                type: 'document',
                fields: {
                  headText: {
                    type: 'document',
                    fields: {
                      changeset: {
                        type: 'string',
                        analyzer: 'lucene.english',
                      },
                    },
                  },
                },
              },
            ]),
          },
        },
      },
    },
  });

  // Wait for search index to be ready
  while (
    (
      (await mongoCollections.notes.listSearchIndexes().next()) as {
        name: string;
        status: string;
      } | null
    )?.status !== 'READY'
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
});

it('finds a note, first: 1', async () => {
  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        searchText: 'foo',
        first: 1,
      },
    },
    {
      contextValue,
    }
  );

  assert(response.body.kind === 'single');
  const { data, errors } = response.body.singleResult;
  expect(errors).toBeUndefined();
  const typedData = data as { notesAdvancedSearchConnection: NoteConnection };

  expect(
    typedData.notesAdvancedSearchConnection.notes.map((note) => {
      const titleField = note.textFields.find(
        (textField) => textField.key === NoteTextField.TITLE
      );
      const contentField = note.textFields.find(
        (textField) => textField.key === NoteTextField.CONTENT
      );
      const titleText = Changeset.parseValue(
        titleField?.value.headText.changeset
      ).joinInsertions();
      const contentText = Changeset.parseValue(
        contentField?.value.headText.changeset
      ).joinInsertions();
      return {
        title: titleText,
        content: contentText,
      };
    })
  ).toStrictEqual([{ title: 'foo', content: 'foo' }]);
});
