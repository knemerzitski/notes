import { FieldFunctionOptions } from '@apollo/client';

import { Changeset } from '~collab/changeset';
import { binarySearchIndexOf } from '~utils/array/binary-search';

import { gql } from '../../../__generated__';
import { CollabText, CollabTextRecord } from '../../../__generated__/graphql';

import { CreateFieldPolicyFn, TypePoliciesContext } from '../../../graphql/types';
import { firstRevisionChangeset } from '../../utils/map-record';

const PolicyTextAtRevision_CollabTextFragment = gql(`
  fragment PolicyTextAtRevision_CollabTextFragment on CollabText {
    id
    recordConnection(after: $after, first: $first) {
      edges {
        node {
          id
          change {
          revision
          changeset
        }
        }
      }
    }
  }
`);

type OnlyRevision = Pick<CollabTextRecord['change'], 'revision'>;

/**
 * External field contains state that is managed outside cache but
 * still belongs to Note type.
 */
export const textAtRevision: CreateFieldPolicyFn = function (_ctx: TypePoliciesContext) {
  const defaultExisting = [firstRevisionChangeset()];
  return {
    read(existing = defaultExisting, options) {
      // read(existing = [], options) {
      // Existing changeset is probably serialized
      const { args } = options;

      // Return oldest without argument
      if (args?.revision == null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return existing[0];
      }

      const revision = Number(args.revision);
      if (Number.isNaN(revision)) return;

      // Find closest older revision
      const { index, exists } = binarySearchIndexOf(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        existing,
        (a: OnlyRevision) => compareRevisionsUni(a, revision)
      );

      if (exists) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return existing[index]!;
      }

      // Compose text from closest older tailText
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const tailText = existing[index - 1];
      if (!tailText) {
        return;
      }

      const records = readRecords(
        {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          after: tailText.revision,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          first: revision - tailText.revision,
        },
        options
      );
      if (!records) {
        return;
      }

      return {
        changeset: records.reduce(
          (a, b) => a.compose(b.change.changeset),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          Changeset.parseValue(tailText.changeset)
        ),
        revision,
      };
    },
    merge(existing = defaultExisting, incoming, options) {
      // merge(existing = [], incoming, options) {
      const { mergeObjects } = options;

      // Find closest older revision
      const { index, exists } = binarySearchIndexOf(
        existing as readonly OnlyRevision[],
        (a: OnlyRevision) => compareRevisionsUni(a, (incoming as OnlyRevision).revision)
      );

      // Cannot read sibling fields in merge function
      // if (!exists) {
      //   const tailText = existing[index - 1];
      //   if (tailText) {
      //     const records = readRecords(
      //       {
      //         after: tailText.revision,
      //         first: incoming.revision - tailText.revision,
      //       },
      //       options
      //     );
      //     // Can compose incoming from records. Don't add.
      //     if (records) {
      //       return existing;
      //     }
      //   }
      // }

      if (exists) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return [
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          ...existing.slice(0, index),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          mergeObjects(existing[index], incoming),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          ...existing.slice(index + 1),
        ];
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return [...existing.slice(0, index), incoming, ...existing.slice(index)];
    },
  };
};

function compareRevisionsUni(a: OnlyRevision, revision: number) {
  return a.revision - revision;
}

function readRecords(
  { after, first }: { after: number; first: number },
  options: Pick<FieldFunctionOptions, 'readField' | 'cache' | 'variables'>,
  collabTextId?: CollabText['id']
) {
  const { readField, cache } = options;
  collabTextId = readField('id');
  const collabTextDataId = cache.identify({
    __typename: 'CollabText',
    id: collabTextId,
  });
  if (!collabTextDataId) {
    return;
  }

  const collabText = cache.readFragment({
    fragment: PolicyTextAtRevision_CollabTextFragment,
    id: collabTextDataId,
    variables: {
      after,
      first,
    },
  });

  if (!collabText) {
    return;
  }

  return collabText.recordConnection.edges.map((edge) => edge.node);
}
