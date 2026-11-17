const games = ['skyline', 'orbit', 'reef'];
const goals = {
  skyline: {
    goal: 'Reach 500 m',
    instructions: 'Leap over the rooftops and keep a heart in reserve.',
    targetMeters: 500,
  },
  orbit: {
    goal: 'Clear two waves',
    instructions: 'Take out both formations. A boss arrives on wave three.',
    targetWave: 3,
  },
  reef: {
    goal: 'Clear level one',
    instructions: 'Break every crystal in the first level and reach level two.',
    targetLevel: 2,
  },
};

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dailyArcadeChallenge(now = new Date()) {
  const date = typeof now === 'string' ? now : localDateKey(now);
  const [year, month, day] = date.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const gameId = games[((dayNumber % games.length) + games.length) % games.length];
  return { date, gameId, seed: `${date}:${gameId}`, ...goals[gameId] };
}

export function seededRandom(seedText) {
  let seed = 2_166_136_261;
  for (let i = 0; i < seedText.length; i++) {
    seed = Math.imul(seed ^ seedText.charCodeAt(i), 16_777_619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}
