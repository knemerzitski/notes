// TODO delete this file

import { OperationVariables, TypedDocumentNode, useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';

import {
  CollaborativeEditor,
  Events as CollaborativeEditorEvents,
} from '~collab/editor/collaborative-editor';
import { Entry } from '~utils/types';

import { CollaborativeDocument } from '../../__generated__/graphql';


type PartialEditor = Readonly<Pick<CollaborativeEditor, 'eventBus'>>;

export interface ContentSyncCacheLatestTextProps<
  TKey,
  TData,
  TVariables extends OperationVariables = OperationVariables,
> {
  editors: Entry<TKey, PartialEditor>[];
  id?: string;
  fragment: TypedDocumentNode<TData, TVariables>;
  mapData: (data: Entry<TKey, Pick<CollaborativeDocument, 'viewText'>>) => TData;
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
    const subs = editors.map(({ key, value: editor }) => {
      const handleViewChanged: (e: CollaborativeEditorEvents['viewChanged']) => void = ({
        view,
      }) => {
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
      };

      editor.eventBus.on('viewChanged', handleViewChanged);

      return { eventBus: editor.eventBus, handler: handleViewChanged };
    });

    return () => {
      subs.forEach(({ eventBus, handler }) => {
        eventBus.off('viewChanged', handler);
      });
    };
  }, [id, fragment, apolloClient, editors]);
}
