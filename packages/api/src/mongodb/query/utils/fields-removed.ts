import { isObjectLike } from '../../../../../utils/src/type-guards/is-object-like';

import { FieldDescription } from '../description';

export function fieldsRemoved<Schema, Result, Context, TFieldName extends string>(
  field: FieldDescription<Schema, Result, Context> | undefined,
  names: TFieldName[]
): Omit<FieldDescription<Schema, Result, Context>, TFieldName> | undefined {
  if (!field || !isObjectLike(field)) return;

  const fieldCopy = { ...field };

  for (const name of names) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete fieldCopy[name];
  }

  return fieldCopy as Omit<FieldDescription<Schema, Result, Context>, TFieldName>;
}
