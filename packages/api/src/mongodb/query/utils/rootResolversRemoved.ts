import { FieldDescription } from '../description';

export default function rootResolversRemoved<Schema, Result, Context>(
  field?: FieldDescription<Schema, Result, Context>
):
  | Omit<
      FieldDescription<Schema, Result, Context>,
      '$addStages' | '$mapLastProject' | '$mapAggregateResult'
    >
  | undefined {
  if (!field) return;
  const { $addStages, $mapAggregateResult, $mapLastProject, ...rest } = field;
  return rest;
}
