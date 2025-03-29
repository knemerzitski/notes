import { Changeset } from '../../../../collab/src/changeset';
import { CollabService } from '../../../../collab/src/client/collab-service';

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
let editor: NoteTextFieldEditor<FieldName>;
let service: CollabService;

beforeEach(() => {
  const externalStateContext = createNoteExternalStateContext({
    keys: Object.values(FieldName),
  });

  noteState = externalStateContext.newValue();
  editor = noteState.fields[FieldName.CONTENT].editor;
  service = noteState.service;

  if (service.submittedRecord) {
    service.submittedChangesAcknowledged({
      changeset: service.client.submitted,
      revision: service.headRevision + 1,
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
  service.submitChanges();
  service.submittedChangesAcknowledged({
    changeset: service.client.submitted,
    revision: service.headRevision + 1,
  });
}

function addExternalChange(changeset: Changeset) {
  service.handleExternalChange({
    revision: service.headRevision + 1,
    changeset,
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
    addExternalChange(Changeset.parseValue([[0, 11], 'e', [12, 25]])); // "es>"

    inputShouldHaveSelection(2);
    inputShouldHaveValue('es');
  });

  it('externalBefore, insert', () => {
    addExternalChange(Changeset.parseValue([[0, 11], 'e', [12, 25]])); // "es>"
    insertText('b'); // "esb>"

    inputShouldHaveValue('esb');
    inputShouldHaveSelection(3);
  });

  it('externalBefore, externalBefore', () => {
    addExternalChange(Changeset.parseValue([[0, 11], 'e', [12, 25]])); // "es>"
    addExternalChange(Changeset.parseValue([[0, 11], 'e2', [12, 26]])); // "e2es>"

    inputShouldHaveSelection(4);
    inputShouldHaveValue('e2es');
  });

  it('externalBefore, externalBefore, insert', () => {
    addExternalChange(Changeset.parseValue([[0, 11], 'e', [12, 25]])); // "es>"
    addExternalChange(Changeset.parseValue([[0, 11], 'e2', [12, 26]])); // "e2es>"
    insertText('b'); // "e2esb>"

    inputShouldHaveValue('e2esb');
    inputShouldHaveSelection(5);
  });

  it('externalBefore, externalBefore, insert, insert', () => {
    addExternalChange(Changeset.parseValue([[0, 11], 'e', [12, 25]])); // "es>"
    addExternalChange(Changeset.parseValue([[0, 11], 'e2', [12, 26]])); // "e2es>"
    insertText('a'); // "e2esa>"
    insertText('b'); // "e2esab>"

    inputShouldHaveValue('e2esab');
    inputShouldHaveSelection(6);
  });

  it('externalAfter, insert', () => {
    addExternalChange(Changeset.parseValue([[0, 12], 'e', [13, 25]])); // "s>e"
    insertText('b'); // "sb>e"

    inputShouldHaveSelection(2);
    inputShouldHaveValue('sbe');
  });

  it('externalAfter, externalAfter', () => {
    addExternalChange(Changeset.parseValue([[0, 12], 'e', [13, 25]])); // "s>e"
    addExternalChange(Changeset.parseValue([[0, 13], 'e2', [14, 26]])); // "s>ee2"

    inputShouldHaveSelection(1);
    inputShouldHaveValue('see2');
  });

  it('externalAfter, externalAfter, insert', () => {
    addExternalChange(Changeset.parseValue([[0, 12], 'e', [13, 25]])); // "s>e"
    addExternalChange(Changeset.parseValue([[0, 13], 'e2', [14, 26]])); // "s>ee2"
    insertText('b'); // "sb>ee2"

    inputShouldHaveSelection(2);
    inputShouldHaveValue('sbee2');
  });

  it('externalAfter, externalAfter, insert, insert', () => {
    addExternalChange(Changeset.parseValue([[0, 12], 'e', [13, 25]])); // "s>e"
    addExternalChange(Changeset.parseValue([[0, 13], 'e2', [14, 26]])); // "s>ee2"
    insertText('a'); // "sa>ee2"
    insertText('b'); // "sab>ee2"

    inputShouldHaveSelection(3);
    inputShouldHaveValue('sabee2');
  });

  it('select', () => {
    setSelection(0);

    inputShouldHaveSelection(0);
  });

  it('externalBefore, select', () => {
    setSelection(0).then(() => {
      addExternalChange(Changeset.parseValue([[0, 11], 'e', [12, 25]])); // "e>s"
    });

    inputShouldHaveSelection(1);
  });

  it('externalBefore, externalBefore, select', () => {
    setSelection(0).then(() => {
      addExternalChange(Changeset.parseValue([[0, 11], 'e', [12, 25]])); // "e>s"
      addExternalChange(Changeset.parseValue([[0, 11], 'e2', [12, 26]])); // "e2e>s"
    });

    inputShouldHaveSelection(3);
  });

  it('externalAfter, select', () => {
    setSelection(0).then(() => {
      addExternalChange(Changeset.parseValue([[0, 12], 'e', [13, 25]])); // ">se"
    });

    inputShouldHaveSelection(0);
  });

  it('externalAfter, externalAfter, select', () => {
    setSelection(0).then(() => {
      addExternalChange(Changeset.parseValue([[0, 12], 'e', [13, 25]])); // ">se"
      addExternalChange(Changeset.parseValue([[0, 13], 'e2', [14, 26]])); // ">see2"
    });

    inputShouldHaveSelection(0);
  });
});
