import { ref, set, update, onValue, get, remove } from 'firebase/database';
import { db } from './firebase.js';
import { ROLE_CREW, ROLE_IMPOSTOR, ROLE_SPY_BOSS, ROLE_SECRETARY, ROLE_INTELLIGENCE } from './roles.js';

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
  const remainingPlayerIds = playerIds.filter((_, index) => index !== bossIndex);
  const secretaryIndex = Math.floor(Math.random() * remainingPlayerIds.length);
  const secretaryId = remainingPlayerIds[secretaryIndex];
  const selectedSpyIds = [playerIds[bossIndex]];

  if (remainingPlayerIds.length > 1) {
    const spyCandidates = remainingPlayerIds.filter((id) => id !== secretaryId);
    const secondSpyId = spyCandidates[Math.floor(Math.random() * spyCandidates.length)];
    selectedSpyIds.push(secondSpyId);
  }

  const updates = {
    status: 'playing',
    timeOfDay: 'day',
    votes: {},
    eliminated: '',
    protectedId: '',
    voteOutcome: ''
  };

  const crewCandidates = playerIds.filter((id) => !selectedSpyIds.includes(id) && id !== secretaryId);
  const intelligenceId = crewCandidates.length > 0 ? crewCandidates[Math.floor(Math.random() * crewCandidates.length)] : null;

  playerIds.forEach((id) => {
    const isBoss = id === playerIds[bossIndex];
    const isSecretary = id === secretaryId;
    const isSpy = selectedSpyIds.includes(id);
    const isIntel = id === intelligenceId;

    updates[`players/${id}/role`] = isBoss
      ? ROLE_SPY_BOSS
      : isSpy
      ? ROLE_IMPOSTOR
      : isSecretary
      ? ROLE_SECRETARY
      : isIntel
      ? ROLE_INTELLIGENCE
      : ROLE_CREW;
    updates[`players/${id}/vote`] = '';
    updates[`players/${id}/eliminated`] = false;
    updates[`players/${id}/roleRevealed`] = false;
    updates[`players/${id}/safeFromVote`] = isBoss;
    updates[`players/${id}/intelUsed`] = false;
    updates[`players/${id}/tamperUsed`] = false;
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
      updates.status = 'voting';
      updates.timeOfDay = 'day';
      updates.tamperedId = '';
      updates.tamperedBy = '';
      updates.tamperedRole = '';
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
    const hasImpostorAlive = alivePlayers.some((player) => player.role === ROLE_SPY_BOSS || player.role === ROLE_IMPOSTOR);
    const hasCrewAlive = alivePlayers.some((player) => player.role !== ROLE_SPY_BOSS && player.role !== ROLE_IMPOSTOR);
    updates.status = hasImpostorAlive && hasCrewAlive ? 'playing' : 'end';
    updates.timeOfDay = 'day';
    updates.voteOutcome = '';
    updates.protectedId = '';
    if (hasImpostorAlive && hasCrewAlive) {
      Object.keys(room.players || {}).forEach((id) => {
        updates[`players/${id}/tamperUsed`] = false;
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
  const updates = { status: 'waiting', timeOfDay: 'day', votes: {}, eliminated: '', protectedId: '', voteOutcome: '', tamperedId: '', tamperedBy: '', tamperedRole: '' };

  Object.keys(room.players || {}).forEach((id) => {
    updates[`players/${id}/role`] = '';
    updates[`players/${id}/vote`] = '';
    updates[`players/${id}/eliminated`] = false;
    updates[`players/${id}/roleRevealed`] = false;
    updates[`players/${id}/safeFromVote`] = false;
    updates[`players/${id}/intelUsed`] = false;
    updates[`players/${id}/tamperUsed`] = false;
  });

  await update(roomRef, updates);
}
