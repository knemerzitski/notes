import styled from '@emotion/styled';
import { Typography } from '@mui/material';
import { ellipsisStyle } from '../../utils/styles/ellipsis';
import { boldStyle } from '../../utils/styles/bold';

export const DisplayName = styled(Typography)(ellipsisStyle, boldStyle);
