import { gql } from '../../__generated__';

import { CollabContentInput } from './CollabContentInput';
import { CollabService } from './CollabService';
import { CollabTitleInput } from './CollabTitleInput';

const _CollabInputs_NoteFragment = gql(`
  fragment CollabInputs_NoteFragment on Note {
    ...CollabTitleInput_NoteFragment
    ...CollabContentInput_NoteFragment
  }
`);

export function CollabInputs({
  CollabTitleInputProps,
  CollabContentInputProps,
}: {
  CollabTitleInputProps?: Parameters<typeof CollabTitleInput>[0];
  CollabContentInputProps?: Parameters<typeof CollabContentInput>[0];
}) {
  return (
    <>
      <CollabService visible={true} />
      <CollabTitleInput {...CollabTitleInputProps} />
      <CollabContentInput {...CollabContentInputProps} />
    </>
  );
}
