import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev';
// import { maybeExcludeFreeze } from '@apollo/client/utilities';

if (import.meta.env.MODE !== 'production') {
  loadDevMessages();
  loadErrorMessages();

  // TODO freeze external api ...prototype
  //maybeExcludeFreeze(...)
}

