import { ApolloCache } from '@apollo/client';
import { DefinedMap } from '~utils/map/defined-map';

import { gql } from '../../__generated__';
import { GateController, GateLink } from '../link/gate';

import { findOperationUserIds } from './find-operation-user-id';

const InitUsersGates_Query = gql(`
  query InitUsersGates_Query{
    signedInUsers(localOnly: false) {
      id
      local {
        id
        sessionExpired
      }
    }
  }
`);

/**
 * Listens to window `online` and `offline` events and
 * adjusts global gate accordingly.
 * @returns Closure to remove event listeners
 */
export function createUsersGates(link: Pick<GateLink, 'create'>) {
  const gateByUserId = new Map<string, GateController>();
  const definedGateByUserId = new DefinedMap(gateByUserId, (userId) =>
    link.create((op) => {
      const opUserIds = findOperationUserIds(op);
      return opUserIds.includes(userId);
    })
  );

  function get(userId: string): Pick<GateController, 'open' | 'close'> {
    return definedGateByUserId.get(userId);
  }

  return get;
}

/**
 * Set each user gate open/close based on if user session is expired
 */
export function initUsersGates(
  getUserGate: ReturnType<typeof createUsersGates>,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
) {
  const data = cache.readQuery({
    query: InitUsersGates_Query,
  });

  data?.signedInUsers.forEach((user) => {
    const gate = getUserGate(user.id);
    if (user.local.sessionExpired) {
      gate.close();
    } else {
      gate.open();
    }
  });
}
