import { ObjectId } from 'mongodb';
import { Changeset } from '~collab/changeset/changeset';

type ProjectionPrimitive = string | number | boolean | ObjectId | Changeset;
type ProjectionValue = 1;

interface AfterPagination<TItem> {
  after?: TItem;
  first?: number;
}
interface BeforePagination<TItem> {
  before?: TItem;
  last?: number;
}

interface MatchPagination<TItem> {
  match: TItem[];
}

type Indexed<P> = P & { index: number };

type Pagination<TItem> =
  | AfterPagination<TItem>
  | BeforePagination<TItem>
  | MatchPagination<TItem>
  | Indexed<AfterPagination<TItem>>
  | Indexed<BeforePagination<TItem>>
  | Indexed<MatchPagination<TItem>>;

export interface PaginationProjection<TItem> {
  $project?: InclusionProjection<TItem>;
  $pagination?: Pagination<string>;
}

export type InclusionProjection<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? PaginationProjection<U>
    : T[Key] extends ProjectionPrimitive
      ? ProjectionValue
      : T[Key] extends object | undefined
        ? InclusionProjection<T[Key]>
        : ProjectionValue;
};

export type InclusionProjectionResult<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? InclusionProjectionResult<U>[]
    : T[Key] extends ProjectionPrimitive
      ? T[Key]
      : T[Key] extends object | undefined
        ? InclusionProjectionResult<T[Key]>
        : T[Key];
};

interface Test {
  test: string;
  deep: {
    changeset: Changeset;
  };
  items: [{ c: Changeset }];
}

const test: InclusionProjectionResult<Test> = {};

test.deep?.changeset?.strips.length;
test.items[0]?.c?.strips.length

export type Project = <T>(project: unknown) => Promise<T>;

export interface MongoDataSource {
  project<T>(project: unknown): Promise<T>;
}

export interface MongoDocumentDataSource<TDocument> {
  projectDocument(project: InclusionProjection<TDocument>): Promise<Partial<TDocument>>;
}

export class CustomMongoDocumentDataSource<TDocument>
  implements MongoDocumentDataSource<TDocument>, MongoDataSource
{
  private dataSource: MongoDataSource;

  constructor(dataSource: MongoDataSource) {
    this.dataSource = dataSource;
  }

  projectDocument(project: InclusionProjection<TDocument>): Promise<Partial<TDocument>> {
    return this.dataSource.project<Partial<TDocument>>(project);
  }

  async project<T>(project: unknown): Promise<T> {
    return (await this.dataSource.project<{ _custom: T }>({ _custom: project }))._custom;
  }
}
