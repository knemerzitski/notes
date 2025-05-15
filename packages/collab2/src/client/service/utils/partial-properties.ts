import { MutableComputedState } from '../computed-state';
import { createDefaultProperties } from '../default-properties';
import { Context, Properties, ServerFacade, State } from '../types';
import { ServerFacades } from './server-facades';

export type PartialProperties = Omit<
  Partial<Properties>,
  'state' | 'context' | 'serverFacades'
> & {
  readonly state?: PartialState;
  readonly context?: PartialContext;
  readonly serverFacades?: PartialFacades;
};

export type PartialContext = Partial<Context>;

type PartialState = State | MutableComputedState;
type PartialFacades = ServerFacades | Set<ServerFacade>;

export function transformPartialProperties(
  props?: Properties | PartialProperties
): Properties {
  if (!props) {
    return createDefaultProperties();
  }

  if (!isPartialProperties(props)) {
    return props;
  }

  const defaultProps = createDefaultProperties();

  return {
    ...defaultProps,
    ...props,
    state: transformState(props.state) ?? defaultProps.state,
    serverFacades: transformFacades(props.serverFacades) ?? defaultProps.serverFacades,
    context: {
      ...defaultProps.context,
      ...props.context,
    },
  };
}

function transformState(
  value: PartialState | undefined
): MutableComputedState | undefined {
  if (!value) {
    return;
  }

  return value instanceof MutableComputedState ? value : new MutableComputedState(value);
}

function transformFacades(value: PartialFacades | undefined): ServerFacades | undefined {
  if (!value) {
    return;
  }

  return value instanceof ServerFacades ? value : new ServerFacades(value);
}

function isPartialProperties(
  value: Properties | PartialProperties
): value is PartialProperties {
  return (
    !(value.state instanceof MutableComputedState) ||
    value.serverFacades == null ||
    value.context == null ||
    typeof value.context.historySizeLimit === 'number'
  );
}
