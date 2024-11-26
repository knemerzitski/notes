import { ApolloCache } from '@apollo/client';
import {
  AddRecordToConnectionCollabTextRecordFragmentFragment,
  CollabText,
} from '../../../__generated__/graphql';
import { gql } from '../../../__generated__';

const _AddRecordToConnection_CollabTextRecordFragment = gql(`
  fragment AddRecordToConnection_CollabTextRecordFragment on CollabTextRecord {
    id
    creatorUser {
      id
    }
    change {
      revision
      changeset
    }
    beforeSelection {
      start
      end
    }
    afterSelection {
      start
      end
    }
  }
`);

const AddRecordToConnection_CollabTextFragment = gql(`
  fragment AddRecordToConnection_CollabTextFragment on CollabText {
    recordConnection {
      edges {
        node {
          ...AddRecordToConnection_CollabTextRecordFragment
        }
      }
    }
  }
`);

export function addRecordToConnection(
  collabTextId: CollabText['id'],
  record: AddRecordToConnectionCollabTextRecordFragmentFragment,
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
