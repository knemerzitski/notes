import { gql } from '../../__generated__';
import { FullWidthCenterMain } from '../../layout/components/FullWidthCenterMain';
import { FullWidthCenterRow } from '../../layout/components/FullWidthCenterRow';
import { EmptyInfoTopMargin } from './EmptyInfoTopMargin';
import { TrashNotesConnectionGrid } from './TrashNotesConnectionGrid';

const _TrashMain_QueryFragment = gql(`
  fragment TrashMain_QueryFragment on Query {
    ...TrashNotesConnectionGrid_QueryFragment
  }
`);

export function TrashMain() {
  return (
    <FullWidthCenterMain>
      <FullWidthCenterRow>
        <TrashNotesConnectionGrid
          slots={{
            emptyElementPrefix: <EmptyInfoTopMargin />,
          }}
        />
      </FullWidthCenterRow>
    </FullWidthCenterMain>
  );
}
