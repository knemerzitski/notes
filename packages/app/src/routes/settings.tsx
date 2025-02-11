import { createFileRoute } from '@tanstack/react-router';

import { SettingsMain } from '../device-preferences/components/SettingsMain';

export const Route = createFileRoute('/_root_layout/settings')({
  component: Settings,
});

function Settings() {
  return <SettingsMain />;
}
