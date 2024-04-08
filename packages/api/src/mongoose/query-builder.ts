import { ObjectId } from 'mongodb';

type Primitive = string | number | boolean | ObjectId;
type ProjectionValue = 1;

interface ArrayAfterSlice<TItem> {
  after?: TItem;
  first?: number;
}

interface ArrayBeforeSlice<TItem> {
  before?: TItem;
  last?: number;
}

interface ArrayMatch<TItem> {
  match: TItem[];
}

type Indexed<P> = P & { index: number };

type Never<T> = {
  [Key in keyof T]?: never;
};

type Only<T, E> = T & Never<E>;

type Pagination<TItem> =
  | Only<ArrayAfterSlice<TItem>, ArrayBeforeSlice<TItem> | ArrayMatch<TItem>>
  | Only<ArrayBeforeSlice<TItem>, ArrayAfterSlice<TItem> | ArrayMatch<TItem>>
  | Only<ArrayMatch<TItem>, ArrayAfterSlice<TItem> | ArrayBeforeSlice<TItem>>;

type ArrayPagination<TItem> = Pagination<TItem> | Indexed<Pagination<TItem>>;

export interface ArrayProjection<TItem> {
  $project?: Projection<TItem>;
  $pagination?: ArrayPagination<string>;
}

export type Projection<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? ArrayProjection<U>
    : T[Key] extends Primitive
      ? ProjectionValue
      : T[Key] extends object | undefined
        ? Projection<T[Key]>
        : ProjectionValue;
};

export type ProjectionResult<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? ProjectionResult<U>[]
    : T[Key] extends Primitive
      ? T[Key]
      : T[Key] extends object | undefined
        ? ProjectionResult<T[Key]>
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
  $paginations?: ArrayPagination<string>[];
}

export type MergedProjection<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? MergedArrayProjection<U>
    : T[Key] extends Primitive
      ? ProjectionValue
      : T[Key] extends object | undefined
        ? MergedProjection<T[Key]>
        : ProjectionValue;
};

function calcPaginationKey(p: Pagination<string>): string {
  if ('after' in p) {
    return `a${p.after ?? ''}:${p.first ?? ''}`;
  } else if ('before' in p) {
    return `b${p.before ?? ''}:${p.last ?? ''}`;
  } else {
    return 'p';
  }
}

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
            $paginations?: ArrayPagination<string>[];
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

            // Remove index as it's irrelevant during actual query
            let pagination: ArrayPagination<string>;
            if ('index' in sourceValue.$pagination) {
              const { index, ...paginationNoIndex } = sourceValue.$pagination;
              pagination = paginationNoIndex;
            } else {
              pagination = sourceValue.$pagination;
            }

            // Add only unique paginations, skip duplicate
            const currentPathKey = `${pathKey}.${sourceKey}`;
            const paginationValue = calcPaginationKey(pagination);
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