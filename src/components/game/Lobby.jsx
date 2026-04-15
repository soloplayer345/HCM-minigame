import { useState } from 'react';

function Lobby({ onCreate, onJoin, error }) {
  const [roomId, setRoomId] = useState('');

  return (
    <div className="lobby-panel">
      <div className="card">
        <h2>Phòng chờ</h2>

        <div className="button-row">
          <button onClick={() => onCreate()}>
            Tạo phòng
          </button>
        </div>

        <div className="divider">hoặc</div>

        <label>
          Mã phòng
          <input
            value={roomId}
            onChange={(event) => setRoomId(event.target.value.toUpperCase())}
            placeholder="Nhập mã phòng"
          />
        </label>

        <div className="button-row">
          <button disabled={!roomId.trim()} onClick={() => onJoin(roomId.trim())}>
            Tham gia phòng
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}

export default Lobby;
