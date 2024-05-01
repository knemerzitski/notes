import { ApolloCache, DataProxy } from '@apollo/client';

interface UpdateFragmentParams<TReadData, TReadVariables, TWriteData, TWriteVariables> {
  id: DataProxy.Fragment<unknown, unknown>['id'];
  read: Omit<DataProxy.ReadFragmentOptions<TReadData, TReadVariables>, 'id'>;
  write: Omit<DataProxy.WriteFragmentOptions<TWriteData, TWriteVariables>, 'id' | 'data'>;
}

/**
 * Update fragment with different read and write structure.
 */
export default function updateFragment<
  TSerialized,
  TReadData,
  TReadVariables,
  TWriteData,
  TWriteVariables,
>(
  cache: ApolloCache<TSerialized>,
  {
    id,
    read,
    write,
  }: UpdateFragmentParams<TReadData, TReadVariables, TWriteData, TWriteVariables>,
  update: (data: TReadData | null) => TWriteData
) {
  cache.performTransaction((transaction) => {
    const readData = transaction.readFragment({
      id,
      ...read,
    });

    const writeData = update(readData);
    if (writeData === undefined) return;

    transaction.writeFragment({
      id,
      data: writeData,
      ...write,
    });
  });
}
