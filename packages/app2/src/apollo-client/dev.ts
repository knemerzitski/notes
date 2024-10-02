import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev';

if (import.meta.env.MODE !== 'production') {
  loadDevMessages();
  loadErrorMessages();
}
