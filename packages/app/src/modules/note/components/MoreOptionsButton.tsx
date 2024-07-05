import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ListItemIcon, ListItemText } from '@mui/material';

import { PartialBy } from '~utils/types';

import ResponsiveMenuButton, {
  ResponsiveMenuButtonProps,
} from '../../common/components/ResponsiveMenuButton';

export interface MoreOptionsButtonProps
  extends Omit<ResponsiveMenuButtonProps, 'tooltipProps' | 'itemsProps'> {
  onDelete?: () => void;
  tooltipProps?: PartialBy<ResponsiveMenuButtonProps['tooltipProps'], 'title'>;
  itemsProps?: ResponsiveMenuButtonProps['itemsProps'];
}

export default function MoreOptionsButton({
  onDelete,
  ...restProps
}: MoreOptionsButtonProps) {
  return (
    <ResponsiveMenuButton
      {...restProps}
      iconButtonProps={{
        ...restProps.iconButtonProps,
        children: <MoreVertIcon />,
      }}
      tooltipProps={{
        title: 'More',
        ...restProps.tooltipProps,
      }}
      itemsProps={[
        ...(restProps.itemsProps ?? []),
        {
          onClick: () => {
            onDelete?.();
          },
          children: (
            <>
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete note</ListItemText>
            </>
          ),
        },
      ]}
    />
  );
}
