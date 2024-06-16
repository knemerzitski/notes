import { Changeset } from '~collab/changeset/changeset';
import { CollabEditor } from '~collab/client/collab-editor';

import useHTMLInputCollabEditor from './useHTMLInputCollabEditor';
let editor: CollabEditor;

beforeEach(() => {
  editor = new CollabEditor();

  cy.mount(<InputEditing />);
});

// eslint-disable-next-line react-refresh/only-export-components
function InputEditing() {
  const {
    inputRef: ref,
    value,
    onInput,
    onKeyDown,
    onSelect,
  } = useHTMLInputCollabEditor(editor);

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
  editor.submitChanges();
  editor.submittedChangesAcknowledged({
    changeset: editor.client.submitted,
    revision: editor.headRevision + 1,
  });
}

function addExternalChange(changeset: Changeset) {
  editor.handleExternalChange({
    revision: editor.headRevision + 1,
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

describe('selection adjustment with external change', () => {
  it('caret after change', () => {
    insertText('s'); // ">"
    inputShouldHaveSelection(1);

    cy.then(() => {
      submitLocalChanges(); // "s>"
      addExternalChange(Changeset.parseValue(['e', 0])); // "es>"
      addExternalChange(Changeset.parseValue(['e2', [0, 1]])); // "e2es>"
      inputShouldHaveSelection(4);
    });
  });

  it('caret after change, while typing', () => {
    insertText('s'); // ">"
    inputShouldHaveSelection(1);

    cy.then(() => {
      submitLocalChanges(); // "s>"
      addExternalChange(Changeset.parseValue(['e', 0])); // "es>"
      addExternalChange(Changeset.parseValue(['e2', [0, 1]])); // "e2es>"
      insertText('b'); // "e2esb>"
      inputShouldHaveSelection(5);
    });
  });

  it('caret before change', () => {
    insertText('s'); // ">"
    inputShouldHaveSelection(1);

    cy.then(() => {
      submitLocalChanges(); // "s>"
      addExternalChange(Changeset.parseValue([0, 'e'])); // "s>e"
      addExternalChange(Changeset.parseValue([[0, 1], 'e2'])); // "s>ee2"
      inputShouldHaveSelection(1);
    });
  });

  it('caret before change, while typing', () => {
    insertText('s'); // ">"
    inputShouldHaveSelection(1);

    cy.then(() => {
      submitLocalChanges(); // "s>"
      addExternalChange(Changeset.parseValue([0, 'e'])); // "s>e"
      addExternalChange(Changeset.parseValue([[0, 1], 'e2'])); // "s>ee2"
      insertText('b'); // "sb>ee2"
      inputShouldHaveSelection(2);
    });
  });
});
