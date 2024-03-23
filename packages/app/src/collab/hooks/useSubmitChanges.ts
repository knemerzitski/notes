import {
  MutationHookOptions,
  OperationVariables,
  TypedDocumentNode,
  useMutation,
} from '@apollo/client';
import { useCallback, useRef } from 'react';

import { CollaborativeEditor } from '~collab/editor/collaborative-editor';
import isTruthy from '~utils/isTruthy';
import { Entry } from '~utils/types';

import {
  CollaborativeDocumentPatch,
  CollaborativeDocumentPatchInput,
} from '../../__generated__/graphql';

type PartialEditor = Readonly<
  Pick<CollaborativeEditor, 'submitChanges' | 'submittedChangesAcknowledged'>
>;

interface UseSubmitChangesOptions<
  TKey,
  TData,
  TVariables extends OperationVariables = OperationVariables,
> {
  editors: Entry<TKey, PartialEditor>[];
  mutation: TypedDocumentNode<TData, TVariables>;
  options?: MutationHookOptions<TData, TVariables>;
  mapVariables: (variables: Entry<TKey, CollaborativeDocumentPatchInput>[]) => TVariables;
  mapData: (data: TData) => Entry<TKey, CollaborativeDocumentPatch>[] | undefined | null;
}

export default function useSubmitChanges<
  TKey,
  TData,
  TVariables extends OperationVariables = OperationVariables,
>({
  mutation,
  options,
  editors,
  mapVariables,
  mapData,
}: UseSubmitChangesOptions<TKey, TData, TVariables>) {
  const [fetchSubmitChanges] = useMutation(mutation, options);

  const mapVariablesRef = useRef(mapVariables);
  mapVariablesRef.current = mapVariables;

  const mapDataRef = useRef(mapData);
  mapDataRef.current = mapData;

  const submitChanges = useCallback(async () => {
    const allChanges = editors
      .map(({ key, value: editor }) => {
        const changes = editor.submitChanges();
        if (!changes) return false;

        return {
          key,
          value: {
            targetRevision: changes.revision,
            changeset: changes.changeset.serialize(),
          },
        };
      })
      .filter(isTruthy);
    if (allChanges.length === 0) return false;

    const { data } = await fetchSubmitChanges({
      variables: mapVariablesRef.current(allChanges),
    });
    if (!data) return false;

    const acknowledgedRevisions = mapDataRef.current(data);
    if (!acknowledgedRevisions) return false;

    acknowledgedRevisions.forEach(({ key, value }) => {
      const editor = editors.find(({ key: field }) => field === key)?.value;
      if (editor) {
        editor.submittedChangesAcknowledged(value.revision);
      }
    });

    return true;
  }, [editors, fetchSubmitChanges]);

  return submitChanges;
}
