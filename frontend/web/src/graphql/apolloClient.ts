import { ApolloClient, InMemoryCache } from '@apollo/client';

import GET_SESSIONS from '../session/graphql/GET_SESSIONS';

import newLocalDirectiveDocumentTransform from './newLocalDirectiveDocumentTransform';
import resolvers from './resolvers';

const localDirectiveDocumentTransform = newLocalDirectiveDocumentTransform();

const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  documentTransform: localDirectiveDocumentTransform.documentTransform,
  resolvers,
});

// Update @local directive document transform by reading the session data
void (async () => {
  const {
    data: { sessions, activeSessionIndex },
  } = await apolloClient.query({
    query: GET_SESSIONS,
  });
  const session = sessions[activeSessionIndex];
  localDirectiveDocumentTransform.config.isLocalSession =
    session.__typename === 'LocalSession';
})();

export default apolloClient;
