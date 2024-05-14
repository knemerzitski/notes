import { Button } from '@mui/material';

import Toolbar, { ToolbarProps } from './Toolbar';
import ScrollEndShadowBox, {
  ScrollEndShadowBoxProps,
} from '../../common/components/ScrollEndShadowBox';

export interface ToolbarBoxProps
  extends Pick<ScrollEndShadowBoxProps, 'renderMainElement'> {
  toolbarProps?: ToolbarProps;
  onClose?: () => void;
}

export default function ToolbarBox({
  toolbarProps,
  onClose,
  renderMainElement,
}: ToolbarBoxProps) {
  return (
    <ScrollEndShadowBox
      renderMainElement={renderMainElement}
      bottomContainerProps={{
        sx: {
          display: 'flex',
          flexDirection: 'row',
          pr: 2,
        },
      }}
      bottomElement={
        <>
          <Toolbar
            {...toolbarProps}
            boxProps={{
              sx: {
                flexGrow: 1,
                p: 1,
                display: 'flex',
                gap: 1
              },
            }}
          />
          <Button size="small" onClick={onClose}>
            Close
          </Button>
        </>
      }
    />
  );
}
