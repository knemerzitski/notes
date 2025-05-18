import UndoIcon from '@mui/icons-material/Undo';
import {
  Box,
  CircularProgress,
  css,
  IconButton,
  IconButtonProps,
  styled,
  Tooltip,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { useDebouncedCallback } from 'use-debounce';

import { CollabService } from '../../../../collab2/src';

import { useLogger } from '../../utils/context/logger';
import { useShowError } from '../../utils/context/show-message';
import { useIsOnline } from '../../utils/hooks/useIsOnline';
import { useCollabService } from '../hooks/useCollabService';

export function UndoButton(
  props: Omit<Parameters<typeof CollabServiceDefined>[0], 'service'>
) {
  const collabService = useCollabService(true);

  if (!collabService) {
    return null;
  }

  return <CollabServiceDefined {...props} service={collabService} />;
}

// TODO writecomponent tests for UndoButton

function CollabServiceDefined({
  service,
  IconButtonProps,
  cancelUndoTimeout = 1000,
}: {
  service: CollabService;
  IconButtonProps?: Omit<IconButtonProps, 'disabled' | 'aria-label' | 'onClick'>;
  /**
   * When undo takes longer than expected, cancel it after timeout in millis
   * @default 1000
   */
  cancelUndoTimeout?: number;
}) {
  const logger = useLogger('UndoButton');

  const isOnline = useIsOnline();
  const showError = useShowError();

  const [canUndo, setCanUndo] = useState(service.canUndo());

  const [isUndoPending, setIsUndoPending] = useState(false);
  const isUndoPendingRef = useRef(false);

  const cancelPendingUndoDebounced = useDebouncedCallback(() => {
    if (!isUndoPendingRef.current) {
      return;
    }
    logger?.debug('debounced.cancelPending');

    showError('Undo failed. Unable to query for older records.');
    setIsUndoPending(false);
    isUndoPendingRef.current = false;
  }, cancelUndoTimeout);

  // TODO add a timer when to cancel click when it hasnt finished

  function handleClickUndo() {
    logger?.debug('click');
    if (!service.undo()) {
      const hasMoreServerRecords = service.canUndo();
      logger?.debug('click.undo.false', {
        isOnline,
        hasMoreServerRecords,
      });

      if (isOnline && hasMoreServerRecords) {
        logger?.debug('click.pending');
        setIsUndoPending(true);
        isUndoPendingRef.current = true;
        cancelPendingUndoDebounced();
      }
      setCanUndo(false);
    }
  }

  // Update setCanUndo
  useEffect(() => {
    setCanUndo(service.canUndo());
    return service.on(['localTyping:applied', 'records:updated'], () => {
      setCanUndo(service.canUndo());
    });
  }, [service]);

  // Cancel pending when offline
  useEffect(() => {
    if (!isUndoPending) {
      return;
    }

    if (!isOnline) {
      logger?.debug('isOffline.cancelPending');
      setIsUndoPending(false);
      isUndoPendingRef.current = false;
      cancelPendingUndoDebounced.cancel();
    }
  }, [isOnline, isUndoPending, cancelPendingUndoDebounced, logger]);

  useEffect(() => {
    if (!isUndoPending) {
      return;
    }

    let isRunningTimeout = false;

    return service.on(['records:updated'], () => {
      if (isRunningTimeout) {
        return;
      }
      isRunningTimeout = true;

      setTimeout(() => {
        try {
          if (!isUndoPendingRef.current) {
            return;
          }

          const hasMoreServerRecords = service.canUndo();
          logger?.debug('userRecordsUpdated', {
            hasMoreServerRecords,
            isUndoPending: isUndoPendingRef.current,
          });

          if (!service.undo()) {
            logger?.debug('userRecordsUpdated.undo.false');
            if (!hasMoreServerRecords) {
              logger?.debug('userRecordsUpdated.undo.noMoreRecords');
              showError('Undo failed. No older records found.');
              setIsUndoPending(false);
              isUndoPendingRef.current = false;
              cancelPendingUndoDebounced.cancel();
            } else {
              logger?.debug('userRecordsUpdated.undo.waitingForRecords');
            }
          } else {
            logger?.debug('userRecordsUpdated.undo.success');
            setIsUndoPending(false);
            isUndoPendingRef.current = false;
            cancelPendingUndoDebounced.cancel();
          }
        } finally {
          isRunningTimeout = false;
        }
      }, 0);
    });
  }, [isUndoPending, service, showError, cancelPendingUndoDebounced, logger]);

  return (
    <RootBoxStyled>
      <IconButton
        onClick={handleClickUndo}
        aria-label="history undo"
        disabled={!canUndo || isUndoPending}
        {...IconButtonProps}
      >
        <Tooltip title="Undo">
          <UndoIcon />
        </Tooltip>
      </IconButton>
      {isUndoPending && <CircularProgressStyled size={16} />}
    </RootBoxStyled>
  );
}

const RootBoxStyled = styled(Box)(css`
  position: relative;
  flex-grow: 1;
`);

const CircularProgressStyled = styled(CircularProgress)(css`
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
`);
