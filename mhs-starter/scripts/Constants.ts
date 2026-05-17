export const LOGICAL_WIDTH = 540;
export const LOGICAL_HEIGHT = 960;

export const PLAY_TOP = 190;
export const PLAY_BOTTOM = 760;

export const MAX_HP = 100;
export const CONTINUE_COST = 200;
export const CONTINUE_HP_FRAC = 0.5;
export const CONTINUE_PROMPT_SECONDS = 5;

export const COLORS = {
  hotPink: "#ff4ff0",
  softPink: "#ffe8ff",
  cyan: "#a8fbff",
  gold: "#fce76d",
  green: "#5cff7b",
  purpleStroke: "#5e315f",
  deepPanel: "#120936",
  darkBackground: "#05041c",
} as const;

export const PLAYFIELD = {
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  top: PLAY_TOP,
  bottom: PLAY_BOTTOM,
} as const;
