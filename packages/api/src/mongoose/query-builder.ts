import { ObjectId } from 'mongodb';
import {
  RelayPagination,
  getPaginationKey,
} from './operations/pagination/relayArrayPagination';

type Primitive = string | number | boolean | ObjectId;
type ProjectionValue = 1 | undefined;
type IdProjectionValue = 0 | ProjectionValue;

export interface ArrayProjection<TItem> {
  $project?: Projection<TItem>;
  $pagination?: RelayPagination<string>;
}

/**
 * Copy structure of object with custom values.
 * Value can be 1 or pagination if it's an array.
 */
export type Projection<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? ArrayProjection<U>
    : T[Key] extends Primitive
      ? Key extends '_id'
        ? IdProjectionValue
        : ProjectionValue
      : T[Key] extends object | undefined
        ? Projection<T[Key]>
        : ProjectionValue;
};

/**
 * Makes every property optional except primitive values.
 * e.g. ObjectId properties are not optional
 */
export type ProjectionResult<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? ProjectionResult<U>[]
    : T[Key] extends Primitive
      ? T[Key]
      : T[Key] extends object | undefined
        ? ProjectionResult<T[Key]>
        : T[Key];
};

/**
 * Paginations by getPaginationKey. \
 * e.g. { \
 *  'a:2': [....], \
 *  'b:3': [....], \
 * }
 */
export type ArrayMappedPagination<TItem> = Record<string, ProjectionMappedPagination<TItem>[]>;

// final result...
export type ProjectionMappedPagination<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? ArrayMappedPagination<U>
    : T[Key] extends Primitive
      ? T[Key]
      : T[Key] extends object | undefined
        ? ProjectionMappedPagination<T[Key]>
        : T[Key];
};


export type Project = <T>(project: unknown) => Promise<T>;

export interface MongoQuery {
  project<T>(project: unknown): Promise<T | null | undefined>;
}

export interface MongoDocumentQuery<TDocument> {
  projectDocument(
    project: Projection<TDocument>
  ): Promise<ProjectionResult<TDocument> | null | undefined>;
}

export class CustomMongoDocumentDataSource<TDocument>
  implements MongoDocumentQuery<TDocument>, MongoQuery
{
  private query: MongoQuery;

  constructor(query: MongoQuery) {
    this.query = query;
  }

  projectDocument(project: Projection<TDocument>) {
    return this.query.project<ProjectionResult<TDocument> | null | undefined>(project);
  }

  async project<T>(project: unknown) {
    return (await this.query.project<{ _custom: T }>({ _custom: project }))?._custom;
  }
}

export interface MergedArrayProjection<TItem> {
  $project?: Projection<TItem>;
  $paginations?: RelayPagination<string>[];
}

export type MergedProjection<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? MergedArrayProjection<U>
    : T[Key] extends Primitive
      ? Key extends '_id'
        ? IdProjectionValue
        : ProjectionValue
      : T[Key] extends object | undefined
        ? MergedProjection<T[Key]>
        : ProjectionValue;
};

export function mergeProjections<T>(
  mergedObj: MergedProjection<T>,
  sources: Readonly<Projection<T>[]>,
  state?: {
    pathKey: string;
    paginationMemo: Record<string, Set<string>>;
  }
): MergedProjection<T> {
  const resultMergedObj: Record<string, unknown> = mergedObj;
  const paginationMemo = state?.paginationMemo ?? {};
  const pathKey = state?.pathKey ?? 'ROOT';

  for (const source of sources) {
    for (const sourceKey of Object.keys(source)) {
      const sourceValue = source[sourceKey as keyof Projection<T>];

      if (sourceValue === 1) {
        // Merged 1's from all sources
        resultMergedObj[sourceKey] = 1;
      } else if (typeof sourceValue === 'object') {
        let mergedValue = resultMergedObj[sourceKey] as object | undefined;
        if (!mergedValue) {
          mergedValue = {};
          resultMergedObj[sourceKey] = mergedValue;
        }

        if ('$project' in sourceValue || '$pagination' in sourceValue) {
          const arrayMergedValue = mergedValue as {
            $project?: Projection<unknown>;
            $paginations?: RelayPagination<string>[];
          };

          if ('$project' in sourceValue && sourceValue.$project) {
            if (!arrayMergedValue.$project) {
              arrayMergedValue.$project = {};
            }
            mergeProjections(
              arrayMergedValue.$project as MergedProjection<T>,
              [sourceValue.$project as Projection<T>],
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
          mergeProjections(mergedValue, [sourceValue], {
            paginationMemo,
            pathKey: `${pathKey}.${sourceKey}`,
          });
        }
      } else {
        resultMergedObj[sourceKey] = sourceValue;
      }
    }
  }

  return resultMergedObj as MergedProjection<T>;
}
