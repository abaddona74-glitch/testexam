import LoadingScreen from './loading-screen';

export default {
  title: 'Komponentlar/LoadingScreen',
  component: LoadingScreen,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    animationId: {
      control: 'select',
      options: ['gif', 'classic', 'ship'],
      description: 'Animatsiya turi',
    },
    mini: {
      control: 'boolean',
      description: 'Kichik preview (sozlamalar uchun)',
    },
  },
};

export const ShipAnimation = {
  name: '⛵ Kema animatsiyasi',
  args: {
    animationId: 'ship',
    mini: false,
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-900 to-gray-900 flex items-center justify-center">
        <div className="w-full max-w-lg h-96">
          <Story />
        </div>
      </div>
    ),
  ],
};

export const ClassicSpinner = {
  name: '🌀 Spinner',
  args: {
    animationId: 'classic',
    mini: false,
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 flex items-center justify-center">
        <div className="w-full max-w-lg h-64">
          <Story />
        </div>
      </div>
    ),
  ],
};

export const GifLoading = {
  name: '🎞️ Klassik GIF',
  args: {
    animationId: 'gif',
    mini: false,
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 flex items-center justify-center">
        <div className="w-full max-w-lg h-64">
          <Story />
        </div>
      </div>
    ),
  ],
};

export const MiniShipPreview = {
  name: '⛵ Kema - mini preview',
  args: {
    animationId: 'ship',
    mini: true,
  },
};

export const MiniSpinnerPreview = {
  name: '🌀 Spinner - mini preview',
  args: {
    animationId: 'classic',
    mini: true,
  },
};

export const MiniGifPreview = {
  name: '🎞️ GIF - mini preview',
  args: {
    animationId: 'gif',
    mini: true,
  },
};
