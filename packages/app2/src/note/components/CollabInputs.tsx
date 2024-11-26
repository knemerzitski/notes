import { CollabTitleInput } from './CollabTitleInput';
import { CollabContentInput } from './CollabContentInput';
import { CollabEditing } from './CollabEditing';

//collabinputs on its own and then all

export function CollabInputs({
  CollabTitleInputProps,
  CollabContentInputProps,
}: {
  CollabTitleInputProps?: Parameters<typeof CollabTitleInput>[0];
  CollabContentInputProps?: Parameters<typeof CollabContentInput>[0];
}) {
  return (
    <>
      <CollabEditing />
      <CollabTitleInput {...CollabTitleInputProps} />
      <CollabContentInput {...CollabContentInputProps} />
    </>
  );
}
