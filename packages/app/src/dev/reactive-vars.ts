import { makeVar } from "@apollo/client";
import { Note } from "../__generated__/graphql";


export const devNoteIdVar = makeVar<Note['id'] | null>(null);
