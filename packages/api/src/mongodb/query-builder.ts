import { ObjectId } from 'mongodb';
import {
  RelayPagination,
  getPaginationKey,
} from './operations/pagination/relayArrayPagination';
import { Maybe, MaybePromise } from '~utils/types';

type Primitive = string | number | boolean | ObjectId;
type ProjectionValue = 1 | undefined;
type IdProjectionValue = 0 | ProjectionValue;

type Cursor = string | number;

export interface ArrayQuery<TItem> {
  $query?: DeepQuery<TItem>;
  $pagination?: RelayPagination<Cursor>;
}

/**
 * Copy structure of object with custom values.
 * Value can be 1 or pagination if it's an array.
 */
export type DeepQuery<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? ArrayQuery<U>
    : T[Key] extends Primitive
      ? Key extends '_id'
        ? IdProjectionValue
        : ProjectionValue
      : T[Key] extends object | undefined
        ? DeepQuery<T[Key]>
        : ProjectionValue;
};

/**
 * Makes every property optional except primitive values.
 * e.g. ObjectId properties are not optional
 */
export type DeepQueryResponse<T> = Readonly<{
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? DeepQueryResponse<U>[]
    : T[Key] extends Primitive
      ? T[Key]
      : T[Key] extends object | undefined
        ? DeepQueryResponse<T[Key]>
        : T[Key];
}>;

/**
 * Paginations by getPaginationKey. \
 * e.g. { \
 *  'a:2': [....], \
 *  'b:3': [....], \
 * }
 */
type ArrayQueryDeepMappedPagination<TItem> = Record<
  string,
  DeepQueryResponsePaginationMapped<TItem>[]
>;

export type DeepQueryResponsePaginationMapped<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? ArrayQueryDeepMappedPagination<U>
    : T[Key] extends Primitive
      ? T[Key]
      : T[Key] extends object | undefined
        ? DeepQueryResponsePaginationMapped<T[Key]>
        : T[Key];
};

export interface MongoQuery {
  query<T>(query: unknown): MaybePromise<Maybe<T>>;
}

export interface MongoDocumentQuery<TDocument> {
  queryDocument(
    query: DeepQuery<TDocument>
  ): MaybePromise<Maybe<DeepQueryResponse<TDocument>>>;
}

export class CustomMongoDocumentDataSource<TDocument>
  implements MongoDocumentQuery<TDocument>, MongoQuery
{
  private mongoQuery: MongoQuery;

  constructor(mongoQuery: MongoQuery) {
    this.mongoQuery = mongoQuery;
  }

  queryDocument(query: DeepQuery<TDocument>) {
    return this.mongoQuery.query<DeepQueryResponse<TDocument> | null | undefined>(query);
  }

  async query<T>(query: unknown) {
    return (await this.mongoQuery.query<{ _custom: T }>({ _custom: query }))?._custom;
  }
}

export interface MergedArrayQuery<TItem> {
  $query?: MergedDeepQuery<TItem>;
  $paginations?: RelayPagination<Cursor>[];
}

export type MergedDeepQuery<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? MergedArrayQuery<U>
    : T[Key] extends Primitive
      ? Key extends '_id'
        ? IdProjectionValue
        : ProjectionValue
      : T[Key] extends object | undefined
        ? MergedDeepQuery<T[Key]>
        : ProjectionValue;
};

export function mergeQueries<T>(
  mergedObj: MergedDeepQuery<T>,
  sources: Readonly<DeepQuery<T>[]>,
  state?: {
    pathKey: string;
    paginationMemo: Record<string, Set<string>>;
  }
): MergedDeepQuery<T> {
  const resultMergedObj: Record<string, unknown> = mergedObj;
  const paginationMemo = state?.paginationMemo ?? {};
  const pathKey = state?.pathKey ?? 'ROOT';

  for (const source of sources) {
    for (const sourceKey of Object.keys(source)) {
      const sourceValue = source[sourceKey as keyof DeepQuery<T>];

      if (sourceValue === 1) {
        // Merged 1's from all sources
        resultMergedObj[sourceKey] = 1;
      } else if (typeof sourceValue === 'object') {
        let mergedValue = resultMergedObj[sourceKey] as object | undefined;
        if (!mergedValue) {
          mergedValue = {};
          resultMergedObj[sourceKey] = mergedValue;
        }

        if ('$query' in sourceValue || '$pagination' in sourceValue) {
          const arrayMergedValue = mergedValue as {
            $query?: DeepQuery<unknown>;
            $paginations?: RelayPagination<Cursor>[];
          };

          if ('$query' in sourceValue && sourceValue.$query) {
            if (!arrayMergedValue.$query) {
              arrayMergedValue.$query = {};
            }
            mergeQueries(
              arrayMergedValue.$query as MergedDeepQuery<T>,
              [sourceValue.$query as DeepQuery<T>],
              { paginationMemo, pathKey: `${pathKey}.${sourceKey}` }
            );
          }

          if ('$pagination' in sourceValue && sourceValue.$pagination) {
            if (!arrayMergedValue.$paginations) {
              arrayMergedValue.$paginations = [];
            }

            const pagination = sourceValue.$pagination;

            // Add only unique paginations, skip duplicate
            const currentPathKey = `${pathKey}.${sourceKey}`;
            const paginationValue = getPaginationKey(pagination);
            const existingPaginationsSet = paginationMemo[currentPathKey];
            if (!existingPaginationsSet) {
              paginationMemo[currentPathKey] = new Set([paginationValue]);
              arrayMergedValue.$paginations.push(pagination);
            } else if (!existingPaginationsSet.has(paginationValue)) {
              existingPaginationsSet.add(paginationValue);
              arrayMergedValue.$paginations.push(pagination);
            }
          }
        } else {
          mergeQueries(mergedValue, [sourceValue], {
            paginationMemo,
            pathKey: `${pathKey}.${sourceKey}`,
          });
        }
      } else {
        resultMergedObj[sourceKey] = sourceValue;
      }
    }
  }

  return resultMergedObj as MergedDeepQuery<T>;
}
