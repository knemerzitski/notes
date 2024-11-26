import { NoteMoreOptionsButton } from './NoteMoreOptionsButton';
import { RedoButton } from './RedoButton';
import { UndoButton } from './UndoButton';

export function NoteToolbarButtons({
  UndoButtonProps,
  RedoButtonProps,
}: {
  UndoButtonProps?: Parameters<typeof UndoButton>[0];
  RedoButtonProps?: Parameters<typeof RedoButton>[0];
}) {
  // TODO manage sharing button
  // TODO archive/unarchive button

  return (
    <>
      <UndoButton {...UndoButtonProps} />
      <RedoButton {...RedoButtonProps} />
      <NoteMoreOptionsButton />
    </>
  );
}
