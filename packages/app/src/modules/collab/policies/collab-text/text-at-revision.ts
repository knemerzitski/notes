import { FieldFunctionOptions, FieldPolicy } from '@apollo/client';
import { Changeset } from '~collab/changeset/changeset';
import { binarySearchIndexOf } from '~utils/array/binary-search';

import { gql } from '../../../../__generated__/gql';
import { CollabText, CollabTextRecord } from '../../../../__generated__/graphql';

const FRAGMENT_RECORDS = gql(`
  fragment TextAtRevisionRecords on CollabText {
    recordsConnection(after: $after, first: $first) {
      records {
        change {
          revision
          changeset
        }
      }
    }
  }
`);

type OnlyRevision = Pick<CollabTextRecord['change'], 'revision'>;

export const textAtRevision: FieldPolicy<
  CollabText['textAtRevision'][],
  CollabText['textAtRevision']
> = {
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
    if (!tailText) return;

    const records = readRecords(
      {
        after: tailText.revision,
        first: revision - tailText.revision,
      },
      options
    );
    if (!records) return;

    return {
      changeset: records
        .reduce(
          (a, b) => a.compose(Changeset.parseValue(b.change.changeset)),
          Changeset.parseValue(tailText.changeset)
        )
        .serialize(),
      revision,
    };
  },
  merge(
    existing = [
      {
        changeset: Changeset.EMPTY.serialize(),
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
        const records = readRecords(
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        mergeObjects(existing[index]!, incoming),
        ...existing.slice(index + 1),
      ];
    }

    return [...existing.slice(0, index), incoming, ...existing.slice(index)];
  },
};

function compareRevisions(a: OnlyRevision, b: OnlyRevision) {
  return a.revision - b.revision;
}

function readRecords(
  { after, first }: { after: number; first: number },
  {
    readField,
    cache,
    variables,
  }: Pick<FieldFunctionOptions, 'readField' | 'cache' | 'variables'>,
  id = variables?.collabTextId ? String(variables.collabTextId) : readField('id')
) {
  const idRef = cache.identify({
    __typename: 'CollabText',
    id,
  });
  if (!idRef) return;

  const collabText = cache.readFragment({
    fragment: FRAGMENT_RECORDS,
    id: idRef,
    variables: {
      after,
      first,
    },
  });
  if (!collabText) return;
  return collabText.recordsConnection.records;
}
