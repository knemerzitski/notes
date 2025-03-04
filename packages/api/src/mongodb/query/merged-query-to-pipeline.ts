import { Document } from 'mongodb';

import { mergeObjects } from '../../../../utils/src/object/merge-objects';
import { stringPathToNestedObject } from '../../../../utils/src/string/string-path-to-nested-object';
import { isDefined } from '../../../../utils/src/type-guards/is-defined';
import { isObjectLike } from '../../../../utils/src/type-guards/is-object-like';

import { DescriptionDeep, FieldDescription } from './description';
import { isMergedQueryArgField, MergedQueryDeep } from './merge-queries';

export function mergedQueryToPipeline<TSchema = unknown, TContext = unknown>(
  rootQuery: MergedQueryDeep<TSchema>,
  context?: BuildStagesContext<TSchema, TContext>
): Document[] {
  return [
    ...buildStages(rootQuery, context),
    {
      $project: buildLastProjectValue(rootQuery, {
        descriptions: context?.description ? [context.description] : [],
      }),
    },
  ];
}

interface BuildStagesContext<TSchema = unknown, TContext = unknown> {
  description?: DescriptionDeep<TSchema, unknown, TContext>;
  customContext?: TContext;
  rootPath?: string[];
  relativeQuery?: MergedQueryDeep<unknown>;
}

export type AddStagesResolver<TSchema = unknown, TContext = unknown> = (
  context: AddStagesContext<TSchema, TContext>
) => Document[] | void;

interface InnerStagesOptions {
  /**
   * @default false
   */
  keepFields?: boolean;
  /**
   * Starting point for building the stages
   */
  subPath?: string;
}

interface InnerLastProjectOptions {
  /**
   * Removes resolvers from starting projection
   * @default false
   */
  includeRootResolvers?: boolean;
  /**
   * Starting point for building the projection
   */
  subPath?: string;
}

export interface AddStagesContext<TSchema = unknown, TContext = unknown> {
  /**
   * Object properties that match the description
   */
  fields: AddStagesContextField<TSchema>[];
  /**
   * Any custom context passed during execution
   */
  customContext: TContext;
  /**
   * Recursively builds $addStages for child properties
   * and returns the result. {@link keepFields} is used
   * to decide if keep or remove fields from normal flow.
   * Useful $lookup stage where child properties are meant
   * to be inside $lookup pipeline and should be removed
   * from root stage.
   *
   * @default false
   * @param keepFields
   * @returns
   */
  subStages: (options?: InnerStagesOptions) => Document[];
  /**
   * $project value that is used relative current path.
   *
   * @default false
   * @param includeRootResolvers
   * @returns
   */
  subLastProject: (options?: InnerLastProjectOptions) => unknown;
  /**
   * Query that is relative to nearest starting point of build process.
   * Unlike fields.query, there is only one relativeQuery.
   */
  relativeQuery: MergedQueryDeep<unknown>;
}

interface AddStagesContextField<TSchema = unknown> {
  /**
   * Query relative to current path of object description.
   */
  query: MergedQueryDeep<TSchema>;
  rootPath: string;
  relativePath: string;
  parentRelativePath: string;
}

interface DepthQueueItem<TSchema = unknown, TContext = unknown> {
  query: MergedQueryDeep<TSchema>;
  description?: DescriptionDeep<TSchema, unknown, TContext>;
  rootPath: string[];
  relativePath: string[];
}

export function buildStages<TSchema = unknown, TContext = unknown>(
  rootQuery: MergedQueryDeep<TSchema>,
  context?: BuildStagesContext<TSchema, TContext>
): Document[] {
  const customContext = context?.customContext;
  const relativeQuery = context?.relativeQuery ?? rootQuery;

  const rootStages: Document[] = [];

  const depthQueue: Record<number, DepthQueueItem<TSchema, TContext>[]> = {
    0: [
      {
        query: rootQuery,
        description: context?.description,
        rootPath: context?.rootPath ?? [],
        relativePath: [],
      },
    ],
  };
  const ignoreQueries = new Set<MergedQueryDeep<unknown>>();
  let currentDepth = 0;
  let queue: DepthQueueItem<TSchema, TContext>[] | undefined;
  while ((queue = depthQueue[currentDepth]) != null) {
    // Current depth is empty, go deeper and process fields on same edpth
    if (queue.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete depthQueue[currentDepth];
      currentDepth += 1;
      const currentDepthQueue = depthQueue[currentDepth];
      if (!currentDepthQueue) continue;

      // Process all fields of same depth
      for (const entry of groupByDescription(currentDepthQueue)) {
        const [description, fields] = entry as [
          DescriptionDeep<TSchema, unknown, TContext>,
          DepthQueueItem<TSchema, TContext>[],
        ];
        const buildInnerStages: AddStagesContext['subStages'] = (options) => {
          const keepFields = options?.keepFields ?? false;
          const subPath = options?.subPath;

          // Build stages recursively
          return fields.flatMap((field) => {
            if (subPath) {
              const newField = traverseToDepthQueueItem(subPath, field);
              if (!newField) {
                return [];
              } else {
                field = newField;
              }
            }
            if (!keepFields) {
              ignoreQueries.add(field.query);
            }
            return buildStages(field.query, {
              description: field.description,
              rootPath: field.rootPath,
              customContext: customContext as TContext,
              relativeQuery: field.query,
            });
          });
        };

        const innerLastProject: AddStagesContext['subLastProject'] = (options) => {
          const includeRootResolvers = options?.includeRootResolvers ?? false;
          const subPath = options?.subPath;

          let mainDescription = description;
          if (!includeRootResolvers) {
            mainDescription = { ...description };
            delete mainDescription.$addStages;
            delete mainDescription.$mapAggregateResult;
            delete mainDescription.$mapLastProject;
          }

          return fields.reduce<unknown>((existingProjectValue, field) => {
            let fieldDescription: typeof mainDescription | undefined = mainDescription;
            if (subPath) {
              const newField = traverseToDepthQueueItem(subPath, field);
              if (!newField) {
                return [];
              } else {
                field = newField;
                fieldDescription = newField.description;
              }
            }

            return mergeObjects(
              existingProjectValue,
              buildLastProjectValue(field.query, {
                descriptions: fieldDescription ? [fieldDescription] : [],
              })
            );
          }, {});
        };

        const newStages = description.$addStages?.({
          fields: fields.map(({ query, rootPath, relativePath }) => ({
            query: query,
            rootPath: rootPath.join('.'),
            relativePath: relativePath.join('.'),
            parentRelativePath: relativePath.slice(0, -1).join('.'),
          })),
          customContext: customContext as TContext,
          subStages: buildInnerStages,
          subLastProject: innerLastProject,
          relativeQuery,
        });
        if (newStages) {
          rootStages.push(...newStages);
        }
      }
    } else {
      // Dequeue node
      const item = queue.shift();
      if (!item || ignoreQueries.has(item.query)) continue;

      const { query, description, rootPath, relativePath } = item;

      // Queue next depth
      if (isObjectLike(query)) {
        let deeperQueue = depthQueue[currentDepth + 1];
        if (!deeperQueue) {
          deeperQueue = [];
          depthQueue[currentDepth + 1] = deeperQueue;
        }
        for (const subQueryKey of Object.keys(query)) {
          if (isMergedQueryArgField(subQueryKey)) continue;

          const subQuery = query[subQueryKey as keyof typeof query];
          if (subQuery == null) {
            continue;
          }

          const subDescription =
            description?.$anyKey ??
            description?.[subQueryKey as keyof typeof description];

          deeperQueue.push({
            query: subQuery as MergedQueryDeep<TSchema>,
            description: subDescription as DescriptionDeep<TSchema, unknown, TContext>,
            rootPath: [...rootPath, subQueryKey],
            relativePath: [...relativePath, subQueryKey],
          });
        }
      }
    }
  }

  return rootStages;
}

function traverseToDepthQueueItem<TSchema, TContext>(
  path: string,
  item: DepthQueueItem<TSchema, TContext>
) {
  let target = item;
  for (const subQueryKey of path.split('.')) {
    const query = target.query;
    const description = target.description;
    if (isObjectLike(query)) {
      const subQuery = query[subQueryKey as keyof typeof query];
      if (subQuery == null) {
        return null;
      }

      const subDescription =
        description?.$anyKey ?? description?.[subQueryKey as keyof typeof description];

      target = {
        query: subQuery as MergedQueryDeep<TSchema>,
        description: subDescription as DescriptionDeep<TSchema, unknown, TContext>,
        rootPath: [...target.rootPath, subQueryKey],
        relativePath: [...target.relativePath, subQueryKey],
      };
    }
  }
  return target;
}

function groupByDescription<D, T extends { description?: D }>(arr: T[] | undefined) {
  if (!arr) return [];

  const map = new Map<D, T[]>();
  for (const item of arr) {
    if (item.description == null) continue;

    let group = map.get(item.description);
    if (!group) {
      group = [];
      map.set(item.description, group);
    }
    group.push(item);
  }

  return map.entries();
}

export type MapLastProjectResolver<TSchema = unknown> = (
  context: MapLastProjectContext<TSchema>
) => unknown;

export interface MapLastProjectContext<TSchema = unknown> {
  /**
   * Raw query used for creating the projection
   */
  query: MergedQueryDeep<TSchema>;
  /**
   * Actual $project value
   */
  projectValue: TSchema extends object ? Record<string, unknown> : unknown;
}

interface BuildLastProjectValueContext<TSchema = unknown, TContext = unknown> {
  descriptions?: DescriptionDeep<TSchema, unknown, TContext>[];
}

export function buildLastProjectValue<TSchema = unknown, TContext = unknown>(
  rootQuery: MergedQueryDeep<TSchema>,
  context?: BuildLastProjectValueContext<TSchema, TContext>
): unknown {
  let projectValue: unknown = null;

  const descriptions = context?.descriptions ?? [];

  if (isObjectLike(rootQuery)) {
    for (const subQueryKey of Object.keys(rootQuery)) {
      if (isMergedQueryArgField(subQueryKey)) continue;

      const subQuery = rootQuery[subQueryKey as keyof typeof rootQuery];
      if (subQuery == null) {
        continue;
      }

      const subDescriptions = descriptions
        .map((desc) => desc[subQueryKey as keyof typeof desc])
        .filter(isDefined);

      const subDescriptions_noAnyKey = subDescriptions
        .map((subDesc) => {
          const { $anyKey, ...rest } = subDesc as FieldDescription;
          return rest;
        })
        .filter((subDesc) => Object.keys(subDesc).length > 0);

      const anyKeySplitDescriptions = subDescriptions
        .map((subDesc) => (subDesc as FieldDescription).$anyKey)
        .filter(isDefined)
        .flatMap((anyKeySubDesc) =>
          Object.keys(subQuery).map((sub2QueryKey) => ({
            [sub2QueryKey]: anyKeySubDesc,
          }))
        );

      const subProjectValue = buildLastProjectValue(
        subQuery as MergedQueryDeep<unknown>,
        {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
          descriptions: [...anyKeySplitDescriptions, ...subDescriptions_noAnyKey] as any,
        }
      );
      if (subProjectValue != null) {
        projectValue = mergedProject(projectValue, {
          [subQueryKey]: subProjectValue,
        });
      }
    }
  }

  const resolvers = descriptions.map((desc) => desc.$mapLastProject).filter(isDefined);

  resolvers.forEach((resolver) => {
    const mappedLastProject = resolver({
      query: rootQuery,
      projectValue: (projectValue ?? rootQuery) as TSchema extends object
        ? Record<string, unknown>
        : unknown,
    });
    if (mappedLastProject != null) {
      let isReplace = false;
      if (typeof mappedLastProject === 'object' && '$replace' in mappedLastProject) {
        isReplace = !!mappedLastProject.$replace;
        delete mappedLastProject.$replace;
      }

      projectValue = mergedProject(isReplace ? {} : projectValue, mappedLastProject);
    }
  });

  return projectValue ?? rootQuery;
}

function mergedProject(existingProject: unknown, newProject: unknown) {
  if (newProject == null || typeof newProject !== 'object') return newProject;
  if (existingProject == null || typeof existingProject !== 'object') {
    existingProject = Array.isArray(newProject) ? [] : {};
  }

  for (const key of Object.keys(newProject)) {
    mergeObjects(
      existingProject,
      stringPathToNestedObject(key, newProject[key as keyof typeof newProject], '.')
    );
  }

  return existingProject;
}
