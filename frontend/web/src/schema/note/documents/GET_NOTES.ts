import transformDocument from '../../../utils/transformDocument';
import { gql } from '../../__generated__/gql';
import { sessionDocumentTransform } from '../../session/directives/session';

const GET_NOTES = gql(`
  query Notes {
    notes @session {
      id
      title
      content
    }
  }
`);

export default () => transformDocument(sessionDocumentTransform, GET_NOTES);
