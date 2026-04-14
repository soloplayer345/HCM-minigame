import { useState } from 'react';

function Lobby({ onCreate, onJoin, error }) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  return (
    <div className="lobby-panel">
      <div className="card">
        <h2>Lobby</h2>

        <label>
          Your name
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter a name"
          />
        </label>

        <div className="button-row">
          <button disabled={!username.trim()} onClick={() => onCreate(username.trim())}>
            Create room
          </button>
        </div>

        <div className="divider">or</div>

        <label>
          Room ID
          <input
            value={roomId}
            onChange={(event) => setRoomId(event.target.value.toUpperCase())}
            placeholder="Enter room ID"
          />
        </label>

        <div className="button-row">
          <button disabled={!username.trim() || !roomId.trim()} onClick={() => onJoin(roomId.trim(), username.trim())}>
            Join room
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}

export default Lobby;
