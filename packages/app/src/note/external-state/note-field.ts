import { makeVar } from '@apollo/client';

import { NoteTextFieldEditor } from './note';

interface NoteFieldExternalStateParams {
  editor: NoteTextFieldEditor;
}

export class NoteFieldExternalState {
  readonly editor;

  private readonly eventsOff;

  readonly valueVar;

  constructor({ editor }: NoteFieldExternalStateParams) {
    this.editor = editor;

    this.valueVar = makeVar<string>(this.editor.value);

    this.eventsOff = [
      this.editor.eventBus.on('valueChanged', (newValue) => {
        this.valueVar(newValue);
      }),
    ];
  }

  cleanUp() {
    this.eventsOff.forEach((off) => {
      off();
    });
  }
}
