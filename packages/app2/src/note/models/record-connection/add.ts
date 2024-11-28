import { ApolloCache } from '@apollo/client';
import {
  CollabText,
  MapRecordCollabTextRecordFragmentFragment,
} from '../../../__generated__/graphql';
import { gql } from '../../../__generated__';

const AddRecordToConnection_CollabTextFragment = gql(`
  fragment AddRecordToConnection_CollabTextFragment on CollabText {
    recordConnection {
      edges {
        node {
          ...MapRecord_CollabTextRecordFragment
        }
      }
    }
  }
`);

export function addRecordToConnection(
  collabTextId: CollabText['id'],
  record: MapRecordCollabTextRecordFragmentFragment,
  cache: Pick<ApolloCache<unknown>, 'writeFragment'>
) {
  cache.writeFragment({
    fragment: AddRecordToConnection_CollabTextFragment,
    fragmentName: 'AddRecordToConnection_CollabTextFragment',
    id: collabTextId,
    data: {
      __typename: 'CollabText',
      recordConnection: {
        __typename: 'CollabTextRecordConnection',
        edges: [{ __typename: 'CollabTextRecordEdge', node: record }],
      },
    },
  });
}
