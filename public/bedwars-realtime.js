const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const safePlayerId = value => String(value || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 80);

export function cleanRoomCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
export function makeRoomCode(win = globalThis) {
  const bytes = new Uint8Array(6);
  try { win.crypto?.getRandomValues?.(bytes); } catch {}
  if (!bytes.some(Boolean)) for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map(byte => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join('');
}
function normalizeMember(member) {
  if (!member || typeof member !== 'object') return null;
  const id = safePlayerId(member.id);
  if (!id) return null;
  return {
    id,
    name: String(member.name || 'Player').replace(/[<>]/g, '').trim().slice(0, 24) || 'Player',
    joinedAt: Math.max(0, Number(member.joinedAt) || 0),
    hostId: safePlayerId(member.hostId),
    started: member.started === true
  };
}

export function createBedWarsRoom({client, code, player, onMembers = () => {}, onMessage = () => {}, onStatus = () => {}, win = globalThis}) {
  const roomCode = cleanRoomCode(code);
  const playerId = safePlayerId(player?.id);
  if (!client?.channel || !client?.removeChannel) throw new Error('Online play is unavailable right now.');
  if (roomCode.length !== 6) throw new Error('Room codes must be six letters or numbers.');
  if (!playerId) throw new Error('Your player session could not be identified.');
  const identity = {
    id: playerId,
    name: String(player.name || 'Player').replace(/[<>]/g, '').trim().slice(0, 24) || 'Player',
    joinedAt: Math.max(0, Number(player.joinedAt) || Date.now()),
    hostId: safePlayerId(player.hostId),
    started: false
  };
  const channel = client.channel(`bedwars-${roomCode.toLowerCase()}`, {
    config: { broadcast: { self: false, ack: false }, presence: { key: playerId } }
  });
  let ready = false;
  let closed = false;
  let readyResolve;
  const readyPromise = new Promise(resolve => { readyResolve = resolve; });
  const publishMembers = () => {
    if (closed) return;
    const state = channel.presenceState?.() || {};
    const members = Object.values(state).flatMap(value => Array.isArray(value) ? value : [])
      .map(normalizeMember).filter(Boolean)
      .filter((member, index, all) => all.findIndex(other => other.id === member.id) === index)
      .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
    onMembers(members);
  };
  channel.on('presence', {event: 'sync'}, publishMembers);
  channel.on('broadcast', {event: 'game'}, message => {
    const payload = message?.payload;
    if (!payload || typeof payload !== 'object' || typeof payload.type !== 'string') return;
    onMessage(payload);
  });
  channel.subscribe(async status => {
    if (closed) return;
    if (status === 'SUBSCRIBED') {
      ready = true;
      try { await channel.track(identity); }
      catch { onStatus('error', 'Could not announce you to this room.'); }
      publishMembers();
      onStatus('connected', 'Connected to Bed Wars.');
      readyResolve(true);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      ready = false;
      onStatus('error', status === 'TIMED_OUT' ? 'Room connection timed out. Check the code and try again.' : 'Lost the room connection.');
      readyResolve(false);
    }
  });
  return {
    code: roomCode,
    get ready() { return ready; },
    whenReady: () => readyPromise,
    getMembers: () => {
      const state = channel.presenceState?.() || {};
      return Object.values(state).flatMap(value => Array.isArray(value) ? value : []).map(normalizeMember).filter(Boolean);
    },
    async setPresence(patch = {}) {
      if (closed || !ready) return false;
      const next = { ...identity, ...patch, id: identity.id, name: identity.name, joinedAt: identity.joinedAt };
      identity.hostId = safePlayerId(next.hostId);
      identity.started = next.started === true;
      try { await channel.track(next); publishMembers(); return true; }
      catch { onStatus('error', 'Could not update room status.'); return false; }
    },
    async send(type, payload = {}) {
      if (closed || !ready || !/^[a-z-]{1,24}$/.test(type)) return false;
      let body;
      try { body = JSON.stringify(payload); } catch { return false; }
      if (body.length > 3500) return false;
      try {
        const result = await channel.send({ type: 'broadcast', event: 'game', payload: { ...payload, type, from: playerId } });
        return result === 'ok' || result?.status === 'ok';
      } catch { return false; }
    },
    async leave() {
      if (closed) return;
      closed = true;
      ready = false;
      try { await channel.untrack(); } catch {}
      try { await client.removeChannel(channel); } catch {}
    }
  };
}
