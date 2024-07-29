import isDefined from '~utils/type-guards/isDefined';

import { FieldDescription } from './description';
import { MapAggregateResultResolver } from './mapQueryAggregateResult';
import { AddStagesResolver, MapLastProjectResolver } from './mergedQueryToPipeline';

export default function asArrayFieldDescription<Schema, Result, Context>(
  field: FieldDescription<Schema, Result, Context>
): FieldDescription<Schema[], Result, Context> {
  return {
    ...field,
    $addStages: asArrayAddStagesResolver(field.$addStages),
    $mapLastProject: asArrayMapLastProjectResolver(field.$mapLastProject),
    $mapAggregateResult: asArrayMapAggregateResultResolver(field.$mapAggregateResult),
  } as FieldDescription<Schema[], Result, Context>;
}

function asArrayAddStagesResolver<TSchema, TContext>(
  resolver?: AddStagesResolver<TSchema, TContext>
): AddStagesResolver<TSchema[], TContext> | undefined {
  if (!resolver) return;

  return (args) => {
    return resolver({
      ...args,
      fields: args.fields
        .map((field) => {
          if (!field.query.$query) return;
          return {
            ...field,
            query: field.query.$query,
          };
        })
        .filter(isDefined),
    });
  };
}

function asArrayMapLastProjectResolver<TSchema>(
  resolver?: MapLastProjectResolver<TSchema>
): MapLastProjectResolver<TSchema[]> | undefined {
  if (!resolver) return;

  return (query, projectValue) => {
    if (!query.$query) return;
    return resolver(query.$query, projectValue === query ? query.$query : projectValue);
  };
}

function asArrayMapAggregateResultResolver<TSchema, TResult>(
  resolver?: MapAggregateResultResolver<TSchema, TResult>
): MapAggregateResultResolver<TSchema[], TResult> | undefined {
  if (!resolver) return;
  return (args) => {
    if (!args.query.$query || !args.mergedQuery.$query) return;
    return resolver({
      query: args.query.$query,
      mergedQuery: args.mergedQuery.$query,
      result: args.result,
    });
  };
}
