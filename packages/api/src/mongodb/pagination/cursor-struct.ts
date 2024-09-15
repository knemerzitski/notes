import { object, number, optional, never, Infer, Struct, union } from 'superstruct';
import { memoize1 } from '~utils/memoize1';

// #################### first, after ######################

export const CursorFirstPagination = object({
  first: number(),
  after: optional(never()),
});

export type CursorFirstPagination = Infer<typeof CursorFirstPagination>;

export const CursorAfterUnboundPagination = memoize1(
  <TCursor>(
    cursor: Struct<TCursor, null>
  ): Struct<
    { first?: undefined; after: TCursor },
    { first: Struct<undefined, null>; after: Struct<TCursor, null> }
  > =>
    // @ts-expect-error superstruct incorrectly types generic
    object({
      first: optional(never()),
      after: cursor,
    })
);

export type CursorAfterUnboundPagination<TCursor> = Infer<
  ReturnType<typeof CursorAfterUnboundPagination<TCursor>>
>;

export const CursorAfterBoundPagination = memoize1(
  <TCursor>(
    cursor: Struct<TCursor, null>
  ): Struct<
    { first: number; after: TCursor },
    { first: Struct<number, null>; after: Struct<TCursor, null> }
  > =>
    // @ts-expect-error superstruct incorrectly types generic
    object({
      first: number(),
      after: cursor,
    })
);

export type CursorAfterBoundPagination<TCursor> = Infer<
  ReturnType<typeof CursorAfterBoundPagination<TCursor>>
>;

export const CursorAfterPagination = memoize1(
  <TCursor>(
    cursor: Struct<TCursor, null>
  ): Struct<
    { first?: number | undefined; after: TCursor },
    { first: Struct<number | undefined, null>; after: Struct<TCursor, null> }
  > =>
    // @ts-expect-error superstruct incorrectly types generic
    object({
      first: optional(number()),
      after: cursor,
    })
);

export type CursorAfterPagination<TCursor> = Infer<
  ReturnType<typeof CursorAfterPagination<TCursor>>
>;

// #################### last, before ######################

export const CursorLastPagination = object({
  last: number(),
  before: optional(never()),
});

export type CursorLastPagination = Infer<typeof CursorLastPagination>;

export const CursorBeforeUnboundPagination = memoize1(
  <TCursor>(
    cursor: Struct<TCursor, null>
  ): Struct<
    { last?: undefined; before: TCursor },
    { last: Struct<undefined, null>; before: Struct<TCursor, null> }
  > =>
    // @ts-expect-error superstruct incorrectly types generic
    object({
      last: optional(never()),
      before: cursor,
    })
);

export type CursorBeforeUnboundPagination<TCursor> = Infer<
  ReturnType<typeof CursorBeforeUnboundPagination<TCursor>>
>;

export const CursorBeforeBoundPagination = memoize1(
  <TCursor>(
    cursor: Struct<TCursor, null>
  ): Struct<
    { last: number; before: TCursor },
    { last: Struct<number, null>; before: Struct<TCursor, null> }
  > =>
    // @ts-expect-error superstruct incorrectly types generic
    object({
      last: number(),
      before: cursor,
    })
);

export type CursorBeforeBoundPagination<TCursor> = Infer<
  ReturnType<typeof CursorBeforeBoundPagination<TCursor>>
>;

export const CursorBeforePagination = memoize1(
  <TCursor>(
    cursor: Struct<TCursor, null>
  ): Struct<
    { last?: number | undefined; before: TCursor },
    { last: Struct<number | undefined, null>; before: Struct<TCursor, null> }
  > =>
    // @ts-expect-error superstruct incorrectly types generic
    object({
      last: optional(number()),
      before: cursor,
    })
);

export type CursorBeforePagination<TCursor> = Infer<
  ReturnType<typeof CursorBeforePagination<TCursor>>
>;

// #################### mix ######################

export const CursorForwardsPagination = memoize1(
  <TCursor>(cursor: Struct<TCursor, null>) =>
    union([CursorFirstPagination, CursorAfterPagination(cursor)])
);

export type CursorForwardsPagination<TCursor> = Infer<
  ReturnType<typeof CursorForwardsPagination<TCursor>>
>;

export const CursorBackwardsPagination = memoize1(
  <TCursor>(cursor: Struct<TCursor, null>) =>
    union([CursorLastPagination, CursorBeforePagination(cursor)])
);

export type CursorBackwardsPagination<TCursor> = Infer<
  ReturnType<typeof CursorBackwardsPagination<TCursor>>
>;

export const CursorPagination = memoize1(<TCursor>(cursor: Struct<TCursor, null>) =>
  union([CursorForwardsPagination(cursor), CursorBackwardsPagination(cursor)])
);

export type CursorPagination<TCursor> = Infer<
  ReturnType<typeof CursorPagination<TCursor>>
>;

export const CursorBoundPagination = memoize1(<TCursor>(cursor: Struct<TCursor, null>) =>
  union([
    CursorFirstPagination,
    CursorAfterBoundPagination(cursor),
    CursorLastPagination,
    CursorBeforeBoundPagination(cursor),
  ])
);

export type CursorBoundPagination<TCursor> = Infer<
  ReturnType<typeof CursorBoundPagination<TCursor>>
>;

/**
 * @returns String that is unique for a pagination.
 */
export function getPaginationKey<T>(
  p: CursorPagination<T>,
  cursor: Struct<T, null>
): string {
  if (CursorForwardsPagination(cursor).is(p)) {
    if (CursorFirstPagination.is(p)) {
      return `a:${p.first}`;
    } else if (CursorAfterBoundPagination(cursor).is(p)) {
      return `a${String(p.after)}:${p.first}`;
    } else {
      return `a${String(p.after)}`;
    }
  } else {
    if (CursorLastPagination.is(p)) {
      return `b:${p.last}`;
    } else if (CursorBeforeBoundPagination(cursor).is(p)) {
      return `b${String(p.before)}:${p.last}`;
    } else {
      return `b${String(p.before)}`;
    }
  }
}
