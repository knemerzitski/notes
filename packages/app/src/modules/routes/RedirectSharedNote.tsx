import { useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { gql } from '../../__generated__/gql';
import ErrorLink from '../apollo-client/links/error-link';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import isErrorCode from '../apollo-client/utils/isErrorCode';
import { useRouteSnackbarError } from '../common/components/RouteSnackbarAlertProvider';
import { useProxyNavigate } from '../router/context/ProxyRoutesProvider';
import { insertNoteToNotesConnection } from '../note/policies/Query/notesConnection';

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

export default function RedirectSharedNote() {
  const [searchParams] = useSearchParams();
  const shareId = searchParams.get('share');
  const navigate = useProxyNavigate();
  const apolloClient = useApolloClient();
  const showRouteError = useRouteSnackbarError();
  const fetchingRef = useRef(false);

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
            GraphQLErrorCode.NotFound,
            GraphQLErrorCode.Unauthenticated,
          ],
        },
        errorPolicy: 'all',
      })
      .then(({ data, errors }) => {
        if (isErrorCode(errors, GraphQLErrorCode.NotFound)) {
          showRouteError('Share note not found');
          return;
        } else if (isErrorCode(errors, GraphQLErrorCode.Unauthenticated)) {
          showRouteError('You must be logged in to access shared note');
          return;
        }

        if (!data) return;

        insertNoteToNotesConnection(apolloClient.cache, data.linkSharedNote.note);

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
  }, [shareId, apolloClient, navigate, showRouteError]);

  return null;
}
