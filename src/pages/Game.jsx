import { useEffect, useState } from 'react';
import Lobby from '../components/game/Lobby.jsx';
import Room from '../components/game/Room.jsx';
import { createRoom, joinRoom, listenRoom, updateGameState } from '../services/gameService.js';

function generatePlayerId() {
  return `player_${Math.random().toString(36).slice(2, 10)}`;
}

function Game() {
  const [view, setView] = useState('lobby');
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState('waiting');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      return;
    }

    const unsubscribe = listenRoom(roomId, (data) => {
      if (!data) {
        setError('Room not found.');
        setRoom(null);
        return;
      }

      setRoom(data);
      setStatus(data.status || 'waiting');
    });

    return () => {
      unsubscribe();
    };
  }, [roomId]);

  const handleCreate = async (name) => {
    setError('');
    const newPlayerId = generatePlayerId();
    try {
      const result = await createRoom(name, newPlayerId);
      setUsername(name);
      setPlayerId(newPlayerId);
      setRoomId(result.roomId);
      setView('room');
    } catch (err) {
      setError(err.message || 'Unable to create room.');
    }
  };

  const handleJoin = async (id, name) => {
    setError('');
    const newPlayerId = generatePlayerId();
    try {
      await joinRoom(id, name, newPlayerId);
      setUsername(name);
      setPlayerId(newPlayerId);
      setRoomId(id);
      setView('room');
    } catch (err) {
      setError(err.message || 'Unable to join room.');
    }
  };

  const handleStartGame = async () => {
    if (!room || !room.players) {
      setError('Room is empty.');
      return;
    }

    const playerKeys = Object.keys(room.players);
    if (playerKeys.length < 2) {
      setError('Need at least 2 players to start.');
      return;
    }

    const impostorIndex = Math.floor(Math.random() * playerKeys.length);
    const updates = { status: 'playing', votes: {} };

    playerKeys.forEach((id, index) => {
      updates[`players/${id}/role`] = index === impostorIndex ? 'impostor' : 'crewmate';
      updates[`players/${id}/vote`] = '';
      updates[`players/${id}/eliminated`] = false;
    });

    try {
      await updateGameState(roomId, updates);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to start game.');
    }
  };

  const handleBeginVoting = async () => {
    try {
      await updateGameState(roomId, { status: 'voting', votes: {} });
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to begin voting.');
    }
  };

  const handleVote = async (targetId) => {
    if (!room || !room.players) return;

    const currentVotes = room.votes || {};
    const updatedVotes = { ...currentVotes, [playerId]: targetId };
    const totalPlayers = Object.keys(room.players).length;

    try {
      if (Object.keys(updatedVotes).length >= totalPlayers) {
        const voteCount = {};
        Object.values(updatedVotes).forEach((vote) => {
          voteCount[vote] = (voteCount[vote] || 0) + 1;
        });

        let eliminatedId = '';
        let max = -1;
        Object.entries(voteCount).forEach(([id, count]) => {
          if (count > max) {
            max = count;
            eliminatedId = id;
          }
        });

        const resultData = {
          votes: updatedVotes,
          status: 'result',
          eliminated: eliminatedId,
          [`players/${eliminatedId}/eliminated`]: true
        };

        await updateGameState(roomId, resultData);
      } else {
        await updateGameState(roomId, { votes: updatedVotes });
      }

      setError('');
    } catch (err) {
      setError(err.message || 'Unable to submit vote.');
    }
  };

  const handleBackToLobby = () => {
    setView('lobby');
    setRoomId('');
    setRoom(null);
    setStatus('waiting');
    setError('');
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Đoàn Kết Hay Chia Rẽ</h1>
        <p>Trò chơi suy luận về tinh thần đại đoàn kết</p>
      </header>

      {view === 'lobby' && <Lobby onCreate={handleCreate} onJoin={handleJoin} error={error} />}

      {view === 'room' && (
        <Room
          roomId={roomId}
          room={room}
          playerId={playerId}
          username={username}
          status={status}
          onStartGame={handleStartGame}
          onBeginVoting={handleBeginVoting}
          onVote={handleVote}
          onBack={handleBackToLobby}
          error={error}
        />
      )}
    </div>
  );
}

export default Game;
