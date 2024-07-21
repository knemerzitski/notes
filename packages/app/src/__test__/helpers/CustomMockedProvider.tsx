import { MockedResponse, MockLink } from '@apollo/client/testing';
import React from 'react';

import CustomApolloClientProvider from '../../modules/apollo-client/context/CustomApolloClientProvider';
import { CustomApolloClient } from '../../modules/apollo-client/custom-apollo-client';

import { createCustomApolloClient } from './apollo-client';

export interface CustomMockedProviderProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mocks?: readonly MockedResponse<any, any>[];
  addTypename?: boolean;
  showWarnings?: boolean;
  children: unknown;
  childProps?: object;
}

export interface CustomMockedProviderState {
  customClient: CustomApolloClient;
}

export class CustomMockedProvider extends React.Component<
  CustomMockedProviderProps,
  CustomMockedProviderState
> {
  constructor(props: CustomMockedProviderProps) {
    super(props);

    const { mocks, addTypename = true, showWarnings } = this.props;
    const customClient = createCustomApolloClient({
      link: new MockLink(mocks ?? [], addTypename, { showWarnings }),
    });

    this.state = {
      customClient,
    };
  }

  public override render() {
    const { children, childProps } = this.props;
    const { customClient } = this.state;

    return React.isValidElement(children) ? (
      <CustomApolloClientProvider client={customClient}>
        {React.cloneElement(React.Children.only(children), { ...childProps })}
      </CustomApolloClientProvider>
    ) : null;
  }

  public override componentWillUnmount() {
    this.state.customClient.client.stop();
  }
}
