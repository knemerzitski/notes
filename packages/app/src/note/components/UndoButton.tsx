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

import { CollabService } from '../../../../collab/src/client/collab-service';

import { useCollabService } from '../hooks/useCollabService';
import { useShowError } from '../../utils/context/show-message';
import { useIsOnline } from '../../utils/hooks/useIsOnline';
import { useDebouncedCallback } from 'use-debounce';
import { useLogger } from '../../utils/context/logger';

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
      const hasMoreUserRecords = service.userRecords?.hasMoreRecords();
      logger?.debug('click.undo.false', {
        isOnline,
        hasMoreUserRecords,
      });

      if (isOnline && hasMoreUserRecords) {
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
    return service.eventBus.on(['appliedTypingOperation', 'userRecordsUpdated'], () => {
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

    return service.eventBus.on(['userRecordsUpdated'], () => {
      if (isRunningTimeout) {
        return;
      }
      isRunningTimeout = true;

      setTimeout(() => {
        try {
          if (!service.userRecords || !isUndoPendingRef.current) {
            return;
          }

          const hasMoreUserRecords = service.userRecords.hasMoreRecords();
          logger?.debug('userRecordsUpdated', {
            hasMoreUserRecords,
            isUndoPending: isUndoPendingRef.current,
          });

          if (!service.undo()) {
            logger?.debug('userRecordsUpdated.undo.false');
            if (!hasMoreUserRecords) {
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
