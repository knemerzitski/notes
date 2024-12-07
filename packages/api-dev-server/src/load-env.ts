import { loadEnvironmentVariables } from '~utils/env';
import { createLogger } from '~utils/logging';
import { logNodeInfo } from '~utils/node';

const logger = createLogger('load-env');

logNodeInfo(logger);

loadEnvironmentVariables(logger);
