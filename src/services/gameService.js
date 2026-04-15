import { ref, set, update, onValue, get } from 'firebase/database';
import { db } from './firebase.js';
import { ROLE_CREW, ROLE_IMPOSTOR } from './roles.js';

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createRoom(username, playerId) {
  const roomId = generateRoomId();
  const roomRef = ref(db, `rooms/${roomId}`);
  const roomData = {
    roomId,
    status: 'waiting',
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

  const impostorIndex = Math.floor(Math.random() * playerIds.length);
  const updates = { status: 'playing', votes: {} };

  playerIds.forEach((id, index) => {
    updates[`players/${id}/role`] = index === impostorIndex ? ROLE_IMPOSTOR : ROLE_CREW;
    updates[`players/${id}/vote`] = '';
    updates[`players/${id}/eliminated`] = false;
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
    updates.status = 'voting';
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
    updates.eliminated = eliminatedId;
    if (eliminatedId) {
      updates[`players/${eliminatedId}/eliminated`] = true;
    }
  } else if (currentStatus === 'result') {
    const alivePlayers = Object.values(room.players || {}).filter((player) => !player.eliminated);
    const hasImpostorAlive = alivePlayers.some((player) => player.role === ROLE_IMPOSTOR);
    const hasCrewAlive = alivePlayers.some((player) => player.role !== ROLE_IMPOSTOR);
    updates.status = hasImpostorAlive && hasCrewAlive ? 'playing' : 'end';
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
  const updates = { status: 'waiting', votes: {}, eliminated: '' };

  Object.keys(room.players || {}).forEach((id) => {
    updates[`players/${id}/role`] = '';
    updates[`players/${id}/vote`] = '';
    updates[`players/${id}/eliminated`] = false;
  });

  await update(roomRef, updates);
}
