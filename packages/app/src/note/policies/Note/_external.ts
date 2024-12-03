import {
  ApolloCache,
  DocumentNode,
  FieldFunctionOptions,
  Reference,
} from '@apollo/client';

import { CollabService } from '~collab/client/collab-service';
import { RevisionChangesetStruct } from '~collab/records/record';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import { CreateFieldPolicyFn, TypePoliciesContext } from '../../../graphql/types';
import { NoteExternalState } from '../../external-state/note';
import { readNoteRef } from '../../utils/read-note-ref';

const FIELD_NAME = '_external';

// TODO use query instead?
const _External_NoteFragment = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: '_External_NoteFragment' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Note' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [{ kind: 'Field', name: { kind: 'Name', value: FIELD_NAME } }],
      },
    },
  ],
} as DocumentNode;

/**
 * External field contains state that is managed outside cache but
 * still belongs to Note type.
 */
export const _external: CreateFieldPolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    read(existing, options) {
      const { cache, readField, isReference } = options;
      // External state is already an instance

      if (existing instanceof NoteExternalState) {
        return existing;
      }

      const noteRef = readNoteRef(options);

      // External state is serialized, must parse it first
      if (isObjectLike(existing)) {
        const inst = NoteExternalState.parseValue(existing);
        // Replace serialized with parsed class instance
        write(noteRef, inst, cache);

        return inst;
      }

      // Create new state by reading Note.collabText.headText
      const collabTextRef = readField('collabText', noteRef);
      if (!isReference(collabTextRef)) {
        throw new Error('Expected Note.collabText to be a reference');
      }

      const headText = readField('headText', collabTextRef);
      if (headText == null) {
        throw new Error('Expected CollabText.headText to be defined');
      }

      const inst = new NoteExternalState({
        service: CollabService.headTextAsOptions(
          RevisionChangesetStruct.create(headText)
        ),
      });
      write(noteRef, inst, cache);

      return inst;
    },
  };
};

export function readNoteExternalState(
  noteRef: Reference,
  { readField }: FieldFunctionOptions
): NoteExternalState {
  const inst = readField(FIELD_NAME, noteRef);
  if (!(inst instanceof NoteExternalState)) {
    throw new Error(
      `Failed to read note external state field. Expect and instance but is "${String(inst)}"`
    );
  }

  return inst;
}

function read(
  noteRef: Reference,
  cache: Pick<ApolloCache<unknown>, 'readFragment'>
): NoteExternalState | undefined {
  const note = cache.readFragment({
    fragment: _External_NoteFragment,
    id: noteRef.__ref,
  });
  if (!isObjectLike(note)) {
    return;
  }

  return note[FIELD_NAME] as NoteExternalState;
}

function write(
  noteRef: Reference,
  externalState: NoteExternalState,
  cache: Pick<ApolloCache<unknown>, 'writeFragment'>
) {
  cache.writeFragment({
    fragment: _External_NoteFragment,
    id: noteRef.__ref,
    data: {
      __typename: 'Note',
      [FIELD_NAME]: externalState,
    },
    overwrite: true,
    broadcast: false,
  });
}

export function setNoteExternalStateFromOtherNote(
  sourceNoteRef: Reference,
  targetNoteRef: Reference,
  cache: Pick<ApolloCache<unknown>, 'readFragment' | 'writeFragment'>
) {
  const externalState = read(sourceNoteRef, cache);
  if (!externalState) {
    return;
  }
  write(targetNoteRef, externalState, cache);
  return externalState.service;
}
