import { Struct, InferRaw, Infer, create } from 'superstruct';
import { pickdeep } from '~utils/superstruct/pickdeep';
import { MaybePromise, Maybe } from '~utils/types';
import {
  memoizedGetEqualObjectString,
  getEqualObjectString,
} from './utils/get-equal-object-string';
import {
  QueryDeep,
  PartialQueryResultDeep,
  MongoQueryFn,
  StrictMongoQueryFn,
  QueryResultDeep,
} from './query';
import { valueToQuery } from './utils/value-to-query';
import { memoize1 } from '~utils/memoize1';
import { isPlainObject } from '~utils/type-guards/is-plain-object';

// util func

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class StructQuery<S extends Struct<any, any, any>> {
  static get = memoize1(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <S extends Struct<any, any, any>>(struct: S) => new StructQuery(struct)
  );

  private readonly subStructCache = new Map<string, Struct>();

  private readonly struct: S;

  constructor(struct: S) {
    this.struct = struct;
  }

  private getSubStructForQuery(query: QueryDeep<InferRaw<S> | Infer<S>>) {
    const queryStr = isPlainObject(query)
      ? memoizedGetEqualObjectString(query)
      : getEqualObjectString(query);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let validator = this.subStructCache.get(queryStr);
    if (!validator) {
      validator = pickdeep(this.struct, {
        convertObjectToType: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })()(query as any);
      this.subStructCache.set(queryStr, validator);
    }
    return validator;
  }

  rawValueToValidated<V extends QueryDeep<InferRaw<S>>>(
    rawValue: Maybe<PartialQueryResultDeep<InferRaw<S>>>,
    query = valueToQuery(rawValue) as V
  ): QueryResultDeep<Infer<S>, V> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any
    return create(rawValue, this.getSubStructForQuery(query)) as any;
  }

  validatedValueToRaw<V extends QueryDeep<Infer<S>>>(
    validatedValue: Maybe<PartialQueryResultDeep<Infer<S>>>,
    query = valueToQuery(validatedValue) as V
  ): QueryResultDeep<InferRaw<S>, V> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return create(
      validatedValue,
      this.getSubStructForQuery(query),
      undefined,
      true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
  }

  createQueryFnFromValidated(
    getValidatedValue: <V extends QueryDeep<Infer<S>>>(
      query: V
    ) => MaybePromise<Maybe<PartialQueryResultDeep<Infer<S>>>>,
    options?: {
      mapQuery?: <V extends QueryDeep<Infer<S>>>(query: V) => Maybe<V>;
    }
  ): MongoQueryFn<S> {
    return async (query, resultType) => {
      query = options?.mapQuery?.(query) ?? query;

      const validatedValue = await getValidatedValue(query);
      if (validatedValue == null) {
        return;
      }

      switch (resultType) {
        case 'raw':
          return this.validatedValueToRaw(validatedValue, query);
        default:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return validatedValue as any;
      }
    };
  }

  createStrictQueryFnFromValidated(
    getValidatedValue: <V extends QueryDeep<Infer<S>>>(
      query: V
    ) => MaybePromise<PartialQueryResultDeep<Infer<S>>>,
    options?: {
      mapQuery?: <V extends QueryDeep<Infer<S>>>(query: V) => Maybe<V>;
    }
  ): StrictMongoQueryFn<S> {
    return async (query, resultType) => {
      query = options?.mapQuery?.(query) ?? query;

      const validatedValue = await getValidatedValue(query);

      switch (resultType) {
        case 'raw':
          return this.validatedValueToRaw(validatedValue, query);
        default:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return validatedValue as any;
      }
    };
  }

  createQueryFnFromRaw(
    getRawValue: <V extends QueryDeep<InferRaw<S>>>(
      query: V
    ) => MaybePromise<Maybe<PartialQueryResultDeep<InferRaw<S>>>>,
    options?: {
      mapQuery?: <V extends QueryDeep<InferRaw<S>>>(query: V) => Maybe<V>;
    }
  ): MongoQueryFn<S> {
    return async (query, resultType) => {
      query = options?.mapQuery?.(query) ?? query;

      const rawValue = await getRawValue(query);
      if (rawValue == null) {
        return;
      }

      switch (resultType) {
        case 'validated':
          return this.rawValueToValidated(rawValue, query);
        default:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return rawValue as any;
      }
    };
  }

  createStrictQueryFnFromRaw(
    getRawValue: <V extends QueryDeep<InferRaw<S>>>(
      query: V
    ) => MaybePromise<PartialQueryResultDeep<InferRaw<S>>>,
    options?: {
      mapQuery?: <V extends QueryDeep<InferRaw<S>>>(query: V) => Maybe<V>;
    }
  ): StrictMongoQueryFn<S> {
    return async (query, resultType) => {
      query = options?.mapQuery?.(query) ?? query;

      const rawValue = await getRawValue(query);

      switch (resultType) {
        case 'validated':
          return this.rawValueToValidated(rawValue, query);
        default:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return rawValue as any;
      }
    };
  }
}
