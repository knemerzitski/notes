 
import { Changeset } from '~collab/changeset';

import { CollabService } from '~collab/client/collab-service';

import { NoteTextFieldName } from '../../__generated__/graphql';
import { NoteExternalState, NoteTextFieldEditor } from '../external-state/note';

import { useCollabHtmlInput } from './useCollabHtmlInput';

let noteState: NoteExternalState;
let editor: NoteTextFieldEditor;
let service: CollabService;

beforeEach(() => {
  noteState = new NoteExternalState();
  editor = noteState.fields[NoteTextFieldName.CONTENT].editor;
  service = noteState.service;

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
  it('caret after change', () => {
    insertText('s'); // ">"
    inputShouldHaveSelection(1);
    inputShouldHaveValue('s');

    // add 5, then

    cy.then(() => {
      submitLocalChanges(); // "s>"
      addExternalChange(Changeset.parseValue([[0, 11], 'e', [12, 25]])); // "es>"
      addExternalChange(Changeset.parseValue([[0, 11], 'e2', [12, 26]])); // "e2es>"
      inputShouldHaveSelection(4);
      inputShouldHaveValue('e2es');
      //se2e
    });
  });

  it('caret after change, while typing', () => {
    insertText('s'); // ">"
    inputShouldHaveSelection(1);
    inputShouldHaveValue('s');

    cy.then(() => {
      submitLocalChanges(); // "s>"

      addExternalChange(Changeset.parseValue([[0, 11], 'e', [12, 25]])); // "es>"
      addExternalChange(Changeset.parseValue([[0, 11], 'e2', [12, 26]])); // "e2es>"
      insertText('b'); // "e2esb>"
      inputShouldHaveValue('e2esb');
      inputShouldHaveSelection(5);
    });
  });

  it('caret before change', () => {
    insertText('s'); // ">"
    inputShouldHaveSelection(1);
    inputShouldHaveValue('s');

    cy.then(() => {
      submitLocalChanges(); // "s>"
      addExternalChange(Changeset.parseValue([[0, 12], 'e', [13, 25]])); // "s>e"
      addExternalChange(Changeset.parseValue([[0, 13], 'e2', [14, 26]])); // "s>ee2"
      inputShouldHaveSelection(1);
      inputShouldHaveValue('see2');
    });
  });

  it('caret before change, while typing', () => {
    insertText('s'); // ">"
    inputShouldHaveSelection(1);
    inputShouldHaveValue('s');

    cy.then(() => {
      submitLocalChanges(); // "s>"
      addExternalChange(Changeset.parseValue([[0, 12], 'e', [13, 25]])); // "s>e"
      addExternalChange(Changeset.parseValue([[0, 13], 'e2', [14, 26]])); // "s>ee2"
      insertText('b'); // "sb>ee2"
      inputShouldHaveSelection(2);
      inputShouldHaveValue('sbee2');
    });
  });
});
