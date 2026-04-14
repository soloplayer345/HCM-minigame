import { ref, set, update, onValue, get } from 'firebase/database';
import { db } from './firebase.js';

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
    players: {
      [playerId]: {
        name: username,
        role: '',
        vote: '',
        eliminated: false
      }
    },
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

  await update(roomRef, {
    [`players/${playerId}`]: {
      name: username,
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
