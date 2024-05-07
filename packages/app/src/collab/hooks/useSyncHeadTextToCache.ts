import { OperationVariables, TypedDocumentNode, useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';

import { CollabEditorEvents } from '~collab/client/collab-editor';
import { Entry } from '~utils/types';

import { CollabText } from '../../__generated__/graphql';
import { Emitter } from '~utils/mitt-unsub';

type PartialEditor = Readonly<{
  eventBus: Emitter<Pick<CollabEditorEvents, 'revisionChanged'>>;
}>;

export interface UseSyncHeadTextToCacheOptions<
  TKey,
  TData,
  TVariables extends OperationVariables = OperationVariables,
> {
  editors: Entry<TKey, PartialEditor>[];
  id?: string;
  fragment: TypedDocumentNode<TData, TVariables>;
  mapData: (data: Entry<TKey, Pick<CollabText, 'headText'>>) => TData;
}

export default function useSyncHeadTextToCache<
  TData,
  TVariables extends OperationVariables = OperationVariables,
>({ editors, id, fragment, mapData }: UseSyncHeadTextToCacheOptions<TData, TVariables>) {
  const apolloClient = useApolloClient();

  const mapDataRef = useRef(mapData);
  mapDataRef.current = mapData;

  useEffect(() => {
    const messageSubscriptions = editors.map(({ key, value: editor }) =>
      editor.eventBus.on('revisionChanged', ({ changeset, revision }) => {
        apolloClient.writeFragment({
          id,
          fragment,
          data: mapDataRef.current({
            key,
            value: {
              headText: {
                changeset: changeset.serialize(),
                revision,
              },
            },
          }),
        });
      })
    );

    return () => {
      messageSubscriptions.forEach((unsubscribe) => {
        unsubscribe();
      });
    };
  }, [id, fragment, apolloClient, editors]);
}
