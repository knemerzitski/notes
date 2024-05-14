import Avatar, { AvatarProps } from '@mui/material/Avatar';

/**
 * @see {@link https://mui.com/material-ui/react-avatar/}
 */
function stringToColor(string: string) {
  let hash = 0;
  let i;

  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }

  return color;
}

export interface BackgroundLetterAvatarProps {
  name: string;
  avatarProps?: AvatarProps;
}

export default function BackgroundLetterAvatar({
  name,
  avatarProps,
}: BackgroundLetterAvatarProps) {
  return (
    <Avatar
      {...avatarProps}
      sx={{
        bgcolor: stringToColor(name),
        ...avatarProps?.sx,
      }}
    >
      {name[0]}
    </Avatar>
  );
}
