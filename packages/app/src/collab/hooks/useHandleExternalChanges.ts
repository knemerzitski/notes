import { OperationVariables, SubscriptionOptions, useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';

import { Changeset } from '~collab/changeset/changeset';
import { CollaborativeEditor } from '~collab/editor/collaborative-editor';
import { Entry } from '~utils/types';

import { CollaborativeDocumentPatch } from '../../__generated__/graphql';

type PartialEditor = Readonly<Pick<CollaborativeEditor, 'handleExternalChange'>>;

interface UseHandleExternalChangesOptions<
  TKey,
  TData,
  TVariables extends OperationVariables = OperationVariables,
> {
  editors: Entry<TKey, PartialEditor>[];
  options: SubscriptionOptions<TVariables, TData>;
  mapData: (data: TData) => Entry<TKey, CollaborativeDocumentPatch>[] | null | undefined;
}

export default function useHandleExternalChanges<
  TData,
  TVariables extends OperationVariables = OperationVariables,
>({ options, mapData, editors }: UseHandleExternalChangesOptions<TData, TVariables>) {
  const apolloClient = useApolloClient();

  const mapDataRef = useRef(mapData);
  mapDataRef.current = mapData;

  useEffect(() => {
    const observable = apolloClient.subscribe(options);

    const sub = observable.subscribe({
      next(value) {
        if (!value.data) return;
        const patch = mapDataRef.current(value.data);

        if (patch) {
          patch.forEach(({ key, value }) => {
            const editor = editors.find(({ key: field }) => field === key)?.value;
            if (editor) {
              editor.handleExternalChange({
                revision: value.revision,
                changeset: Changeset.parseValue(value.changeset),
              });
            }
          });
        }
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [apolloClient, options, editors]);
}
