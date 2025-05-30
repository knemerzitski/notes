/**
 * Original source is from `@apollo/client/utilities/policies/pagination`.
 *
 * Added customization options RelayStylePaginationOptions
 */

import { FieldFunctionOptions, FieldPolicy, Reference } from '@apollo/client';
import { SafeReadonly } from '@apollo/client/cache/core/types/common';
import { mergeDeep } from '@apollo/client/utilities';
import { __rest } from 'tslib';

import { weavedReplace } from '../../../../utils/src/array/weaved-replace';
import { isDefined } from '../../../../utils/src/type-guards/is-defined';
import { Maybe } from '../../../../utils/src/types';

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
   * Replace incoming with new data
   */
  mergeMapIncoming?: (
    incoming: Readonly<TIncomingRelay<TNode>> | null,
    options: FieldFunctionOptions
  ) => Readonly<TIncomingRelay<TNode>> | null | undefined;

  /**
   * Any edges that pass this predicate are always preserved
   * at its current position regardless of incoming data.
   */
  preserveEdgeInPosition?: (
    edge: TRelayEdge<TNode>,
    options: FieldFunctionOptions
  ) => boolean;

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

  /**
   * Preserve edges which index is unknown according to provided arguments.
   *
   * E.g. existing [1,2,3,4], incoming [1,2], args {first: 2} => preserving [3,4],
   * end result stays [1,2,3,4]
   *
   * E.g. existing [1,2,3], incoming [1,3], args {first: 2} => push [2] to end,
   * End result is [1,3,2].
   *
   * @param movedEdges List of edges that had their order changed to respect provided arguments.
   * @default false
   */
  preserveUnknownIndexEdges?:
    | ((
        missingEdges: readonly TRelayEdge<TNode>[],
        options: FieldFunctionOptions
      ) => boolean)
    | boolean;
}

function preserveUnknownIndexEdgesToFunction<TNode>(
  fnOrBool: RelayStylePaginationOptions<TNode>['preserveUnknownIndexEdges']
) {
  if (typeof fnOrBool === 'function') {
    return fnOrBool;
  } else if (typeof fnOrBool === 'boolean') {
    return () => fnOrBool;
  }
  return () => false;
}

function isEmptyString(value: Maybe<string>) {
  return value == null || value === '';
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
  const rootPreserveEdgeInPosition = rootOptions?.preserveEdgeInPosition;
  const preserveUnknownIndexEdges = preserveUnknownIndexEdgesToFunction(
    rootOptions?.preserveUnknownIndexEdges
  );

  const getCursor = rootOptions?.getCursor
    ? rootOptions.getCursor
    : (edge: TRelayEdge<TNode> | undefined) => edge?.cursor;

  return {
    keyArgs,
    read(existing, options) {
      const { canRead, readField } = options;

      existing = rootRead?.(existing, options) ?? existing;

      if (!existing) {
        return existing;
      }

      let edges: TRelayEdge<TNode>[];
      let firstEdgeCursor: Maybe<string> = getCursor(existing.edges[0], options);
      let lastEdgeCursor: Maybe<string> = getCursor(
        existing.edges[existing.edges.length - 1],
        options
      );
      if (isEmptyString(firstEdgeCursor) || isEmptyString(lastEdgeCursor)) {
        firstEdgeCursor = null;
        lastEdgeCursor = null;

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

      incoming = rootOptions?.mergeMapIncoming?.(incoming, options) ?? incoming;

      const canReplaceEdge: ((node: TRelayEdge<TNode>) => boolean) | undefined =
        rootPreserveEdgeInPosition
          ? (item) => !rootPreserveEdgeInPosition(item, options)
          : undefined;

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

      if (!canReplaceEdge) {
        if (args?.after != null) {
          // This comparison does not need to use readField("cursor", edge),
          // because we stored the cursor field of any Reference edges as an
          // extra property of the Reference object.
          const index = prefix.findIndex(
            (edge) => getCursor(edge, options) === args.after
          );
          if (index >= 0) {
            prefix = prefix.slice(0, index + 1);
            // suffix = []; // already true
          }
        } else if (args?.before != null) {
          const index = prefix.findIndex(
            (edge) => getCursor(edge, options) === args.before
          );
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
          const index = existingEdges.findIndex(
            (edge) => getCursor(edge, options) === args.after
          );
          if (index >= 0) {
            prefix = existingEdges.slice(0, index + 1);
            incomingEdges = weavedReplace(
              incomingEdges,
              existingEdges.slice(index + 1),
              canReplaceEdge
            );
            // suffix = []; // already true
          }
        } else if (args?.before != null) {
          const index = existingEdges.findIndex(
            (edge) => getCursor(edge, options) === args.before
          );
          if (index >= 0) {
            suffix = prefix.slice(index);
            prefix = [];
            incomingEdges = weavedReplace(
              incomingEdges,
              existingEdges.slice(0, index),
              canReplaceEdge
            );
          } else {
            suffix = prefix;
            prefix = [];
          }
        } else if (incoming.edges) {
          prefix = [];
          incomingEdges = weavedReplace(
            incomingEdges,
            [...existingEdges],
            canReplaceEdge
          );
          // suffix = []; // already true
        }
      }

      let edges: TRelayEdge<TNode>[] = [];

      // Ensure no duplicate references
      if (isOrderedSet) {
        const seenRefSet = new Set<string>();
        function filterEdge(edge: TRelayEdge<TNode>) {
          const node = readField('node', edge);
          if (!isReference(node)) {
            return true;
          }

          const ref = node.__ref;
          if (seenRefSet.has(ref)) {
            return false;
          }

          seenRefSet.add(ref);
          return true;
        }
        // Must filter incomingEdges first to retain correct edge order
        const uniqueIncomingEdges = incomingEdges.filter(filterEdge);
        edges = [
          ...prefix.filter(filterEdge),
          ...uniqueIncomingEdges,
          ...suffix.filter(filterEdge),
        ];
      } else {
        edges = [...prefix, ...incomingEdges, ...suffix];
      }

      // Preserve edges that would otherwise be removed
      if (preserveUnknownIndexEdges([], options)) {
        const nodesRefSet = new Set(
          edges
            .map((edge) => {
              const node = readField('node', edge);
              if (!isReference(node)) {
                return;
              }
              return node.__ref;
            })
            .filter(isDefined)
        );

        function isEdgeMissing(edge: TRelayEdge<TNode>) {
          const node = readField('node', edge);
          if (!isReference(node)) {
            return false;
          }

          return !nodesRefSet.has(node.__ref);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const limit: number = args?.first ?? args?.last ?? 0;

        const boundedMissingEdges = existingEdges.slice(0, limit).filter(isEdgeMissing);
        const remainingMissingEdges = existingEdges.slice(limit).filter(isEdgeMissing);

        if (preserveUnknownIndexEdges(boundedMissingEdges, options)) {
          const isForward = args?.after != null || args?.first != null;
          if (isForward) {
            edges = [...edges, ...boundedMissingEdges, ...remainingMissingEdges];
          } else {
            edges = [...boundedMissingEdges, ...remainingMissingEdges, ...edges];
          }
        }
      }

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
