import { useApolloClient } from '@apollo/client';
import { RefObject, useCallback, useEffect, useRef } from 'react';

import { Options, useDebouncedCallback } from 'use-debounce';

import { SelectionRange } from '../../../../collab/src/client/selection-range';
import { RevisionChangeset } from '../../../../collab/src/records/record';

import { EMPTY_ARRAY } from '../../../../utils/src/array/empty';

import { gql } from '../../__generated__';
import { OpenNoteSubscriptionSubscriptionDocument } from '../../__generated__/graphql';
import { useStatsLink } from '../../graphql/context/stats-link';
import { useUserId } from '../../user/context/user-id';
import { useLogger } from '../../utils/context/logger';
import { useNoteId } from '../context/note-id';
import { useCollabService } from '../hooks/useCollabService';
import { useNoteTextFieldEditor } from '../hooks/useNoteTextFieldEditor';
import { useUpdateOpenNoteSelectionRange } from '../hooks/useUpdateOpenNoteSelectionRange';
import { getUserNoteLinkId } from '../utils/id';

import {
  editorSelectionToHeadTextSelection,
  getUserHeadTextSelection,
  RevisionSelectionRange,
} from '../utils/selection';

const SubmitSelectionChangeDebounced_UserNoteLinkFragment = gql(`
  fragment SubmitSelectionChangeDebounced_UserNoteLinkFragment on UserNoteLink {
    id
    open {
      active
    }
  }
`);

export function SubmitSelectionChangeDebounced({
  inputRef,
  wait = 500,
  options,
}: {
  inputRef: RefObject<HTMLInputElement>;
  /**
   * @default 500 milliseconds
   */
  wait?: number;
  options?: Options;
}) {
  const logger = useLogger('SubmitSelectionChangeDebounced');

  const noteId = useNoteId();
  const service = useCollabService();
  const editor = useNoteTextFieldEditor();

  const client = useApolloClient();
  const updateOpenNoteSelectionRange = useUpdateOpenNoteSelectionRange();
  const userId = useUserId();
  const statsLink = useStatsLink();

  const isSubmittingRef = useRef(false);
  const hasRequestedSubmitRef = useRef(false);

  const externalChangesSinceLastRenderRef =
    useRef<readonly RevisionChangeset[]>(EMPTY_ARRAY);
  externalChangesSinceLastRenderRef.current = EMPTY_ARRAY;

  useEffect(() => {
    return editor.eventBus.on('handledExternalChanges', (changes) => {
      externalChangesSinceLastRenderRef.current = [
        ...externalChangesSinceLastRenderRef.current,
        ...changes,
      ];
    });
  }, [editor]);

  const adjustSelectionToExternalChanges = useCallback(
    (selection: SelectionRange) =>
      externalChangesSinceLastRenderRef.current.reduce(
        (sel, { changeset }) => SelectionRange.closestRetainedPosition(sel, changeset),
        selection
      ),
    []
  );

  const debouncedSubmitSelection = useDebouncedCallback(
    () => {
      if (isSubmittingRef.current) {
        logger?.debug('alreadySubmitting');
        hasRequestedSubmitRef.current = true;
        return;
      }

      function getInputSelection(): SelectionRange | undefined {
        const input = inputRef.current;
        if (!input) {
          logger?.debug('noInputElement');
          return;
        }

        if (document.activeElement !== input) {
          logger?.debug('notFocused');
          return;
        }

        if (input.selectionStart == null) {
          logger?.debug('selectionNull');
          return;
        }

        return SelectionRange.from({
          start: input.selectionStart,
          end: input.selectionEnd,
        });
      }

      const inputSelection = getInputSelection();
      // No selection to submit
      if (!inputSelection) {
        logger?.debug('noSelection');
        return;
      }

      const adjustedInputSelection = adjustSelectionToExternalChanges(inputSelection);

      if (!SelectionRange.isEqual(inputSelection, adjustedInputSelection)) {
        logger?.debug('adjustedInputSelection', {
          inputSelection,
          adjustedInputSelection,
        });
      }

      const inputAsHeadTextSelection = editorSelectionToHeadTextSelection(
        adjustedInputSelection,
        {
          service,
          editor,
        }
      );

      const latestHeadTextSelection = getUserHeadTextSelection(noteId, userId, {
        cache: client.cache,
        service,
      });
      if (latestHeadTextSelection != null) {
        if (
          RevisionSelectionRange.isEqual(
            inputAsHeadTextSelection,
            latestHeadTextSelection
          )
        ) {
          logger?.debug('duplicateSelection');
          return;
        }
      }

      // Ensure user is subscribed to `openNoteEvents`
      const isSubscribed =
        statsLink.getOngoingDocumentCount(OpenNoteSubscriptionSubscriptionDocument, {
          variables: {
            input: {
              authUser: {
                id: userId,
              },
              note: {
                id: noteId,
              },
            },
          },
        }) > 0;
      if (!isSubscribed) {
        // Will retry when subscribed
        logger?.debug('notSubscribed');
        return;
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
        logger?.debug('notActive');
        return;
      }

      isSubmittingRef.current = true;

      logger?.info('submitSelection', {
        inputSelection,
        adjustedInputSelection,
        inputAsHeadTextSelection,
        latestHeadTextSelection,
        client: {
          local: service.client.local.toString(),
          submitted: service.client.submitted.toString(),
          server: service.client.server.toString(),
        },
      });

      void updateOpenNoteSelectionRange({
        note: {
          id: noteId,
        },
        revision: inputAsHeadTextSelection.revision,
        selectionRange: inputAsHeadTextSelection.selection,
      }).finally(() => {
        isSubmittingRef.current = false;
        if (hasRequestedSubmitRef.current) {
          hasRequestedSubmitRef.current = false;
          debouncedSubmitSelection();
        }
      });

      return;
    },
    wait,
    options
  );

  // Don't submit until subscribed to `openNoteEvents`
  useEffect(
    () =>
      statsLink.subscribeToOngoingDocumentCount(
        OpenNoteSubscriptionSubscriptionDocument,
        (ongoingCount) => {
          const isSubscribed = ongoingCount > 0;
          if (isSubscribed) {
            debouncedSubmitSelection();
          }
        },
        {
          variables: {
            input: {
              authUser: {
                id: userId,
              },
              note: {
                id: noteId,
              },
            },
          },
        }
      ),

    [statsLink, userId, noteId, debouncedSubmitSelection]
  );

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

  // Submit when selection has changed since last record submission
  useEffect(() => {
    return service.eventBus.on('submittedChangesAcknowledged', () => {
      debouncedSubmitSelection();
    });
  }, [service, debouncedSubmitSelection, editor, logger]);

  // Attempt to submit when selection is directly changed by the user, no insert/deletion of text
  useEffect(() => {
    return editor.sharedEventBus.on('selectionChanged', (event) => {
      if (event.source === 'immutable') {
        debouncedSubmitSelection();
      }
    });
  }, [editor, debouncedSubmitSelection]);

  return null;
}
