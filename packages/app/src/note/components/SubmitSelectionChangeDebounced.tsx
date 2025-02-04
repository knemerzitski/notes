import { useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';

import { Options, useDebouncedCallback } from 'use-debounce';
import { SelectionRange } from '~collab/client/selection-range';

import { gql } from '../../__generated__';
import { useStatsLink } from '../../graphql/context/stats-link';
import { useUserId } from '../../user/context/user-id';
import { useNoteId } from '../context/note-id';
import { useCollabService } from '../hooks/useCollabService';
import { useNoteTextFieldEditor } from '../hooks/useNoteTextFieldEditor';
import { useUpdateOpenNoteSelectionRange } from '../hooks/useUpdateOpenNoteSelectionRange';
import { getUserNoteLinkId } from '../utils/id';

import { openNoteSubscriptionOperationName } from './OpenNoteSubscription';

const SubmitSelectionChangeDebounced_UserNoteLinkFragment = gql(`
  fragment SubmitSelectionChangeDebounced_UserNoteLinkFragment on UserNoteLink {
    id
    open {
      active
    }
  }
`);

export function SubmitSelectionChangeDebounced({
  wait = 500,
  options,
}: {
  /**
   * @default 500 milliseconds
   */
  wait?: number;
  options?: Options;
}) {
  const noteId = useNoteId();
  const service = useCollabService();
  const editor = useNoteTextFieldEditor();

  const client = useApolloClient();
  const updateOpenNoteSelectionRange = useUpdateOpenNoteSelectionRange();
  const userId = useUserId();
  const statsLink = useStatsLink();

  const isSubmittingRef = useRef(false);

  const editorSelectionRef = useRef<SelectionRange | null>(null);
  const submittedEditorSelectionRef = useRef<SelectionRange | null>(null);

  const debouncedSubmitSelection = useDebouncedCallback(
    () => {
      if (!editorSelectionRef.current) {
        return;
      }

      const submitServiceSelection = editor.transformToServiceSelection(
        editorSelectionRef.current
      );

      function canSubmitSelection() {
        if (isSubmittingRef.current || !editorSelectionRef.current) {
          return false;
        }

        // Check against last submitted value
        const alreadySubmittedThisValue =
          submittedEditorSelectionRef.current &&
          SelectionRange.isEqual(
            submittedEditorSelectionRef.current,
            editorSelectionRef.current
          );
        if (alreadySubmittedThisValue) {
          return false;
        }

        // Ensure user is subscribed to `openNoteEvents`
        const isSubscribed =
          statsLink.getUserOngoing(userId).byName(openNoteSubscriptionOperationName) > 0;
        // TODO wait for a bit to sub to be ready, opennotesub will respond, so in cache will have open value..
        if (!isSubscribed) {
          // Will retry when subscribed
          return false;
        }

        // Ensure note is open in cache
        const userNoteLink = client.cache.readFragment({
          fragment: SubmitSelectionChangeDebounced_UserNoteLinkFragment,
          id: client.cache.identify({
            __typename: 'UserNoteLink',
            id: getUserNoteLinkId(noteId, userId),
          }),
        });
        if (!userNoteLink?.open?.active) {
          // Note is not subscribed or user is not present
          return false;
        }

        return true;
      }

      if (!canSubmitSelection()) {
        return;
      }

      isSubmittingRef.current = true;
      submittedEditorSelectionRef.current = editorSelectionRef.current;

      void updateOpenNoteSelectionRange({
        note: {
          id: noteId,
        },
        revision: service.headRevision,
        selectionRange: submitServiceSelection,
      }).finally(() => {
        isSubmittingRef.current = false;
        if (canSubmitSelection()) {
          debouncedSubmitSelection();
        }
      });
    },
    wait,
    options
  );

  // Don't submit until subscribed to `openNoteEvents`
  useEffect(() => {
    const eventBus = statsLink.getUserEventBus(userId);

    return eventBus.on('byName', ({ operationName, ongoingCount }) => {
      if (operationName !== openNoteSubscriptionOperationName) {
        return;
      }

      const isSubscribed = ongoingCount > 0;
      if (isSubscribed) {
        debouncedSubmitSelection();
      }
    });
  }, [statsLink, userId, debouncedSubmitSelection]);

  // Submit when note is open
  useEffect(() => {
    const obs = client.cache.watchFragment({
      fragment: SubmitSelectionChangeDebounced_UserNoteLinkFragment,
      from: {
        __typename: 'UserNoteLink',
        id: getUserNoteLinkId(noteId, userId),
      },
      optimistic: false,
    });

    const sub = obs.subscribe((value) => {
      if (!value.complete) {
        return;
      }

      const noteLink = value.data;

      if (!noteLink.open) {
        return;
      }

      if (noteLink.open.active) {
        // User is present, submit current selection
        debouncedSubmitSelection();
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [client, userId, noteId, debouncedSubmitSelection]);

  useEffect(() => {
    return editor.sharedEventBus.on('selectionChanged', (event) => {
      if (event.source === 'immutable') {
        editorSelectionRef.current = event.selection;
        debouncedSubmitSelection();
      }
    });
  }, [editor, debouncedSubmitSelection]);

  useEffect(() => {
    return editor.eventBus.on('handledExternalChanges', (changes) => {
      if (changes.length === 0) {
        return;
      }

      // Adjust saved selections
      const selectionRefs = [editorSelectionRef, submittedEditorSelectionRef];
      selectionRefs.forEach((ref) => {
        if (!ref.current) {
          return;
        }

        let newSelection = ref.current;
        for (const { changeset } of changes) {
          newSelection = SelectionRange.closestRetainedPosition(newSelection, changeset);
        }

        ref.current = newSelection;
      });
    });
  }, [editor, service]);
  return null;
}
