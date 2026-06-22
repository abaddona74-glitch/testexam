import { ThemeToggle } from './theme-toggle';

export default {
  title: 'Komponentlar/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onToggle: { action: 'theme toggled' },
  },
};

export const Default = {
  name: '🌓 Standart',
};

export const OnDarkBg = {
  name: '🌙 Qorong\'u fonda',
  decorators: [
    (Story) => (
      <div className="min-h-[100px] flex items-center justify-center bg-gray-900 p-8 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export const OnLightBg = {
  name: '☀️ Yorug\' fonda',
  decorators: [
    (Story) => (
      <div className="min-h-[100px] flex items-center justify-center bg-white p-8 rounded-2xl border">
        <Story />
      </div>
    ),
  ],
};
