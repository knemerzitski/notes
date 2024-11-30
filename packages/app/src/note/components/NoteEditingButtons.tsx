import { RedoButton } from './RedoButton';
import { UndoButton } from './UndoButton';

export function NoteEditingButtons({
  UndoButtonProps,
  RedoButtonProps,
}: {
  UndoButtonProps?: Parameters<typeof UndoButton>[0];
  RedoButtonProps?: Parameters<typeof RedoButton>[0];
}) {
  return (
    <>
      <UndoButton {...UndoButtonProps} />
      <RedoButton {...RedoButtonProps} />
    </>
  );
}
