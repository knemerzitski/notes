import { ApolloError, useApolloClient } from '@apollo/client';
import mapObject from 'map-obj';
import { useEffect, useRef } from 'react';

import { gql } from '../../../__generated__/gql';
import {
  NoteCategory,
  NoteTextField,
  UseNotesConnectionQuery,
} from '../../../__generated__/graphql';
import usePauseableQuery from '../../apollo-client/hooks/usePauseableQuery';
import { useIsBackgroundLocation } from '../../router/hooks/useIsBackgroundLocation';
import { addActiveNotesByContentId } from '../active-notes';


const QUERY = gql(`
  query UseNotesConnection($last: NonNegativeInt!, $before: String, $category: NoteCategory) {
    notesConnection(last: $last, before: $before, category: $category) {
      notes {
        id
        contentId
        isOwner
        categoryName
        sharing {
          id
        }
        textFields {
          key
          value {
            id
            headText {
              revision
              changeset
            }
            viewText @client
          }
        }
      }
      pageInfo {
        hasPreviousPage
        startCursor
      }
    }
  }
`);

type NoteTransformed = Omit<
  UseNotesConnectionQuery['notesConnection']['notes'][0],
  'textFields'
> & {
  textFields: Record<
    NoteTextField,
    UseNotesConnectionQuery['notesConnection']['notes'][0]['textFields'][0]['value']
  >;
};

export interface UseNotesConnectionOptions {
  /**
   * @default 20
   */
  perPageCount?: number;
  /**
   * @default Default
   */
  category?: NoteCategory;
}

interface UseNotesConnectionResult {
  data?: {
    notes: NoteTransformed[];
  };
  fetchMore: () => Promise<void>;
  canFetchMore?: boolean;
  loading: boolean;
  error?: ApolloError;
}

export default function useNotesConnection(
  options?: UseNotesConnectionOptions
): UseNotesConnectionResult {
  const perPageCount = options?.perPageCount ?? 20;
  const category = options?.category ?? NoteCategory.Default;

  const apolloClient = useApolloClient();
  const isBackgroundLocation = useIsBackgroundLocation();

  const haveFetchedData = useRef(false);

  const {
    data,
    loading: fetchLoading,
    error,
    fetchMore,
  } = usePauseableQuery(isBackgroundLocation, QUERY, {
    variables: {
      last: perPageCount,
      category,
    },
    fetchPolicy: haveFetchedData.current ? 'cache-first' : 'cache-and-network',
  });

  useEffect(() => {
    const notes = data?.notesConnection.notes;
    if (notes) {
      addActiveNotesByContentId(apolloClient.cache, data.notesConnection.notes);
    }
    // TODO return removeActiveNote with a delay?
  }, [apolloClient, data]);

  const loading = fetchLoading && !data;

  if (loading) {
    return {
      loading,
      fetchMore: () => Promise.resolve(),
    };
  }

  if (error) {
    return {
      loading,
      error,
      fetchMore: () => Promise.resolve(),
    };
  }

  haveFetchedData.current = true;

  const notes: NoteTransformed[] =
    data?.notesConnection.notes.map((note) => {
      return {
        ...note,
        textFields: mapObject(NoteTextField, (_, key) => {
          const textField = note.textFields.find((textField) => textField.key === key);

          if (!textField) {
            throw new Error(`Note '${note.contentId}' is missing field '${key}'`);
          }

          return [key, textField.value];
        }),
      };
    }) ?? [];

  // Reverse to display newest entry first
  notes.reverse();

  const pageInfo = data?.notesConnection.pageInfo;

  async function fetchMoreUsingPageInfo() {
    if (!pageInfo) return;

    await fetchMore({
      variables: {
        last: perPageCount,
        before: pageInfo.startCursor,
        category,
      },
      // Merge result to existing
      updateQuery(previousResult, { fetchMoreResult }) {
        return {
          notesConnection: {
            ...fetchMoreResult.notesConnection,
            notes: [
              ...fetchMoreResult.notesConnection.notes,
              ...previousResult.notesConnection.notes,
            ],
            pageInfo: fetchMoreResult.notesConnection.pageInfo,
          },
        };
      },
    });
  }

  return {
    loading: false,
    data: {
      notes,
    },
    fetchMore: fetchMoreUsingPageInfo,
    canFetchMore: data?.notesConnection.pageInfo.hasPreviousPage,
  };
}
