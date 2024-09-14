export interface QueryableNoteByShareLinkBatchLoadContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES
  >;
}

export async function queryableNoteByShareLinkBatchLoad(
  keys: readonly QueryableNoteByShareLinkLoadKey[],
  context: Readonly<QueryableNoteByShareLinkBatchLoadContext>,
  aggregateOptions?: AggregateOptions
): Promise<(QueryResultDeep<QueryableNote> | Error)[]> {
  const keysByShareNoteLinkPublicId = groupBy(keys, (item) => item.shareNoteLinkPublicId);

  const noteResultBy_shareNoteLinkPublicId = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByShareNoteLinkPublicId).map(
        async ([shareNoteLinkPublicId, sameLinkLoadKeys]) => {
          // Merge queries
          const mergedQuery = mergeQueries(
            {},
            sameLinkLoadKeys.map(({ noteQuery: noteQuery }) => noteQuery)
          );

          // Build aggregate pipeline
          const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
            description: queryableNoteDescription,
            customContext: context,
          });

          // Fetch from database
          const notesResult = await context.collections.notes
            .aggregate(
              [
                {
                  $match: {
                    'shareNoteLinks.publicId': shareNoteLinkPublicId,
                  },
                },
                ...aggregatePipeline,
              ],
              aggregateOptions
            )
            .toArray();

          const noteResult = notesResult[0];

          return [
            shareNoteLinkPublicId,
            {
              note: noteResult,
              mergedQuery,
            },
          ];
        }
      )
    )
  ) as Record<
    string,
    {
      note: Document | undefined;
      mergedQuery: MergedObjectQueryDeep<QueryableNote>;
    }
  >;

  return keys.map((key) => {
    const noteResult = noteResultBy_shareNoteLinkPublicId[key.shareNoteLinkPublicId];
    if (!noteResult?.note) {
      return new GraphQLError(`Shared note '${key.shareNoteLinkPublicId}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NOT_FOUND,
        },
      });
    }

    return queryFilterAggregateResult(
      key.noteQuery,
      noteResult.mergedQuery,
      noteResult.note,
      {
        descriptions: [queryableNoteDescription],
      }
    );
  });
}