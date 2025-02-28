import { Reference, StoreObject } from '@apollo/client';

import { DateTime } from '../../graphql/scalars/DateTime';

import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

export const OpenedNote: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      closedAt: DateTime,
      collabTextEditing: {
        read(existing = null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return existing;
        },
        merge(
          existing: Reference | StoreObject | undefined,
          incoming: Reference | StoreObject | undefined,
          { readField, mergeObjects }
        ) {
          ctx.logger?.debug('OpenedNote.collabTextEditing', {
            existing,
            incoming,
          });
          if (existing != null && incoming != null) {
            const existingRevision = readField('revision', existing);
            const incomingRevision = readField('revision', incoming);
            if (existingRevision != null && incomingRevision != null) {
              if (incomingRevision < existingRevision) {
                // Discard old revision, selection is like UDP/voip, we care only about latest
                return existing;
              }
            }

            return mergeObjects(existing, incoming);
          }

          return incoming;
        },
      },
      active(existing, { readField }) {
        const closedAt = readField('closedAt');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        existing = existing ?? closedAt != null;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
    },
  };
};
