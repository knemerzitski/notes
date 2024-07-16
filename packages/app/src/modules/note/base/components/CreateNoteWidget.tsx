import {
  ClickAwayListener,
  Paper,
  PaperProps,
  AppBar as MuiAppBar,
  Box,
  Button,
  Theme,
  SxProps,
} from '@mui/material';
import { ReactNode, useRef, useState } from 'react';

import MoreOptionsButton, { MoreOptionsButtonProps } from '../MoreOptionsButton';

import CollabContentInput, { CollabContentInputProps } from './CollabContentInput';
import CollabInputs from './CollabInputs';

export interface CreateNoteWidgetProps {
  /**
   * Widget is expanded with both title and content fields.
   * If not expanded then only content field is shown.
   */
  expanded: boolean;
  /**
   * Expand widget. {@link expanded} should be set to true
   */
  onExpand?: () => void;
  /**
   * Note should be created when this function is invoked.
   */
  onCreate?: () => void;
  /**
   * Collapse widget. Inverse of expand. {@link expanded} should be set to false
   * @param deleted Widget must collapse because 'Delete note' was clicked
   */
  onCollapse?: (deleted?: boolean) => void;
  paperProps?: PaperProps;
  initialContentInputProps?: CollabContentInputProps;
  moreOptionsButtonProps?: Omit<MoreOptionsButtonProps, 'onOpened' | 'onClosed'>;
  slots?: {
    toolbar?: ReactNode;
  };
}

export function ControlledCreateNoteWidget(
  props: Omit<CreateNoteWidgetProps, 'expanded'>
) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand: CreateNoteWidgetProps['onExpand'] = (...args) => {
    setIsExpanded(true);
    props.onExpand?.(...args);
  };

  const handleCollapse: CreateNoteWidgetProps['onCollapse'] = (...args) => {
    setIsExpanded(false);
    props.onCollapse?.(...args);
  };

  return (
    <CreateNoteWidget
      {...props}
      expanded={isExpanded}
      onExpand={handleExpand}
      onCollapse={handleCollapse}
    />
  );
}

export default function CreateNoteWidget({
  expanded,
  onCreate,
  onExpand,
  onCollapse,
  paperProps,
  slots,
  moreOptionsButtonProps,
  initialContentInputProps,
}: CreateNoteWidgetProps) {
  const isCreatedCalledRef = useRef(false);

  function createOnce() {
    if (!onCreate || isCreatedCalledRef.current) return;
    onCreate();
    isCreatedCalledRef.current = true;
  }

  function handleTextChange() {
    createOnce();
  }

  function handleExpandEditor() {
    onExpand?.();
  }

  function handleCloseWidget(deleted?: boolean) {
    onCollapse?.(deleted);
    isCreatedCalledRef.current = false;
  }

  function handleDeleteNote() {
    handleCloseWidget(true);
    moreOptionsButtonProps?.onDelete?.();
  }

  const baseSx: SxProps<Theme> = {
    borderRadius: 2,
    boxShadow: 3,
    width: 'min(100%, 600px)',
  };

  return (
    <>
      <Paper
        variant="outlined"
        {...paperProps}
        sx={{
          px: 2,
          py: 2,
          display: expanded ? 'none' : undefined,
          ...baseSx,
          ...paperProps?.sx,
        }}
      >
        <CollabContentInput
          {...initialContentInputProps}
          inputProps={{
            placeholder: 'Take a note...',
            onChange: handleTextChange,
            onFocus: handleExpandEditor,
            ...initialContentInputProps?.inputProps,
          }}
        />
      </Paper>

      {expanded && (
        <ClickAwayListener
          onClickAway={() => {
            handleCloseWidget();
          }}
          touchEvent="onTouchStart"
          mouseEvent="onMouseDown"
        >
          <Paper
            variant="outlined"
            {...paperProps}
            sx={{
              zIndex: 1,
              display: undefined,
              ...baseSx,
              ...paperProps?.sx,
            }}
          >
            <CollabInputs
              titleProps={{
                inputProps: {
                  onChange: handleTextChange,
                },
              }}
              contentProps={{
                inputProps: {
                  onChange: handleTextChange,
                  autoFocus: true,
                },
              }}
            />

            <MuiAppBar
              elevation={0}
              position="relative"
              color="default"
              sx={{
                borderBottomLeftRadius: (theme) => theme.spacing(1),
                borderBottomRightRadius: (theme) => theme.spacing(1),
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    gap: 1,
                    display: 'flex',
                  }}
                >
                  <MoreOptionsButton
                    {...moreOptionsButtonProps}
                    onDelete={handleDeleteNote}
                  />

                  {slots?.toolbar}
                </Box>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    handleCloseWidget();
                  }}
                  sx={{
                    mr: 1,
                  }}
                >
                  Close
                </Button>
              </Box>
            </MuiAppBar>
          </Paper>
        </ClickAwayListener>
      )}
    </>
  );
}
