// TODO delete this file

import { OperationVariables, TypedDocumentNode, useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';

import { CollabEditorEvents as CollabEditorEvents } from '~collab/editor/collab-editor';
import { Entry } from '~utils/types';

import { CollabText } from '../../__generated__/graphql';
import { Emitter } from '~utils/mitt-unsub';

type PartialEditor = Readonly<{
  eventBus: Emitter<Pick<CollabEditorEvents, 'viewChanged'>>;
}>;

export interface ContentSyncCacheLatestTextProps<
  TKey,
  TData,
  TVariables extends OperationVariables = OperationVariables,
> {
  editors: Entry<TKey, PartialEditor>[];
  id?: string;
  fragment: TypedDocumentNode<TData, TVariables>;
  mapData: (data: Entry<TKey, Pick<CollabText, 'viewText'>>) => TData;
}

export default function useSyncViewTextToCache<
  TData,
  TVariables extends OperationVariables = OperationVariables,
>({
  editors,
  id,
  fragment,
  mapData,
}: ContentSyncCacheLatestTextProps<TData, TVariables>) {
  const apolloClient = useApolloClient();

  const mapDataRef = useRef(mapData);
  mapDataRef.current = mapData;

  useEffect(() => {
    const messageSubscriptions = editors.map(({ key, value: editor }) =>
      editor.eventBus.on('viewChanged', ({ view }) => {
        apolloClient.writeFragment({
          id,
          fragment,
          data: mapDataRef.current({
            key,
            value: {
              viewText: view.joinInsertions(),
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
