import ToolbarBox, { ToolbarBoxProps } from '../toolbar/ToolbarBox';

import CollabInputs, { CollabInputsProps } from './CollabInputs';

export interface CollabNoteEditorProps {
  toolbarBoxProps: Omit<ToolbarBoxProps, 'renderMainElement'>;
  collabFieldsProps?: CollabInputsProps;
}

export default function CollabNoteEditor({
  toolbarBoxProps,
  collabFieldsProps,
}: CollabNoteEditorProps) {
  return (
    <ToolbarBox
      {...toolbarBoxProps}
      renderMainElement={(ref) => (
        <CollabInputs
          {...collabFieldsProps}
          boxProps={{
            ...collabFieldsProps?.boxProps,
            ref,
          }}
        />
      )}
    />
  );
}
