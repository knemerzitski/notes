/**
 * Original source is from `@apollo/client/utilities/policies/pagination`.
 *
 * Added customization options RelayStylePaginationOptions
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { FieldFunctionOptions, FieldPolicy, Reference } from '@apollo/client';
import { SafeReadonly } from '@apollo/client/cache/core/types/common';
import { mergeDeep } from '@apollo/client/utilities';
import { __rest } from 'tslib';
import { weavedReplace } from '~utils/array/weaved-replace';
import { logAll } from '~utils/log-all';

import { Maybe } from '~utils/types';

type KeyArgs = FieldPolicy['keyArgs'];

// Whether TRelayEdge<TNode> is a normalized Reference or a non-normalized
// object, it needs a .cursor property where the relayStylePagination
// merge function can store cursor strings taken from pageInfo. Storing an
// extra reference.cursor property should be safe, and is easier than
// attempting to update the cursor field of the normalized StoreObject
// that the reference refers to, or managing edge wrapper objects
// (something I attempted in #7023, but abandoned because of #7088).
export type TRelayEdge<TNode> =
  | {
      cursor?: string;
      node: TNode;
    }
  | (Reference & { cursor?: string });

export interface TRelayPageInfo {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startCursor?: Maybe<string>;
  endCursor?: Maybe<string>;
}

export type TExistingRelay<TNode> = Readonly<{
  __typename?: string;
  edges: TRelayEdge<TNode>[];
  pageInfo?: TRelayPageInfo;
}>;

export interface TIncomingRelay<TNode> {
  edges?: TRelayEdge<TNode>[];
  pageInfo?: TRelayPageInfo;
}

export type RelayFieldPolicy<TNode> = FieldPolicy<
  TExistingRelay<TNode> | null,
  TIncomingRelay<TNode> | null,
  TIncomingRelay<TNode> | null
>;

export interface RelayStylePaginationOptions<TNode> {
  /**
   * Read the start of the function to replace initial existing
   */
  read?: (
    existing: SafeReadonly<TExistingRelay<TNode> | null> | undefined,
    options: FieldFunctionOptions
  ) => TExistingRelay<TNode> | null | undefined;
  /**
   * Any edges that pass this predicate are always preserved
   * regardless of incoming data.
   */
  preserveEdge?: (edge: TRelayEdge<TNode>, options: FieldFunctionOptions) => boolean;
  /**
   * Optional function to get cursor from any edge
   */
  getCursor?: (
    edge: TRelayEdge<TNode> | undefined,
    options: FieldFunctionOptions
  ) => string | undefined;
  /**
   * Treat edges as a ordered set. Does not allow duplicates.
   * Incoming will delete from existing before merging.
   * Uses `node` reference for equality check.
   * Only checks for duplicates between existing and incoming.
   * Keeps duplicates that are in incoming.
   * @default false
   */
  isOrderedSet?: boolean;
}

// As proof of the flexibility of field policies, this function generates
// one that handles Relay-style pagination, without Apollo Client knowing
// anything about connections, edges, cursors, or pageInfo objects.
export function relayStylePagination<TNode extends Reference = Reference>(
  keyArgs: KeyArgs = false,
  rootOptions?: RelayStylePaginationOptions<TNode>
): RelayFieldPolicy<TNode> {
  const rootRead = rootOptions?.read;
  const isOrderedSet = rootOptions?.isOrderedSet ?? false;
  const rootPreserveEdge = rootOptions?.preserveEdge;
  const rootGetCursor = rootOptions?.getCursor;
  return {
    keyArgs,
    read(existing, options) {
      const { canRead, readField } = options;

      existing = rootRead?.(existing, options) ?? existing;

      if (!existing) {
        return existing;
      }

      let edges: TRelayEdge<TNode>[];
      let firstEdgeCursor: Maybe<string> =
        rootGetCursor?.(existing.edges[0], options) ?? null;
      let lastEdgeCursor: Maybe<string> =
        rootGetCursor?.(existing.edges[existing.edges.length - 1], options) ?? null;
      if (!firstEdgeCursor || !lastEdgeCursor) {
        edges = [];
        for (const edge of existing.edges) {
          // Edges themselves could be Reference objects, so it's important
          // to use readField to access the edge.edge.node property.
          if (canRead(readField('node', edge))) {
            edges.push(edge);
            if (edge.cursor) {
              firstEdgeCursor = firstEdgeCursor ?? edge.cursor;
              lastEdgeCursor = edge.cursor ?? lastEdgeCursor;
            }
          }
        }

        if (edges.length > 1 && firstEdgeCursor === lastEdgeCursor) {
          firstEdgeCursor = null;
        }
      } else {
        // Assuming note can be read
        edges = existing.edges;
      }

      const { startCursor = null, endCursor = null } = existing.pageInfo ?? {};

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return {
        // Some implementations return additional Connection fields, such
        // as existing.totalCount. These fields are saved by the merge
        // function, so the read function should also preserve them.
        ...getExtras(existing),
        edges,
        pageInfo: {
          ...existing.pageInfo,
          // If existing.pageInfo.{start,end}Cursor are undefined or "", default
          // to firstEdgeCursor and/or lastEdgeCursor.
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          startCursor: startCursor || firstEdgeCursor,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          endCursor: endCursor || lastEdgeCursor,
        },
      };
    },
    merge(existing, incoming, options) {
      const { args, isReference, readField } = options;

      if (!existing) {
        existing = makeEmptyData();
      }

      const preserveEdge: ((node: TRelayEdge<TNode>) => boolean) | undefined =
        rootPreserveEdge ? (item) => !rootPreserveEdge(item, options) : undefined;

      if (!incoming) {
        return existing;
      }

      let incomingEdges = incoming.edges
        ? incoming.edges.map((edge) => {
            if (isReference((edge = { ...edge }))) {
              // In case edge is a Reference, we read out its cursor field and
              // store it as an extra property of the Reference object.
              edge.cursor = readField<string>('cursor', edge);
            }
            return edge;
          })
        : [];

      if (incoming.pageInfo) {
        const { pageInfo } = incoming;
        const { startCursor, endCursor } = pageInfo;
        const firstEdge = incomingEdges[0];
        const lastEdge = incomingEdges[incomingEdges.length - 1];
        // In case we did not request the cursor field for edges in this
        // query, we can still infer cursors from pageInfo.
        if (firstEdge && startCursor) {
          firstEdge.cursor = startCursor;
        }
        if (lastEdge && endCursor) {
          lastEdge.cursor = endCursor;
        }
        // Cursors can also come from edges, so we default
        // pageInfo.{start,end}Cursor to {first,last}Edge.cursor.
        const firstCursor = firstEdge && firstEdge.cursor;
        if (firstCursor && !startCursor) {
          incoming = mergeDeep(incoming, {
            pageInfo: {
              startCursor: firstCursor,
            },
          });
        }
        const lastCursor = lastEdge && lastEdge.cursor;
        if (lastCursor && !endCursor) {
          incoming = mergeDeep(incoming, {
            pageInfo: {
              endCursor: lastCursor,
            },
          });
        }
      }

      const existingEdges = existing.edges;
      let prefix = existingEdges;
      let suffix: typeof prefix = [];

      if (!preserveEdge) {
        if (args?.after != null) {
          // This comparison does not need to use readField("cursor", edge),
          // because we stored the cursor field of any Reference edges as an
          // extra property of the Reference object.
          const index = prefix.findIndex((edge) => edge.cursor === args.after);
          if (index >= 0) {
            prefix = prefix.slice(0, index + 1);
            // suffix = []; // already true
          }
        } else if (args?.before != null) {
          const index = prefix.findIndex((edge) => edge.cursor === args.before);
          suffix = index < 0 ? prefix : prefix.slice(index);
          prefix = [];
        } else if (incoming.edges) {
          // If we have neither args.after nor args.before, the incoming
          // edges cannot be spliced into the existing edges, so they must
          // replace the existing edges. See #6592 for a motivating example.
          prefix = [];
        }
      } else {
        if (args?.after != null) {
          const index = existingEdges.findIndex((edge) => edge.cursor === args.after);
          if (index >= 0) {
            prefix = existingEdges.slice(0, index + 1);
            incomingEdges = weavedReplace(
              incomingEdges,
              existingEdges.slice(index + 1),
              preserveEdge
            );
            // suffix = []; // already true
          }
        } else if (args?.before != null) {
          const index = existingEdges.findIndex((edge) => edge.cursor === args.before);
          if (index >= 0) {
            suffix = prefix.slice(index);
            prefix = [];
            incomingEdges = weavedReplace(
              incomingEdges,
              existingEdges.slice(0, index),
              preserveEdge
            );
          } else {
            suffix = prefix;
            prefix = [];
          }
        } else if (incoming.edges) {
          prefix = [];
          incomingEdges = weavedReplace(incomingEdges, [...existingEdges], preserveEdge);
          // suffix = []; // already true
        }
      }

      if (isOrderedSet && (prefix.length > 0 || suffix.length > 0)) {
        // Remove everything from prefix and suffix that is also in incoming
        const incomingSet = new Set(
          incomingEdges.map((edge) => {
            const node = readField('node', edge);
            if (!isReference(node)) {
              return;
            }
            return node.__ref;
          })
        );

        const filterFn: (edge: TRelayEdge<TNode>) => boolean = (edge) => {
          const node = readField('node', edge);
          // Keep edge if it's not a reference or not in incoming
          return !isReference(node) || !incomingSet.has(node.__ref);
        };

        prefix = prefix.filter(filterFn);
        suffix = suffix.filter(filterFn);
      }

      const edges = [...prefix, ...incomingEdges, ...suffix];

      const pageInfo: Partial<TRelayPageInfo> = {
        // The ordering of these two ...spreads may be surprising, but it
        // makes sense because we want to combine PageInfo properties with a
        // preference for existing values, *unless* the existing values are
        // overridden by the logic below, which is permitted only when the
        // incoming page falls at the beginning or end of the data.
        ...incoming.pageInfo,
        ...existing.pageInfo,
      };

      if (incoming.pageInfo) {
        const { hasPreviousPage, hasNextPage, startCursor, endCursor, ...extras } =
          incoming.pageInfo;

        // If incoming.pageInfo had any extra non-standard properties,
        // assume they should take precedence over any existing properties
        // of the same name, regardless of where this page falls with
        // respect to the existing data.
        Object.assign(pageInfo, extras);

        // Keep existing.pageInfo.has{Previous,Next}Page unless the
        // placement of the incoming edges means incoming.hasPreviousPage
        // or incoming.hasNextPage should become the new values for those
        // properties in existing.pageInfo. Note that these updates are
        // only permitted when the beginning or end of the incoming page
        // coincides with the beginning or end of the existing data, as
        // determined using prefix.length and suffix.length.
        if (!prefix.length) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (void 0 !== hasPreviousPage) pageInfo.hasPreviousPage = hasPreviousPage;

          if (void 0 !== startCursor) pageInfo.startCursor = startCursor;
        }
        if (!suffix.length) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (void 0 !== hasNextPage) pageInfo.hasNextPage = hasNextPage;

          if (void 0 !== endCursor) pageInfo.endCursor = endCursor;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return {
        ...getExtras(existing),
        ...getExtras(incoming),
        edges,
        pageInfo,
      };
    },
  };
}

// Returns any unrecognized properties of the given object.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const getExtras = (obj: Record<string, unknown>) => __rest(obj, notExtras);
const notExtras = ['edges', 'pageInfo'];

function makeEmptyData<TNode>(): TExistingRelay<TNode> {
  return {
    edges: [],
    pageInfo: {
      hasPreviousPage: false,
      hasNextPage: true,
      startCursor: null,
      endCursor: null,
    },
  };
}
