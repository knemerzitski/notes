/* eslint-disable unicorn/filename-case */
import { CreateFieldPolicyFn, TypePoliciesContext } from '../../../graphql/types';
import { FieldFunctionOptions } from '@apollo/client';
import { CollabTextRecord } from '../../../__generated__/graphql';
import { gql } from '../../../__generated__';
import { binarySearchIndexOf } from '~utils/array/binary-search';
import { Changeset } from '~collab/changeset';

const PolicyTextAtRevision_CollabTextFragment = gql(`
  fragment PolicyTextAtRevision_CollabTextFragment on CollabText {
    recordConnection(after: $after, first: $first) {
      edges {
        node {
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
  return {
    read(existing = [], options) {
      const { args } = options;

      // Return oldest without argument
      if (args?.revision == null) {
        return existing[0];
      }

      const revision = Number(args.revision);
      if (Number.isNaN(revision)) return;

      // Find closest older revision
      const { index, exists } = binarySearchIndexOf(
        existing,
        { revision },
        compareRevisions
      );

      if (exists) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return existing[index]!;
      }

      // Compose text from closest older tailText
      const tailText = existing[index - 1];
      if (!tailText) {
        return;
      }

      const records = getRecords(
        {
          after: tailText.revision,
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
          tailText.changeset
        ),
        revision,
      };
    },
    merge(
      existing = [
        {
          __typename: 'RevisionChangeset',
          changeset: Changeset.EMPTY,
          revision: 0,
        },
      ],
      incoming,
      options
    ) {
      const { mergeObjects } = options;

      // Find closest older revision
      const { index, exists } = binarySearchIndexOf(
        existing,
        { revision: incoming.revision },
        compareRevisions
      );

      // Check if can compose text from records
      if (!exists) {
        const tailText = existing[index - 1];
        if (tailText) {
          const records = getRecords(
            {
              after: tailText.revision,
              first: incoming.revision - tailText.revision,
            },
            options
          );
          // Can compose incoming from records. Don't add.
          if (records) {
            return existing;
          }
        }
      }

      if (exists) {
        return [
          ...existing.slice(0, index),
          mergeObjects(existing[index], incoming),
          ...existing.slice(index + 1),
        ];
      }

      return [...existing.slice(0, index), incoming, ...existing.slice(index)];
    },
  };
};

function compareRevisions(a: OnlyRevision, b: OnlyRevision) {
  return a.revision - b.revision;
}

function getRecords(
  { after, first }: { after: number; first: number },
  {
    readField,
    cache,
    variables,
  }: Pick<FieldFunctionOptions, 'readField' | 'cache' | 'variables'>,
  id = variables?.collabTextId ? String(variables.collabTextId) : readField('id')
) {
  const collabTextDataId = cache.identify({
    __typename: 'CollabText',
    id,
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
