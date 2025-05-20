import { CollabService, Changeset, Selection } from '../../../../collab2/src';

import {
  createNoteExternalStateContext,
  NoteExternalState,
  NoteTextFieldEditor,
} from '../utils/external-state';

import { useCollabHtmlInput } from './useCollabHtmlInput';

enum FieldName {
  CONTENT = 'content',
  TITLE = 'title',
}

let noteState: NoteExternalState<FieldName>;
let editor: NoteTextFieldEditor;
let service: CollabService;

beforeEach(() => {
  const externalStateContext = createNoteExternalStateContext({
    keys: Object.values(FieldName),
  });

  noteState = externalStateContext.newValue(undefined, {
    userId: '2',
  });
  editor = noteState.fields[FieldName.CONTENT].editor;
  service = noteState.service;

  const submittedRecord = service.submitChanges();
  if (submittedRecord) {
    service.submittedChangesAcknowledged({
      ...submittedRecord,
      revision: service.serverRevision + 1,
    });
  }

  cy.mount(<InputEditing />);
});

function InputEditing() {
  const {
    inputRef: ref,
    value,
    onInput,
    onKeyDown,
    onSelect,
  } = useCollabHtmlInput(editor, service);

  return (
    <input
      ref={ref}
      value={value}
      onInput={onInput}
      onKeyDown={onKeyDown}
      onSelect={onSelect}
    />
  );
}

function submitLocalChanges() {
  const submittedRecord = service.submitChanges();
  if (submittedRecord) {
    service.submittedChangesAcknowledged({
      ...submittedRecord,
      revision: service.serverRevision + 1,
    });
  }
}

function addExternalChange(changeset: Changeset) {
  service.addExternalTyping({
    revision: service.serverRevision + 1,
    changeset,
    authorId: '',
    selectionInverse: Selection.ZERO,
    selection: Selection.ZERO,
  });
}

function insertText(value: string) {
  cy.get('input').type(value, {
    delay: 0,
    force: true,
  });
}

function setSelection(selection: number) {
  return cy.get('input').then((input) => {
    const el = input.get(0);
    el.setSelectionRange(selection, selection);
  });
}

// function deleteTextCount(count: number) {
//   cy.get('input').type('{backspace}'.repeat(count));
// }

function inputShouldHaveSelection(start: number, end = start) {
  cy.get('input')
    .should('have.prop', 'selectionStart', start)
    .and('have.prop', 'selectionEnd', end);
}

function inputShouldHaveValue(value: string) {
  cy.get('input').should('have.value', value);
}

describe('selection adjustment with external change', () => {
  beforeEach(() => {
    insertText('s'); // ">"
    inputShouldHaveSelection(1);
    inputShouldHaveValue('s');

    cy.then(() => {
      submitLocalChanges(); // "s>"
    });
  });

  it('insert', () => {
    insertText('b'); // "sb>"

    inputShouldHaveSelection(2);
    inputShouldHaveValue('sb');
  });

  it('externalBefore', () => {
    addExternalChange(Changeset.parse('26:0-11,"e",12-25')); // "es>"

    inputShouldHaveSelection(2);
    inputShouldHaveValue('es');
  });

  it('externalBefore, insert', () => {
    addExternalChange(Changeset.parse('26:0-11,"e",12-25')); // "es>"
    insertText('b'); // "esb>"

    inputShouldHaveValue('esb');
    inputShouldHaveSelection(3);
  });

  it('externalBefore, externalBefore', () => {
    addExternalChange(Changeset.parse('26:0-11,"e",12-25')); // "es>"
    addExternalChange(Changeset.parse('27:0-11,"e2",12-26')); // "e2es>"

    inputShouldHaveSelection(4);
    inputShouldHaveValue('e2es');
  });

  it('externalBefore, externalBefore, insert', () => {
    addExternalChange(Changeset.parse('26:0-11,"e",12-25')); // "es>"
    addExternalChange(Changeset.parse('27:0-11,"e2",12-26')); // "e2es>"
    insertText('b'); // "e2esb>"

    inputShouldHaveValue('e2esb');
    inputShouldHaveSelection(5);
  });

  it('externalBefore, externalBefore, insert, insert', () => {
    addExternalChange(Changeset.parse('26:0-11,"e",12-25')); // "es>"
    addExternalChange(Changeset.parse('27:0-11,"e2",12-26')); // "e2es>"
    insertText('a'); // "e2esa>"
    insertText('b'); // "e2esab>"

    inputShouldHaveValue('e2esab');
    inputShouldHaveSelection(6);
  });

  it('externalAfter, insert', () => {
    addExternalChange(Changeset.parse('26:0-12,"e",13-25')); // "s>e"
    insertText('b'); // "sb>e"

    inputShouldHaveSelection(2);
    inputShouldHaveValue('sbe');
  });

  it('externalAfter, externalAfter', () => {
    addExternalChange(Changeset.parse('26:0-12,"e",13-25')); // "s>e"
    addExternalChange(Changeset.parse('27:0-13,"e2",14-26')); // "s>ee2"

    inputShouldHaveSelection(1);
    inputShouldHaveValue('see2');
  });

  it('externalAfter, externalAfter, insert', () => {
    addExternalChange(Changeset.parse('26:0-12,"e",13-25')); // "s>e"
    addExternalChange(Changeset.parse('27:0-13,"e2",14-26')); // "s>ee2"
    insertText('b'); // "sb>ee2"

    inputShouldHaveSelection(2);
    inputShouldHaveValue('sbee2');
  });

  it('externalAfter, externalAfter, insert, insert', () => {
    addExternalChange(Changeset.parse('26:0-12,"e",13-25')); // "s>e"
    addExternalChange(Changeset.parse('27:0-13,"e2",14-26')); // "s>ee2"
    insertText('a'); // "sa>ee2"
    insertText('b'); // "sab>ee2"

    inputShouldHaveSelection(3);
    inputShouldHaveValue('sabee2');
  });

  it('select', () => {
    setSelection(0);

    inputShouldHaveSelection(0);
  });

  // TODO fix
  it.skip('externalBefore, select', () => {
    setSelection(0).then(() => {
      addExternalChange(Changeset.parse('26:0-11,"e",12-25')); // "e>s"
    });

    inputShouldHaveSelection(1);
  });

  // TODO fix
  it.skip('externalBefore, externalBefore, select', () => {
    setSelection(0).then(() => {
      addExternalChange(Changeset.parse('26:0-11,"e",12-25')); // "e>s"
      addExternalChange(Changeset.parse('27:0-11,"e2",12-26')); // "e2e>s"
    });

    inputShouldHaveSelection(3);
  });

  it('externalAfter, select', () => {
    setSelection(0).then(() => {
      addExternalChange(Changeset.parse('26:0-12,"e",13-25')); // ">se"
    });

    inputShouldHaveSelection(0);
  });

  it('externalAfter, externalAfter, select', () => {
    setSelection(0).then(() => {
      addExternalChange(Changeset.parse('26:0-12,"e",13-25')); // ">se"
      addExternalChange(Changeset.parse('27:0-13,"ee",14-26')); // ">see2"
    });

    inputShouldHaveSelection(0);
  });
});
