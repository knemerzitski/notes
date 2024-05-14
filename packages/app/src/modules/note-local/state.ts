import { makeVar } from '@apollo/client';

import { LocalNote } from '../../__generated__/graphql';

import { readNotes } from './persistence';

export const notesVar = makeVar<LocalNote[]>(readNotes());
