import { loadEnvironmentVariables } from '../../../utils/src/env';
import { createLogger } from '../../../utils/src/logging';
import { logNodeInfo } from '../../../utils/src/node';

const logger = createLogger('load-env');

logNodeInfo(logger);

loadEnvironmentVariables(logger);
