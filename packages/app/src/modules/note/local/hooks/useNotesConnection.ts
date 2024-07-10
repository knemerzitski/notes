import mapObject from 'map-obj';

import { gql } from '../../../../__generated__/gql';
import {
  NoteTextField,
  UseLocalNotesConnectionQuery,
} from '../../../../__generated__/graphql';
import usePauseableQuery from '../../../apollo-client/hooks/usePauseableQuery';
import { useIsBackgroundLocation } from '../../../router/hooks/useIsBackgroundLocation';

const QUERY = gql(`
  query UseLocalNotesConnection($last: NonNegativeInt!, $before: NonNegativeInt) {
    localNotesConnection(last: $last, before: $before) @client {
      edges {
        node {
          id
          textFields {
            key
            value {
              id
              viewText
            }
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
  UseLocalNotesConnectionQuery['localNotesConnection']['edges'][0]['node'],
  'textFields'
> & {
  textFields: Record<
    NoteTextField,
    UseLocalNotesConnectionQuery['localNotesConnection']['edges'][0]['node']['textFields'][0]['value']
  >;
};

export interface UseNotesConnectionOptions {
  /**
   * @default 20
   */
  perPageCount?: number;
}

interface UseNotesConnectionResult {
  data: {
    notes: NoteTransformed[];
  };
  fetchMore: () => Promise<void>;
  canFetchMore?: boolean;
}

export default function useNotesConnection(
  options?: UseNotesConnectionOptions
): UseNotesConnectionResult {
  const perPageCount = options?.perPageCount ?? 20;

  const isBackgroundLocation = useIsBackgroundLocation();

  const { data, fetchMore } = usePauseableQuery(isBackgroundLocation, QUERY, {
    variables: {
      last: perPageCount,
    },
    fetchPolicy: 'cache-only',
  });

  const notes: NoteTransformed[] =
    data?.localNotesConnection.edges.map(({ node: note }) => {
      return {
        ...note,
        textFields: mapObject(NoteTextField, (_, key) => {
          const textField = note.textFields.find((textField) => textField.key === key);

          if (!textField) {
            throw new Error(`LocalNote is missing field '${key}'`);
          }

          return [key, textField.value];
        }),
      };
    }) ?? [];

  // Reverse to display newest entry first
  notes.reverse();

  const pageInfo = data?.localNotesConnection.pageInfo;

  async function fetchMoreUsingPageInfo() {
    if (!pageInfo) return;

    await fetchMore({
      variables: {
        last: perPageCount,
        before: pageInfo.startCursor,
      },
      // Merge result to existing
      updateQuery(previousResult, { fetchMoreResult }) {
        return {
          localNotesConnection: {
            ...fetchMoreResult.localNotesConnection,
            edges: [
              ...fetchMoreResult.localNotesConnection.edges,
              ...previousResult.localNotesConnection.edges,
            ],
            pageInfo: fetchMoreResult.localNotesConnection.pageInfo,
          },
        };
      },
    });
  }

  return {
    data: {
      notes,
    },
    fetchMore: fetchMoreUsingPageInfo,
    canFetchMore: data?.localNotesConnection.pageInfo.hasPreviousPage,
  };
}
