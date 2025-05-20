import { MutableComputedState } from '../computed-state';
import { createDefaultProperties } from '../default-properties';
import { Context, Properties, State } from '../types';

export type PartialProperties = Omit<Partial<Properties>, 'state' | 'context'> & {
  readonly state?: PartialState;
  readonly context?: PartialContext;
};

export type PartialContext = Partial<Context>;

type PartialState = State | MutableComputedState;

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

function isPartialProperties(
  value: Properties | PartialProperties
): value is PartialProperties {
  return (
    !(value.state instanceof MutableComputedState) ||
    value.context == null ||
    value.isExternalTypingHistory == null ||
    typeof value.context.historySizeLimit === 'number'
  );
}
