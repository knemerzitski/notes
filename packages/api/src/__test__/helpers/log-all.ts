import util from 'util';

export const logAll: typeof console.log = (...args) => {
  console.log(util.inspect(args.length === 1 ? args[0] : args, false, null, true));
};
