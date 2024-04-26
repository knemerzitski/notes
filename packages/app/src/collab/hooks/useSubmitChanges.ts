import {
  MutationHookOptions,
  OperationVariables,
  TypedDocumentNode,
  useMutation,
} from '@apollo/client';
import { useCallback, useRef } from 'react';

import { CollabEditor } from '~collab/editor/collab-editor';
import isTruthy from '~utils/type-guards/isTruthy';
import { Entry } from '~utils/types';

import { CollabTextPatch, CollabTextPatchInput } from '../../__generated__/graphql';
import { Changeset } from '~collab/changeset/changeset';

type PartialEditor = Readonly<
  Pick<CollabEditor, 'submitChanges' | 'submittedChangesAcknowledged'>
>;

interface UseSubmitChangesOptions<
  TKey,
  TData,
  TVariables extends OperationVariables = OperationVariables,
> {
  editors: Entry<TKey, PartialEditor>[];
  mutation: TypedDocumentNode<TData, TVariables>;
  options?: MutationHookOptions<TData, TVariables>;
  mapVariables: (variables: Entry<TKey, CollabTextPatchInput>[]) => TVariables;
  mapData: (data: TData) => Entry<TKey, CollabTextPatch>[] | undefined | null;
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
            insertRecord: {
              generatedId: changes.userGeneratedId,
              change: {
                revision: changes.revision,
                changeset: changes.changeset.serialize(),
              },
              afterSelection: changes.afterSelection,
              beforeSelection: changes.beforeSelection,
            },
          },
        } as { key: TKey; value: CollabTextPatchInput };
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
      const newRecord = value.newRecord;
      if (!newRecord) return;
      const editor = editors.find(({ key: field }) => field === key)?.value;
      if (!editor) return;

      editor.submittedChangesAcknowledged({
        creatorUserId: newRecord.creatorUserId,
        revision: newRecord.change.revision,
        changeset: Changeset.parseValue(newRecord.change.changeset),
        afterSelection: {
          start: newRecord.afterSelection.start,
          end: newRecord.afterSelection.end ?? undefined,
        },
        beforeSelection: {
          start: newRecord.beforeSelection.start,
          end: newRecord.beforeSelection.end ?? undefined,
        },
      });
    });

    return true;
  }, [editors, fetchSubmitChanges]);

  return submitChanges;
}
