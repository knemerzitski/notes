import { OperationVariables, TypedDocumentNode, useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';

import { CollabEditor, Events as CollabEditorEvents } from '~collab/editor/collab-editor';
import { Entry } from '~utils/types';

import { CollabText } from '../../__generated__/graphql';

type PartialEditor = Readonly<Pick<CollabEditor, 'eventBus'>>;

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
    const subs = editors.map(({ key, value: editor }) => {
      const handleRevisionChanged: (e: CollabEditorEvents['revisionChanged']) => void = ({
        revision,
        changeset,
      }) => {
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
      };

      editor.eventBus.on('revisionChanged', handleRevisionChanged);

      return { eventBus: editor.eventBus, handler: handleRevisionChanged };
    });

    return () => {
      subs.forEach(({ eventBus, handler }) => {
        eventBus.off('revisionChanged', handler);
      });
    };
  }, [id, fragment, apolloClient, editors]);
}
