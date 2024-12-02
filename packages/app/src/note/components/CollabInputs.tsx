import { CollabTitleInput } from './CollabTitleInput';
import { CollabContentInput } from './CollabContentInput';
import { CollabService } from './CollabService';

export function CollabInputs({
  CollabTitleInputProps,
  CollabContentInputProps,
}: {
  CollabTitleInputProps?: Parameters<typeof CollabTitleInput>[0];
  CollabContentInputProps?: Parameters<typeof CollabContentInput>[0];
}) {
  return (
    <>
      <CollabService />
      <CollabTitleInput {...CollabTitleInputProps} />
      <CollabContentInput {...CollabContentInputProps} />
    </>
  );
}