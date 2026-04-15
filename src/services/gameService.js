import { ref, set, update, onValue, get, remove } from 'firebase/database';
import { db } from './firebase.js';
import {
  ROLE_CREW,
  ROLE_IMPOSTOR,
  ROLE_SPY_BOSS,
  ROLE_ASSASSIN,
  ROLE_SECRETARY,
  ROLE_INTELLIGENCE,
  ROLE_MILITIA
} from './roles.js';

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createRoom(username, playerId) {
  const roomId = generateRoomId();
  const roomRef = ref(db, `rooms/${roomId}`);
  const roomData = {
    roomId,
    status: 'waiting',
    timeOfDay: 'day',
    hostId: playerId,
    createdAt: Date.now(),
    players: {},
    votes: {}
  };

  await set(roomRef, roomData);
  return { roomId };
}

export async function joinRoom(roomId, username, playerId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }

  const room = snapshot.val();
  const normalizedName = username?.trim().toLowerCase();
  const playerNames = Object.values(room.players || {}).map((player) => player.name.toLowerCase());
  if (normalizedName && playerNames.includes(normalizedName)) {
    throw new Error('Tên này đã có trong phòng. Vui lòng chọn tên khác.');
  }

  await update(roomRef, {
    [`players/${playerId}`]: {
      name: username?.trim() || '',
      role: '',
      vote: '',
      eliminated: false
    }
  });

  return { roomId };
}

export function listenRoom(roomId, callback) {
  const roomRef = ref(db, `rooms/${roomId}`);
  return onValue(roomRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

export async function updateGameState(roomId, data) {
  const roomRef = ref(db, `rooms/${roomId}`);
  await update(roomRef, data);
}

export async function tamperPlayer(roomId, spyId, targetId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }
  const room = snapshot.val();
  if (!room.players?.[spyId] || !room.players?.[targetId] || room.players[targetId].eliminated) {
    throw new Error('Target invalid');
  }

  await update(roomRef, {
    tamperedId: targetId,
    tamperedBy: spyId,
    tamperedRole: ROLE_IMPOSTOR,
    [`players/${spyId}/tamperUsed`]: true
  });
}

export async function setPlayerName(roomId, playerId, name) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }

  await update(roomRef, {
    [`players/${playerId}/name`]: name.trim() || ''
  });
}

export async function deleteRoom(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  await remove(roomRef);
}

export async function leaveRoom(roomId, playerId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    return;
  }

  const room = snapshot.val();
  const updates = {
    [`players/${playerId}`]: null,
    [`votes/${playerId}`]: null
  };

  await update(roomRef, updates);

  const remainingPlayers = Object.keys(room.players || {}).filter((id) => id !== playerId);
  if (remainingPlayers.length === 0) {
    await remove(roomRef);
  }
}

export async function startGame(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }

  const room = snapshot.val();
  const playerIds = Object.keys(room.players || {});
  if (playerIds.length < 2) {
    throw new Error('Cần ít nhất 2 người chơi để bắt đầu.');
  }

  const bossIndex = Math.floor(Math.random() * playerIds.length);
  const spyBossId = playerIds[bossIndex];
  const remainingPlayerIds = playerIds.filter((_, index) => index !== bossIndex);

  const updates = {
    status: 'playing',
    timeOfDay: 'day',
    votes: {},
    eliminated: '',
    protectedId: '',
    nightProtectedId: '',
    assassinTargetId: '',
    nightEliminated: '',
    nightOutcome: '',
    voteOutcome: ''
  };

  const selectedSpyIds = [spyBossId];
  let assassinId = null;
  let secretaryId = null;
  let intelligenceId = null;
  let militiaId = null;
  let impostorId = null;

  if (remainingPlayerIds.length > 0) {
    const index = Math.floor(Math.random() * remainingPlayerIds.length);
    assassinId = remainingPlayerIds.splice(index, 1)[0];
    selectedSpyIds.push(assassinId);
  }

  if (remainingPlayerIds.length > 0) {
    const index = Math.floor(Math.random() * remainingPlayerIds.length);
    secretaryId = remainingPlayerIds.splice(index, 1)[0];
  }

  if (remainingPlayerIds.length > 0) {
    const index = Math.floor(Math.random() * remainingPlayerIds.length);
    intelligenceId = remainingPlayerIds.splice(index, 1)[0];
  }

  if (remainingPlayerIds.length > 0) {
    const index = Math.floor(Math.random() * remainingPlayerIds.length);
    militiaId = remainingPlayerIds.splice(index, 1)[0];
  }

  if (remainingPlayerIds.length > 0) {
    const index = Math.floor(Math.random() * remainingPlayerIds.length);
    impostorId = remainingPlayerIds.splice(index, 1)[0];
    selectedSpyIds.push(impostorId);
  }

  playerIds.forEach((id) => {
    const isBoss = id === spyBossId;
    const isAssassin = id === assassinId;
    const isSecretary = id === secretaryId;
    const isIntel = id === intelligenceId;
    const isMilitia = id === militiaId;
    const isSpy = selectedSpyIds.includes(id);

    updates[`players/${id}/role`] = isBoss
      ? ROLE_SPY_BOSS
      : isAssassin
      ? ROLE_ASSASSIN
      : isSpy
      ? ROLE_IMPOSTOR
      : isSecretary
      ? ROLE_SECRETARY
      : isIntel
      ? ROLE_INTELLIGENCE
      : isMilitia
      ? ROLE_MILITIA
      : ROLE_CREW;
    updates[`players/${id}/vote`] = '';
    updates[`players/${id}/eliminated`] = false;
    updates[`players/${id}/roleRevealed`] = false;
    updates[`players/${id}/safeFromVote`] = isBoss;
    updates[`players/${id}/intelUsed`] = false;
    updates[`players/${id}/tamperUsed`] = false;
    updates[`players/${id}/assassinationUsed`] = false;
  });

  await update(roomRef, updates);
}

export async function nextPhase(roomId, currentStatus) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }

  const room = snapshot.val();
  const updates = { votes: {} };

  if (currentStatus === 'playing') {
    if (room.timeOfDay === 'day') {
      updates.status = 'playing';
      updates.timeOfDay = 'night';
    } else {
      const assassinTargetId = room.assassinTargetId || '';
      const nightProtectedId = room.nightProtectedId || '';
      let nightEliminated = '';
      let nightOutcome = '';

      if (assassinTargetId) {
        if (assassinTargetId === nightProtectedId) {
          nightOutcome = 'protected';
        } else {
          nightEliminated = assassinTargetId;
          updates[`players/${nightEliminated}/eliminated`] = true;
        }
      }

      updates.status = 'voting';
      updates.timeOfDay = 'day';
      updates.tamperedId = '';
      updates.tamperedBy = '';
      updates.tamperedRole = '';
      updates.nightProtectedId = '';
      updates.assassinTargetId = '';
      updates.nightEliminated = nightEliminated;
      updates.nightOutcome = nightOutcome;
    }
  } else if (currentStatus === 'voting') {
    const voteCount = {};
    Object.values(room.votes || {}).forEach((vote) => {
      if (vote) {
        voteCount[vote] = (voteCount[vote] || 0) + 1;
      }
    });

    let eliminatedId = '';
    let maxVotes = -1;
    Object.entries(voteCount).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = id;
      }
    });

    updates.status = 'result';
    updates.timeOfDay = 'day';
    updates.eliminated = eliminatedId;
    if (eliminatedId) {
      updates[`players/${eliminatedId}/eliminated`] = true;
    }
  } else if (currentStatus === 'result') {
    const alivePlayers = Object.values(room.players || {}).filter((player) => !player.eliminated);
    const hasImpostorAlive = alivePlayers.some((player) => player.role === ROLE_SPY_BOSS || player.role === ROLE_IMPOSTOR || player.role === ROLE_ASSASSIN);
    const hasCrewAlive = alivePlayers.some((player) => player.role !== ROLE_SPY_BOSS && player.role !== ROLE_IMPOSTOR && player.role !== ROLE_ASSASSIN);
    updates.status = hasImpostorAlive && hasCrewAlive ? 'playing' : 'end';
    updates.timeOfDay = 'day';
    updates.voteOutcome = '';
    updates.protectedId = '';
    updates.nightProtectedId = '';
    updates.assassinTargetId = '';
    updates.nightOutcome = '';
    updates.nightEliminated = '';
    if (hasImpostorAlive && hasCrewAlive) {
      Object.keys(room.players || {}).forEach((id) => {
        updates[`players/${id}/tamperUsed`] = false;
        updates[`players/${id}/assassinationUsed`] = false;
      });
    }
  } else {
    updates.status = 'waiting';
  }

  await update(roomRef, updates);
}

export async function resetGame(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }

  const room = snapshot.val();
  const updates = {
    status: 'waiting',
    timeOfDay: 'day',
    votes: {},
    eliminated: '',
    protectedId: '',
    nightProtectedId: '',
    assassinTargetId: '',
    nightEliminated: '',
    nightOutcome: '',
    voteOutcome: '',
    tamperedId: '',
    tamperedBy: '',
    tamperedRole: ''
  };

  Object.keys(room.players || {}).forEach((id) => {
    updates[`players/${id}/role`] = '';
    updates[`players/${id}/vote`] = '';
    updates[`players/${id}/eliminated`] = false;
    updates[`players/${id}/roleRevealed`] = false;
    updates[`players/${id}/safeFromVote`] = false;
    updates[`players/${id}/intelUsed`] = false;
    updates[`players/${id}/tamperUsed`] = false;
    updates[`players/${id}/assassinationUsed`] = false;
  });

  await update(roomRef, updates);
}
