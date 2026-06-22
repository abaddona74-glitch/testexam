import { InstallPrompt } from './install-prompt';
import { useEffect, useState } from 'react';

// Storybook'da beforeinstallprompt eventi ishlamaydi, shuning uchun
// komponentni ko'rinadigan qilish uchun mock qilamiz.
function MockInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Simulate the beforeinstallprompt event after mount
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">⏳ Prompt ko'rinishi kutilmoqda...</div>
      </div>
    );
  }

  return <InstallPrompt />;
}

export default {
  title: 'Komponentlar/InstallPrompt',
  component: InstallPrompt,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  name: '📲 Standart',
  render: () => <MockInstallPrompt />,
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 relative">
        <Story />
      </div>
    ),
  ],
};
