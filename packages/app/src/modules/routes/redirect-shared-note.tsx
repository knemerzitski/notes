import { useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { gql } from '../../__generated__/gql';
import { ErrorLink } from '../apollo-client/links/error-link';
import { isErrorCode } from '../apollo-client/utils/is-error-code';
import { useRouteSnackbarError } from '../common/components/route-snackbar-alert-provider';
import { useInsertNoteToNotesConnection } from '../note/remote/hooks/use-insert-note-to-notes-connection';
import { useProxyNavigate } from '../router/context/proxy-routes-provider';

const MUTATION_LINK = gql(`
  mutation RedirectSharedNoteLinkPage($input: LinkSharedNoteInput!) {
   linkSharedNote(input: $input) {
     note {
       id
       contentId
       isOwner
       textFields {
        key
        value {
          id
          headText {
            revision
            changeset
          }
        }
       }
       sharing {
         id
       }
     }
   }
  }
 `);

export function RedirectSharedNote() {
  const [searchParams] = useSearchParams();
  const shareId = searchParams.get('share');
  const navigate = useProxyNavigate();
  const apolloClient = useApolloClient();
  const showRouteError = useRouteSnackbarError();
  const fetchingRef = useRef(false);
  const insertNoteToNotesConnection = useInsertNoteToNotesConnection();

  useEffect(() => {
    if (!shareId || fetchingRef.current) return;

    fetchingRef.current = true;
    void apolloClient
      .mutate({
        mutation: MUTATION_LINK,
        variables: {
          input: {
            shareId,
          },
        },
        context: {
          [ErrorLink.IGNORE_CONTEXT_KEY]: [
            GraphQLErrorCode.NOT_FOUND,
            GraphQLErrorCode.UNAUTHENTICATED,
          ],
        },
        errorPolicy: 'all',
      })
      .then(({ data, errors }) => {
        if (isErrorCode(errors, GraphQLErrorCode.NOT_FOUND)) {
          showRouteError('Share note not found');
          return;
        } else if (isErrorCode(errors, GraphQLErrorCode.UNAUTHENTICATED)) {
          showRouteError('You must be logged in to access shared note');
          return;
        }

        if (!data) return;

        insertNoteToNotesConnection(data.linkSharedNote.note);

        const noteContentId = data.linkSharedNote.note.contentId;
        navigate(`/note/${noteContentId}`, {
          replace: true,
          state: {
            autoFocus: true,
            replaced: true,
          },
        });
      })
      .finally(() => {
        fetchingRef.current = false;
      });
  }, [shareId, apolloClient, navigate, showRouteError, insertNoteToNotesConnection]);

  return null;
}
