import { LiquidGlassClock } from './liquid-clock';

export default {
  title: 'Komponentlar/LiquidGlassClock',
  component: LiquidGlassClock,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  name: '🕐 Standart',
  decorators: [
    (Story) => (
      <div className="min-h-[200px] flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 p-8 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export const DarkBackground = {
  name: '🌙 Qorong\'u fonda',
  decorators: [
    (Story) => (
      <div className="min-h-[200px] flex items-center justify-center bg-gray-900 p-8 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export const LightBackground = {
  name: '☀️ Yorug\' fonda',
  decorators: [
    (Story) => (
      <div className="min-h-[200px] flex items-center justify-center bg-white p-8 rounded-2xl border">
        <Story />
      </div>
    ),
  ],
};
