export type AmbienceId =
  | "rainy-night"
  | "cozy-cafe"
  | "midnight-library"
  | "enchanted-forest"
  | "stargazing"
  | "golden-hour";

export interface AmbienceConfig {
  id: AmbienceId;
  name: string;
  tagline: string;
  theme: {
    bgGradient: string;
    surface: string;
    border: string;
    accent: string;
    accentGlow: string;
    textPrimary: string;
    textSecondary: string;
    ringTrack: string;
  };
  visualEffect: "rain" | "cafe_steam" | "dust" | "fireflies" | "stars" | "golden_light";
  defaultSounds: {
    rain: number;
    wind: number;
    fire: number;
    cafe: number;
    lofi: number;
  };
}

export const AMBIENCES: Record<AmbienceId, AmbienceConfig> = {
  "rainy-night": {
    id: "rainy-night",
    name: "Rainy Night",
    tagline: "Gentle rain tapping against dark window panes",
    theme: {
      bgGradient: "linear-gradient(145deg, #0e131b 0%, #171d28 50%, #0d1118 100%)",
      surface: "rgba(22, 28, 40, 0.72)",
      border: "rgba(70, 90, 120, 0.25)",
      accent: "#82aaff",
      accentGlow: "rgba(130, 170, 255, 0.2)",
      textPrimary: "#f0f4fc",
      textSecondary: "#8b9bb4",
      ringTrack: "rgba(130, 170, 255, 0.12)",
    },
    visualEffect: "rain",
    defaultSounds: {
      rain: 0.65,
      wind: 0.15,
      fire: 0,
      cafe: 0,
      lofi: 0.4,
    },
  },
  "cozy-cafe": {
    id: "cozy-cafe",
    name: "Cozy Café",
    tagline: "Warm roasted aromas, soft chatter, and mellow chords",
    theme: {
      bgGradient: "linear-gradient(145deg, #1f1814 0%, #29201a 50%, #1a1411 100%)",
      surface: "rgba(42, 33, 27, 0.75)",
      border: "rgba(160, 120, 90, 0.22)",
      accent: "#e0a36a",
      accentGlow: "rgba(224, 163, 106, 0.22)",
      textPrimary: "#fdf8f4",
      textSecondary: "#b89f8c",
      ringTrack: "rgba(224, 163, 106, 0.14)",
    },
    visualEffect: "cafe_steam",
    defaultSounds: {
      rain: 0,
      wind: 0,
      fire: 0.1,
      cafe: 0.55,
      lofi: 0.45,
    },
  },
  "midnight-library": {
    id: "midnight-library",
    name: "Midnight Library",
    tagline: "Deep mahogany shelves, antique books, and quiet focus",
    theme: {
      bgGradient: "linear-gradient(145deg, #14161c 0%, #1d1b24 50%, #101217 100%)",
      surface: "rgba(28, 26, 36, 0.75)",
      border: "rgba(130, 115, 160, 0.22)",
      accent: "#bca6e8",
      accentGlow: "rgba(188, 166, 232, 0.2)",
      textPrimary: "#f6f3fc",
      textSecondary: "#9d93b3",
      ringTrack: "rgba(188, 166, 232, 0.12)",
    },
    visualEffect: "dust",
    defaultSounds: {
      rain: 0.1,
      wind: 0.1,
      fire: 0.25,
      cafe: 0,
      lofi: 0.35,
    },
  },
  "enchanted-forest": {
    id: "enchanted-forest",
    name: "Enchanted Forest",
    tagline: "Whispering pines, bioluminescent moss, and wandering fireflies",
    theme: {
      bgGradient: "linear-gradient(145deg, #0b1712 0%, #13241c 50%, #0a1410 100%)",
      surface: "rgba(18, 35, 27, 0.75)",
      border: "rgba(75, 140, 105, 0.22)",
      accent: "#76c893",
      accentGlow: "rgba(118, 200, 147, 0.25)",
      textPrimary: "#f0fdf4",
      textSecondary: "#8dae9a",
      ringTrack: "rgba(118, 200, 147, 0.12)",
    },
    visualEffect: "fireflies",
    defaultSounds: {
      rain: 0,
      wind: 0.45,
      fire: 0,
      cafe: 0,
      lofi: 0.3,
    },
  },
  "stargazing": {
    id: "stargazing",
    name: "Stargazing",
    tagline: "Silent midnight observatory under a sea of distant stars",
    theme: {
      bgGradient: "linear-gradient(145deg, #090a14 0%, #12152b 50%, #06070e 100%)",
      surface: "rgba(18, 21, 42, 0.75)",
      border: "rgba(100, 120, 200, 0.22)",
      accent: "#99b2ff",
      accentGlow: "rgba(153, 178, 255, 0.25)",
      textPrimary: "#f4f6ff",
      textSecondary: "#8b94bd",
      ringTrack: "rgba(153, 178, 255, 0.12)",
    },
    visualEffect: "stars",
    defaultSounds: {
      rain: 0,
      wind: 0.25,
      fire: 0,
      cafe: 0,
      lofi: 0.4,
    },
  },
  "golden-hour": {
    id: "golden-hour",
    name: "Golden Hour",
    tagline: "Soft late afternoon sunlight spilling across your desk",
    theme: {
      bgGradient: "linear-gradient(145deg, #241c14 0%, #302318 50%, #1c150f 100%)",
      surface: "rgba(48, 36, 26, 0.75)",
      border: "rgba(200, 145, 90, 0.22)",
      accent: "#f4b266",
      accentGlow: "rgba(244, 178, 102, 0.24)",
      textPrimary: "#fffcf7",
      textSecondary: "#c2a893",
      ringTrack: "rgba(244, 178, 102, 0.14)",
    },
    visualEffect: "golden_light",
    defaultSounds: {
      rain: 0,
      wind: 0.15,
      fire: 0,
      cafe: 0.15,
      lofi: 0.45,
    },
  },
};
