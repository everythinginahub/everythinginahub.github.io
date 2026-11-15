const characterGroups = Object.freeze({
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!#$%&()*+,-./:;<=>?@[]^_{|}~'
});
const readableGroups = Object.freeze({
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lowercase: 'abcdefghjkmnpqrstuvwxyz',
  numbers: '23456789',
  symbols: characterGroups.symbols
});
const RANDOM_RANGE = 0x100000000;

export function secureRandomInteger(max, cryptoApi = globalThis.crypto) {
  const limitSize = Number(max);
  if (!Number.isInteger(limitSize) || limitSize < 1 || limitSize > RANDOM_RANGE) {
    throw new Error('Choose a supported character set.');
  }
  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error('Secure random generation is not available in this browser.');
  }
  const ceiling = Math.floor(RANDOM_RANGE / limitSize) * limitSize;
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const value = cryptoApi.getRandomValues(new Uint32Array(1))[0];
    if (value < ceiling) return value % limitSize;
  }
  throw new Error('Secure random generation is unavailable right now.');
}

export function generatePassword(length = 20, options = {}, cryptoApi = globalThis.crypto) {
  const size = Number(length);
  if (!Number.isInteger(size) || size < 8 || size > 64) {
    throw new Error('Choose a password length from 8 to 64 characters.');
  }
  const settings = {
    uppercase: options.uppercase !== false,
    lowercase: options.lowercase !== false,
    numbers: options.numbers !== false,
    symbols: options.symbols !== false,
    avoidAmbiguous: options.avoidAmbiguous !== false
  };
  const groups = ['uppercase', 'lowercase', 'numbers', 'symbols']
    .filter(key => settings[key])
    .map(key => (settings.avoidAmbiguous ? readableGroups : characterGroups)[key]);
  if (!groups.length) throw new Error('Choose at least one character group.');
  if (groups.length > size) throw new Error('Password length is too short for the selected character groups.');

  const allCharacters = groups.join('');
  const result = groups.map(group => group[secureRandomInteger(group.length, cryptoApi)]);
  while (result.length < size) result.push(allCharacters[secureRandomInteger(allCharacters.length, cryptoApi)]);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInteger(index + 1, cryptoApi);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result.join('');
}

export function mountPasswordGenerator({ root, win = window } = {}) {
  const form = root.querySelector('#passwordGeneratorForm');
  const length = root.querySelector('#passwordLength');
  const output = root.querySelector('#generatedPassword');
  const copy = root.querySelector('#copyGeneratedPassword');
  const status = root.querySelector('#passwordGeneratorStatus');
  let alive = true;

  function submit(event) {
    if (event.target !== form) return;
    event.preventDefault();
    output.value = '';
    copy.disabled = true;
    try {
      const password = generatePassword(length.value, {
        uppercase: root.querySelector('#passwordUppercase').checked,
        lowercase: root.querySelector('#passwordLowercase').checked,
        numbers: root.querySelector('#passwordNumbers').checked,
        symbols: root.querySelector('#passwordSymbols').checked,
        avoidAmbiguous: root.querySelector('#passwordAvoidAmbiguous').checked
      }, win.crypto);
      output.value = password;
      copy.disabled = false;
      status.textContent = 'Generated in this browser. It has not been saved or sent.';
    } catch (error) {
      status.textContent = error.message;
    }
  }

  async function click(event) {
    if (!event.target.closest('#copyGeneratedPassword') || !output.value) return;
    try {
      if (typeof win.navigator.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
      await win.navigator.clipboard.writeText(output.value);
      if (alive) status.textContent = 'Password copied. It remains only in this page.';
    } catch {
      if (alive) status.textContent = 'Could not copy automatically. Select the password and copy it manually.';
    }
  }

  root.addEventListener('submit', submit);
  root.addEventListener('click', click);
  return {
    destroy() {
      alive = false;
      root.removeEventListener('submit', submit);
      root.removeEventListener('click', click);
      output.value = '';
      status.textContent = '';
    }
  };
}
