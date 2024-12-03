import { OmitStartsWith } from '~utils/types';

import { MongoPrimitive } from '../types';

import { MapAggregateResultResolver } from './map-query-aggregate-result';
import { AddStagesResolver, MapLastProjectResolver } from './merged-query-to-pipeline';
import { QueryArgPrefix } from './query';

export interface FieldDescription<
  TSchema = unknown,
  TResult = unknown,
  TContext = unknown,
> {
  /**
   * Adds any stages returned to aggregate pipeline.
   * Object properties are visited breath first.
   */
  $addStages?: AddStagesResolver<TSchema, TContext>;
  /**
   * Last project is the last $project stage used in aggregate pipeline.
   * Use this function to change the shape of projection used.
   *
   * Return undefined to not make any changes.
   */
  $mapLastProject?: MapLastProjectResolver<TSchema>;
  /**
   * Result of the object property passed here for modification by
   * returning a new value.
   *
   * Return undefined to not make any changes.
   */
  $mapAggregateResult?: MapAggregateResultResolver<TSchema, TResult>;
  $anyKey?: DescriptionDeep<
    TSchema extends Record<string, unknown> ? TSchema[keyof TSchema] : unknown,
    TResult extends object ? TResult[keyof TResult] : unknown,
    TContext
  >;
}

export type DescriptionDeep<T, R = unknown, C = unknown, P = MongoPrimitive> = T extends P
  ? FieldDescription<T, R, C>
  : T extends (infer U)[]
    ? DescriptionDeep<U, R, C>
    : T extends object
      ? DescriptionObjectDeep<T, R, C, P>
      : never;

type DescriptionObjectDeep<T extends object, R, C, P> = FieldDescription<T, R, C> &
  OmitStartsWith<
    {
      [Key in keyof T]?: DescriptionDeep<
        T[Key],
        R extends object ? R[keyof R] : unknown,
        C,
        P
      >;
    },
    QueryArgPrefix
  >;
// must not omit $here?
