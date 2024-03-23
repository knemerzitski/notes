import ToolbarBox, { ToolbarBoxProps } from '../../components/toolbar/ToolbarBox';

import CollabFields, { CollabFieldsProps } from './CollabFields';

interface CollabEditorProps {
  toolbarProps: Omit<ToolbarBoxProps, 'renderMainElement'>;
  collabFieldsProps?: CollabFieldsProps;
}

export default function CollabEditor({
  toolbarProps,
  collabFieldsProps: collaborativeFieldsProps,
}: CollabEditorProps) {
  return (
    <ToolbarBox
      {...toolbarProps}
      renderMainElement={(ref) => (
        <CollabFields
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
