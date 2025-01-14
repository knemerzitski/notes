import { useQuery } from '@apollo/client';
import { ReactElement } from 'react';

import { gql } from '../../__generated__';

import { useUserId } from '../context/user-id';

import { WarningBadge } from './WarningBadge';

const BadgeIfSessionExpired_Query = gql(`
  query BadgeIfSessionExpired_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) @client {
      id
      local {
        id
        sessionExpired
      }
      localOnly
    }
  }
`);

export function BadgeIfSessionExpired({ children }: { children: ReactElement }) {
  const userId = useUserId();
  const { data } = useQuery(BadgeIfSessionExpired_Query, {
    variables: {
      id: userId,
    },
  });

  if (!data?.signedInUser.local.sessionExpired) return children;

  return <WarningBadge>{children}</WarningBadge>;
}
