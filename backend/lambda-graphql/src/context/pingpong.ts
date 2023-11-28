import { SFNClient, SFNClientConfig, StartExecutionCommand } from '@aws-sdk/client-sfn';

import { Logger } from '~common/logger';

export interface PingPongMachineInput {
  state: 'PING' | 'REVIEW' | 'ABORT';
  seconds: number;
  connectionId: string;
  domainName: string;
  stage: string;
}

export interface PingPongContextParams {
  stateMachineArn: string;
  delay: number;
  timeout: number;
  newClient: (config?: SFNClientConfig) => SFNClient;
  logger: Logger;
}

export interface PingPongContext {
  startPingPong(
    this: void,
    args: {
      connectionId: string;
      domainName: string;
      stage: string;
    }
  ): Promise<undefined>;
}

export function createPingPongContext(params: PingPongContextParams): PingPongContext {
  const client: SFNClient = params.newClient();

  return {
    startPingPong: async ({ connectionId, domainName, stage }) => {
      params.logger.info('startPingPong', {
        connectionId,
      });

      const input: PingPongMachineInput = {
        state: 'PING',
        connectionId,
        domainName,
        stage,
        seconds: params.delay,
      };

      await client.send(
        new StartExecutionCommand({
          stateMachineArn: params.stateMachineArn,
          input: JSON.stringify(input),
        })
      );
    },
  };
}
