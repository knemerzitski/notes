import transformDocument from '../../../utils/transformDocument';
import { gql } from '../../__generated__/gql';
import { sessionDocumentTransform } from '../../session/directives/session';

const GET_NOTES = gql(`
  query UserNotesConnection($first: NonNegativeInt!, $after: String) {
    userNotesConnection(first: $first, after: $after) @session {
      notes {
        note {
          id
          title
          textContent
        }
      }
    }
  }
`);

export default () => transformDocument(sessionDocumentTransform, GET_NOTES);
