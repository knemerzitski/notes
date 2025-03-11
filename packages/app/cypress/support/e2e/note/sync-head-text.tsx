import { Note } from '../../../../src/__generated__/graphql';
import { GraphQLService } from '../../../../src/graphql/types';
import { gql } from '@apollo/client';
import { SyncHeadText } from '../../../../src/note/components/SyncHeadText';
import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { NoteIdProvider } from '../../../../src/note/context/note-id';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';
import { render } from '@testing-library/react';
import { getCurrentUserId } from '../../../../src/user/models/signed-in-user/get-current';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      syncHeadText: (options: SyncHeadTextOptions) => Chainable<void>;
    }
  }
}

interface SyncHeadTextOptions {
  graphQLService: GraphQLService;
  noteId: Note['id'];
}

const Test_SyncHeadTextQuery = gql(`
  query Test_SyncHeadTextQuery($userId: ObjectID!, $noteId: ObjectID!) {
    signedInUser(by: {id: $userId}){
      id
      note(by: {id: $noteId}) {
        id
        collabText {
          id
          headText {
            revision
            changeset
          }
        }
      }
    }
  }
`);

Cypress.Commands.add(
  'syncHeadText',
  ({ graphQLService, noteId }: SyncHeadTextOptions) => {
    return cy.then(async () => {
      // SyncHeadText Contains logic to handle new headText
      const { unmount } = render(
        <GraphQLServiceProvider service={graphQLService}>
          <CurrentUserIdProvider>
            <NoteIdProvider noteId={noteId}>
              <SyncHeadText />
            </NoteIdProvider>
          </CurrentUserIdProvider>
        </GraphQLServiceProvider>
      );

      await graphQLService.client.query({
        query: Test_SyncHeadTextQuery,
        variables: {
          userId: getCurrentUserId(graphQLService.client.cache),
          noteId,
        },
      });

      // SyncHeadText logic is no longer needed after query is done
      unmount();
    });
  }
);
