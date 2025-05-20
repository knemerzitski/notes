import { FieldFunctionOptions } from '@apollo/client';

import { binarySearchIndexOf } from '../../../../../utils/src/array/binary-search';

import { Changeset } from '../../../../../collab2/src';

import { gql } from '../../../__generated__';
import { CollabTextRecord, ComposedTextRecord } from '../../../__generated__/graphql';

import { CreateFieldPolicyFn, TypePoliciesContext } from '../../../graphql/types';

const PolicyTextAtRevisionRecordsChangeset_CollabTextFragment = gql(`
  fragment PolicyTextAtRevisionRecordsChangeset_CollabTextFragment on CollabText {
    id
    recordConnection(after: $after, first: $first, before: $before, last: $last) {
      edges {
        node {
          id
          revision
          changeset
        }
      }
    }
  }
`);

const PolicyTextAtRevisionRecordsInverse_CollabTextFragment = gql(`
  fragment PolicyTextAtRevisionRecordsInverse_CollabTextFragment on CollabText {
    id
    recordConnection(after: $after, first: $first, before: $before, last: $last) {
      edges {
        node {
          id
          revision
          inverse
        }
      }
    }
  }
`);

const PolicyTextAtRevisionHead_CollabTextFragment = gql(`
  fragment PolicyTextAtRevisionHead_CollabTextFragment on CollabText {
    id
    headRecord {
      revision
      text
    }
  }
`);

const PolicyTextAtRevisionTail_CollabTextFragment = gql(`
  fragment PolicyTextAtRevisionTail_CollabTextFragment on CollabText {
    id
    tailRecord {
      revision
      text
    }
  }
`);

const PolicyTextAtRevision_CollabTextFragment = gql(`
  fragment PolicyTextAtRevision_CollabTextFragment on CollabText {
    id
    textAtRevision(revision: $revision) {
      revision
      text
    }
  }
`);

type OnlyRevision = Pick<CollabTextRecord, 'revision'>;

export const textAtRevision: CreateFieldPolicyFn = function (_ctx: TypePoliciesContext) {
  function composeOnTailRecord(
    tailRecord: ComposedTextRecord,
    revision: number,
    options: FieldFunctionOptions
  ) {
    if (tailRecord.revision === revision) {
      return tailRecord;
    }
    const records = readRecordsChangeset(
      {
        after: tailRecord.revision,
        first: revision - tailRecord.revision,
      },
      options
    );
    if (!records) {
      return;
    }

    const result: ComposedTextRecord = {
      __typename: 'ComposedTextRecord',
      revision,
      text: records
        .reduce(
          (a, b) => Changeset.compose(a, b.changeset),

          Changeset.fromText(tailRecord.text)
        )
        .getText(),
    };

    writeTextAtRevision(result, options);

    return result;
  }

  function composeOnHeadRecord(
    revision: number,
    headRecord: ComposedTextRecord,
    options: FieldFunctionOptions
  ) {
    if (headRecord.revision === revision) {
      return headRecord;
    }

    const records = readRecordsInverse(
      {
        before: headRecord.revision + 1,
        last: headRecord.revision - revision,
      },
      options
    );

    if (!records) {
      return;
    }

    const result: ComposedTextRecord = {
      __typename: 'ComposedTextRecord',
      revision,
      text: records
        .reduceRight(
          (a, b) => Changeset.compose(a, b.inverse),

          Changeset.fromText(headRecord.text)
        )
        .getText(),
    };

    writeTextAtRevision(result, options);

    return result;
  }

  return {
    read(existing = [], options) {
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

      // Find closest revision
      const { index, exists } = binarySearchIndexOf(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        existing,
        (a: OnlyRevision) => a.revision - revision
      );

      if (exists) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return existing[index]!;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tailRecord: ComposedTextRecord | undefined =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        existing[index - 1] ?? readTail(options);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const headRecord: ComposedTextRecord | undefined =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        existing[index] ?? readHead(options);

      if (tailRecord && headRecord) {
        const tailDist = revision - tailRecord.revision;
        const headDist = headRecord.revision - revision;

        if (tailDist <= headDist) {
          return (
            composeOnTailRecord(tailRecord, revision, options) ??
            composeOnHeadRecord(revision, headRecord, options)
          );
        } else {
          return (
            composeOnHeadRecord(revision, headRecord, options) ??
            composeOnTailRecord(tailRecord, revision, options)
          );
        }
      } else if (tailRecord) {
        return composeOnTailRecord(tailRecord, revision, options);
      } else if (headRecord) {
        return composeOnHeadRecord(revision, headRecord, options);
      } else {
        return;
      }
    },
    merge(existing = [], incoming, options) {
      // merge(existing = [], incoming, options) {
      const { mergeObjects } = options;

      // Find closest older revision
      const { index, exists } = binarySearchIndexOf(
        existing as readonly OnlyRevision[],
        (a: OnlyRevision) => a.revision - (incoming as OnlyRevision).revision
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

function readRecordsChangeset(
  variables: Partial<{ after: number; first: number }>,
  options: Pick<FieldFunctionOptions, 'readField' | 'cache' | 'variables'>,
  collabTextId = options.readField('id')
) {
  const collabTextDataId = options.cache.identify({
    __typename: 'CollabText',
    id: collabTextId,
  });
  if (!collabTextDataId) {
    return;
  }

  const collabText = options.cache.readFragment({
    fragment: PolicyTextAtRevisionRecordsChangeset_CollabTextFragment,
    id: collabTextDataId,
    variables,
  });

  if (!collabText) {
    return;
  }

  return collabText.recordConnection.edges.map((edge) => edge.node);
}

function readRecordsInverse(
  variables: Partial<{ before: number; last: number }>,
  options: Pick<FieldFunctionOptions, 'readField' | 'cache' | 'variables'>,
  collabTextId = options.readField('id')
) {
  const collabTextDataId = options.cache.identify({
    __typename: 'CollabText',
    id: collabTextId,
  });
  if (!collabTextDataId) {
    return;
  }

  const collabText = options.cache.readFragment({
    fragment: PolicyTextAtRevisionRecordsInverse_CollabTextFragment,
    id: collabTextDataId,
    variables,
  });
  if (!collabText) {
    return;
  }

  return collabText.recordConnection.edges.map((edge) => edge.node);
}

function readHead(
  options: Pick<FieldFunctionOptions, 'readField' | 'cache' | 'variables'>,
  collabTextId = options.readField('id')
) {
  const collabTextDataId = options.cache.identify({
    __typename: 'CollabText',
    id: collabTextId,
  });
  if (!collabTextDataId) {
    return;
  }

  const collabText = options.cache.readFragment({
    fragment: PolicyTextAtRevisionHead_CollabTextFragment,
    id: collabTextDataId,
  });

  if (!collabText) {
    return;
  }

  return collabText.headRecord;
}

function readTail(
  options: Pick<FieldFunctionOptions, 'readField' | 'cache' | 'variables'>,
  collabTextId = options.readField('id')
) {
  const collabTextDataId = options.cache.identify({
    __typename: 'CollabText',
    id: collabTextId,
  });
  if (!collabTextDataId) {
    return;
  }

  const collabText = options.cache.readFragment({
    fragment: PolicyTextAtRevisionTail_CollabTextFragment,
    id: collabTextDataId,
  });

  if (!collabText) {
    return;
  }

  return collabText.tailRecord;
}

function writeTextAtRevision(
  record: ComposedTextRecord,
  options: Pick<FieldFunctionOptions, 'readField' | 'cache' | 'variables'>,
  collabTextId = options.readField('id')
) {
  const collabTextDataId = options.cache.identify({
    __typename: 'CollabText',
    id: collabTextId,
  });
  if (!collabTextDataId) {
    return;
  }

  if (typeof collabTextId !== 'string') {
    return;
  }

  options.cache.writeFragment({
    fragment: PolicyTextAtRevision_CollabTextFragment,
    id: collabTextDataId,
    data: {
      __typename: 'CollabText',
      id: collabTextId,
      textAtRevision: record,
    },
  });
}
