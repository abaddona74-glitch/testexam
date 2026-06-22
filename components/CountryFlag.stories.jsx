import CountryFlag from './CountryFlag';

export default {
  title: 'Komponentlar/CountryFlag',
  component: CountryFlag,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    countryCode: {
      control: 'select',
      options: ['uz', 'us', 'gb', 'de', 'fr', 'jp', 'kr', 'ru', 'kz', 'cn', 'tr', 'ae'],
      description: 'ISO alpha-2 davlat kodi',
    },
  },
};

export const Uzbekistan = {
  name: '🇺🇿 O\'zbekiston',
  args: { countryCode: 'uz' },
};

export const USA = {
  name: '🇺🇸 AQSh',
  args: { countryCode: 'us' },
};

export const UK = {
  name: '🇬🇧 Buyuk Britaniya',
  args: { countryCode: 'gb' },
};

export const Germany = {
  name: '🇩🇪 Germaniya',
  args: { countryCode: 'de' },
};

export const Japan = {
  name: '🇯🇵 Yaponiya',
  args: { countryCode: 'jp' },
};

export const SouthKorea = {
  name: '🇰🇷 Koreya',
  args: { countryCode: 'kr' },
};

export const InvalidCode = {
  name: '❌ Noto\'g\'ri kod',
  args: { countryCode: 'xyz' },
};

export const EmptyCode = {
  name: '❌ Bo\'sh kod',
  args: { countryCode: '' },
};

export const AllFlags = {
  name: '🏁 Barcha bayroqlar',
  decorators: [
    (Story) => (
      <div className="flex gap-3 flex-wrap items-center p-4">
        <CountryFlag countryCode="uz" />
        <CountryFlag countryCode="us" />
        <CountryFlag countryCode="gb" />
        <CountryFlag countryCode="de" />
        <CountryFlag countryCode="fr" />
        <CountryFlag countryCode="jp" />
        <CountryFlag countryCode="kr" />
        <CountryFlag countryCode="ru" />
        <CountryFlag countryCode="kz" />
        <CountryFlag countryCode="cn" />
        <CountryFlag countryCode="tr" />
        <CountryFlag countryCode="ae" />
      </div>
    ),
  ],
};
