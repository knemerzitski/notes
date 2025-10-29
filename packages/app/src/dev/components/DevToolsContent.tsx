import { Box, Tab, Tabs } from '@mui/material';

import { useLocalStorage } from '../../utils/hooks/useLocalStorage';

import { ActiveNoteDashCards } from './ActiveNoteDashCards';
import { DevActiveNoteIdProvider } from './DevActiveNoteIdProvider';
import { GlobalDashCards } from './GlobalDashCards';

function TabPanel(props: {
  children?: React.ReactNode;
  index: number;
  parentIndex: number;
}) {
  const { children, parentIndex: parentIndex, index } = props;

  if (parentIndex !== index) {
    return null;
  }

  return (
    <Box
      sx={{
        p: 1,
        display: 'flex',
        flexFlow: 'row wrap',
        gap: 1,
        pb: 7,
      }}
    >
      {children}
    </Box>
  );
}

export function DevToolsContent() {
  const [devToolsTabIndex, setDevToolsTabIndex] = useLocalStorage<number>(
    'devToolsTabIndex',
    0
  );

  const index = devToolsTabIndex ?? 0;

  const handleChange = (_event: React.SyntheticEvent, newIndex: number) => {
    setDevToolsTabIndex(newIndex);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', overflowY: 'hidden' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={index} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Global" />
          <Tab label="Active Note" />
        </Tabs>
      </Box>
      <Box
        sx={{
          height: '100%',
          overflowY: 'auto',
        }}
      >
        <TabPanel parentIndex={index} index={0}>
          <GlobalDashCards />
        </TabPanel>
        <TabPanel parentIndex={index} index={1}>
          <DevActiveNoteIdProvider>
            <ActiveNoteDashCards />
          </DevActiveNoteIdProvider>
        </TabPanel>
      </Box>
    </Box>
  );
}
