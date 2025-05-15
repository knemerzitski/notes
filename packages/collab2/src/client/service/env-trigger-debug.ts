// import { setAutoFreeze } from 'immer';
import { setStateDebugging } from './utils/debug';

const DEBUG = process.env.NODE_ENV !== 'production';

if (DEBUG) {
  // setAutoFreeze(true);
  setStateDebugging(true);
} else {
  // setAutoFreeze(false);
}
