import { MongoPrimitive } from '../types';

import { MapAggregateResultResolver } from './mapQueryAggregateResult';
import { AddStagesResolver, MapLastProjectResolver } from './mergedQueryToPipeline';

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
    TSchema extends object ? TSchema[keyof TSchema] : unknown,
    TResult extends object ? TResult[keyof TResult] : unknown,
    TContext
  >;
}

export type DeepAnyDescription<
  T,
  R = unknown,
  C = unknown,
  IsArrayItem = false,
> = T extends (infer U)[]
  ? DeepAnyDescription<U, R, C, true>
  : T extends MongoPrimitive
    ? FieldDescription<T, R, C>
    : T extends object
      ? DeepObjectDescription<T, R, C, IsArrayItem>
      : FieldDescription<T, R, C>;

type DeepObjectDescription<
  T extends object,
  R,
  C,
  IsArrayItem = false,
> = FieldDescription<IsArrayItem extends true ? T[] : T, R, C> & {
  [Key in keyof T]?: DeepAnyDescription<
    T[Key],
    R extends object ? R[keyof R] : unknown,
    C
  >;
};
