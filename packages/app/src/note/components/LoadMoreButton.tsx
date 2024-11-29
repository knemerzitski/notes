import { Button, ButtonProps, CircularProgress, css, styled } from '@mui/material';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';

export function LoadMoreButton({
  isLoading,
  onLoad,
  ...restProps
}: {
  isLoading: boolean;
  onLoad: () => void;
} & Omit<ButtonProps, 'onClick'>) {
  return (
    <Button {...restProps} onClick={onLoad} disabled={isLoading}>
      <SpanStyled isLoading={isLoading}>Load More</SpanStyled>
      {isLoading && <CircularProgressStyled size="2em" />}
    </Button>
  );
}

const visibilityLoading = {
  style: ({ isLoading }: { isLoading: boolean }) => {
    if (isLoading) {
      return css`
        visibility: hidden;
      `;
    }

    return;
  },
  props: ['isLoading'],
};

const SpanStyled = styled('span', {
  shouldForwardProp: mergeShouldForwardProp(visibilityLoading.props),
})(visibilityLoading.style);

const CircularProgressStyled = styled(CircularProgress)(css`
  position: absolute;
`);
