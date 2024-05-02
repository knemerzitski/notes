import ToolbarBox, { ToolbarBoxProps } from '../../../components/toolbar/ToolbarBox';

import CollabInputs, { CollabInputsProps } from './CollabInputs';

interface CollabNoteEditorProps {
  toolbarProps: Omit<ToolbarBoxProps, 'renderMainElement'>;
  collabFieldsProps?: CollabInputsProps;
}

export default function CollabNoteEditor({
  toolbarProps,
  collabFieldsProps: collaborativeFieldsProps,
}: CollabNoteEditorProps) {
  return (
    <ToolbarBox
      {...toolbarProps}
      renderMainElement={(ref) => (
        <CollabInputs
          {...collaborativeFieldsProps}
          boxProps={{
            ...collaborativeFieldsProps?.boxProps,
            ref,
          }}
        />
      )}
    />
  );
}
