import { useEffect, useState } from 'react';
import Lobby from '../components/game/Lobby.jsx';
import Room from '../components/game/Room.jsx';
import { createRoom, joinRoom, listenRoom, updateGameState, setPlayerName, deleteRoom, leaveRoom, tamperPlayer, startGame, nextPhase, resetGame } from '../services/gameService.js';

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
        setError('Host đã rời phòng. Quay lại lobby.');
        setView('lobby');
        setRoomId('');
        setRoom(null);
        setStatus('waiting');
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
      setUsername(name?.trim() || '');
      setPlayerId(newPlayerId);
      setRoomId(result.roomId);
      setView('room');
    } catch (err) {
      setError(err.message || 'Không thể tạo phòng.');
    }
  };

  const handleJoin = async (id, name) => {
    setError('');
    const newPlayerId = generatePlayerId();
    try {
      await joinRoom(id, name, newPlayerId);
      setUsername(name?.trim() || '');
      setPlayerId(newPlayerId);
      setRoomId(id);
      setView('room');
    } catch (err) {
      setError(err.message || 'Không thể tham gia phòng.');
    }
  };

  const handleSetName = async (name) => {
    setError('');
    try {
      await setPlayerName(roomId, playerId, name);
      setUsername(name);
    } catch (err) {
      setError(err.message || 'Không thể lưu tên người chơi.');
    }
  };

  const handleStartGame = async () => {
    try {
      await startGame(roomId);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể bắt đầu trò chơi.');
    }
  };

  const handleNextPhase = async (currentStatus) => {
    try {
      await nextPhase(roomId, currentStatus);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể chuyển giai đoạn.');
    }
  };

  const handleResetGame = async () => {
    try {
      await resetGame(roomId);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể đặt lại trò chơi.');
    }
  };

  const handleProtectPlayer = async (targetId) => {
    if (!room || !room.players) return;

    try {
      await updateGameState(roomId, {
        protectedId: targetId,
        [`players/${playerId}/roleRevealed`]: true
      });
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể bảo vệ người chơi.');
    }
  };

  const handleIntelReveal = async (targetId) => {
    if (!room || !room.players) return;

    try {
      await updateGameState(roomId, {
        [`players/${playerId}/intelUsed`]: true
      });
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể sử dụng năng lực tình báo.');
    }
  };

  const handleTamperPlayer = async (targetId) => {
    if (!room || !room.players) return;

    try {
      await tamperPlayer(roomId, playerId, targetId);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể nhiễu tình báo.');
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
          voteOutcome: '',
          protectedId: ''
        };

        const protectedId = room.protectedId;
        const eliminatedPlayer = room.players[eliminatedId];

        if (eliminatedId && protectedId === eliminatedId) {
          resultData.voteOutcome = 'protected';
          resultData.eliminated = '';
        } else if (eliminatedPlayer?.role === ROLE_SPY_BOSS && eliminatedPlayer.safeFromVote !== false) {
          resultData.voteOutcome = 'boss-escaped';
          resultData.eliminated = '';
          resultData[`players/${eliminatedId}/safeFromVote`] = false;
          resultData[`players/${eliminatedId}/name`] = `${eliminatedPlayer.name || 'Trùm gián điệp'} (tái xuất)`;
        } else {
          resultData.eliminated = eliminatedId;
          if (eliminatedId) {
            resultData[`players/${eliminatedId}/eliminated`] = true;
          }
        }

        await updateGameState(roomId, resultData);
      } else {
        await updateGameState(roomId, { votes: updatedVotes });
      }

      setError('');
    } catch (err) {
      setError(err.message || 'Không thể nộp phiếu.');
    }
  };

  const handleBackToLobby = async () => {
    if (roomId) {
      if (room?.hostId === playerId) {
        try {
          await deleteRoom(roomId);
        } catch (err) {
          console.warn('Không thể xóa phòng:', err);
        }
      } else {
        try {
          await leaveRoom(roomId, playerId);
        } catch (err) {
          console.warn('Không thể rời phòng:', err);
        }
      }
    }

    setView('lobby');
    setRoomId('');
    setRoom(null);
    setStatus('waiting');
    setError('');
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Bản làng Kháng chiến</h1>
        <p>Cuối năm 1945, tại một bản làng Việt Bắc, dân làng họp bàn để loại bỏ gián điệp và giữ vững khối đại đoàn kết.</p>
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
          onNextPhase={handleNextPhase}
          onResetGame={handleResetGame}
          onSetName={handleSetName}
          onProtectPlayer={handleProtectPlayer}
          onIntelReveal={handleIntelReveal}
          onTamperPlayer={handleTamperPlayer}
          onVote={handleVote}
          onBack={handleBackToLobby}
          error={error}
        />
      )}
    </div>
  );
}

export default Game;
