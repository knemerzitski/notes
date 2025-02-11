import { Box, css, styled } from '@mui/material';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_root_layout/about')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Column>
      <Row>
        <KeyValuePair>
          <Key>Build</Key>
          <Value>
            {`${import.meta.env.VITE_BUILD_HASH}.${import.meta.env.VITE_BUILD_MODE}`}
          </Value>
        </KeyValuePair>
      </Row>
    </Column>
  );
}

const Column = styled(Box)(css`
  display: flex;
  flex-flow: column nowrap;
`);

const Row = styled(Box)(css`
  display: flex;
  flex-flow: row nowrap;
`);

const KeyValuePair = styled('div')(
  ({ theme }) => css`
    display: flex;
    gap: ${theme.spacing(1)};
    flex-flow: row nowrap;
  `
);

const Key = styled('span')(css`
  display: flex;
  flex-flow: column nowrap;
`);

const Value = styled('span')(
  ({ theme }) => css`
    display: flex;
    flex-flow: column nowrap;

    font-weight: ${theme.typography.fontWeightBold};
  `
);
