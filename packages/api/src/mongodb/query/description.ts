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
  $anyKey?: DeepAnyDescription<
    TSchema extends Record<string, unknown> ? TSchema[keyof TSchema] : unknown,
    TResult extends object ? TResult[keyof TResult] : unknown,
    TContext
  >;
}

export type DeepAnyDescription<T, R = unknown, C = unknown> = T extends (infer U)[]
  ? DeepAnyDescription<U, R, C>
  : T extends MongoPrimitive
    ? FieldDescription<T, R, C>
    : T extends object
      ? DeepObjectDescription<T, R, C>
      : FieldDescription<T, R, C>;

type DeepObjectDescription<T extends object, R, C> = FieldDescription<T, R, C> &
  OmitStartsWith<
    {
      [Key in keyof T]?: DeepAnyDescription<
        T[Key],
        R extends object ? R[keyof R] : unknown,
        C
      >;
    },
    QueryArgPrefix
  >;
