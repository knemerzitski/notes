import util from 'util';

const logAll: typeof console.log = (...args) => {
  console.log(util.inspect(args, false, null, true));
};

export default logAll;
