import { useApolloClient } from '@apollo/client';
import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

import { Options, useDebouncedCallback } from 'use-debounce';

import { EMPTY_ARRAY } from '../../../../utils/src/array/empty';

import { Changeset, Selection } from '../../../../collab/src';

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
  EditorSelection,
  isTypedSelectionEqual,
  SelectionTransformer,
} from '../utils/selection-transformer';

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

  const externalChangesSinceLastRenderRef = useRef<readonly Changeset[]>(EMPTY_ARRAY);
  externalChangesSinceLastRenderRef.current = EMPTY_ARRAY;

  const selectionTransformer = useMemo(
    () =>
      new SelectionTransformer({
        cache: client.cache,
        editor,
        service,
        noteId,
        logger,
      }),
    [client, editor, service, noteId, logger]
  );

  useEffect(() => {
    return editor.on('externalTyping:applied', ({ changeset }) => {
      externalChangesSinceLastRenderRef.current = [
        ...externalChangesSinceLastRenderRef.current,
        changeset,
      ];
    });
  }, [editor]);

  const adjustSelectionToExternalChanges = useCallback(
    (selection: Selection) =>
      externalChangesSinceLastRenderRef.current.reduce(
        // TODO is true/left correct?
        (sel, changeset) => sel.follow(changeset, true),
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

      function getInputSelection(): Selection | undefined {
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

        return Selection.create(
          input.selectionStart,
          input.selectionEnd ?? input.selectionStart
        );
      }

      const inputSelection = getInputSelection();
      // No selection to submit
      if (!inputSelection) {
        logger?.debug('noSelection');
        return;
      }

      const adjustedInputSelection = adjustSelectionToExternalChanges(inputSelection);

      if (!inputSelection.isEqual(adjustedInputSelection)) {
        logger?.debug('adjustedInputSelection', {
          inputSelection,
          adjustedInputSelection,
        });
      }

      const editorSelection: EditorSelection = {
        type: 'editor',
        revision: service.viewRevision,
        selection: adjustedInputSelection,
      };

      const serverSelection = selectionTransformer.editorToServer(editorSelection);

      if (!serverSelection) {
        logger?.debug('editorToServer:undefined');
        return;
      }

      const latestServerSelection = selectionTransformer.userAtRevision(
        userId,
        service.serverRevision
      );
      if (latestServerSelection != null) {
        if (isTypedSelectionEqual(serverSelection, latestServerSelection)) {
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

      logger?.debug('submitSelection', {
        inputSelection,
        adjustedInputSelection,
        inputAsHeadTextSelection: serverSelection,
        latestHeadTextSelection: latestServerSelection,
        client: {
          local: service.localChanges.toString(),
          submitted: service.submittedChanges.toString(),
          server: service.serverText.toString(),
        },
      });

      void updateOpenNoteSelectionRange({
        note: {
          id: noteId,
        },
        revision: serverSelection.revision,
        selection: serverSelection.selection,
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
    return service.on('submittedChanges:acknowledged', () => {
      debouncedSubmitSelection();
    });
  }, [service, debouncedSubmitSelection, editor, logger]);

  // Attempt to submit when selection is directly changed by the user, no insert/deletion of text
  useEffect(() => {
    return editor.on('selection:changed', (event) => {
      if (event.source === 'movement') {
        debouncedSubmitSelection();
      }
    });
  }, [editor, debouncedSubmitSelection]);

  return null;
}
