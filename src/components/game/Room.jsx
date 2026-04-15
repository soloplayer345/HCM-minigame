import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import PlayerList from './PlayerList.jsx';
import { getResultMessage } from '../../services/roles.js';

function Room({ roomId, room, playerId, username, status, onStartGame, onNextPhase, onResetGame, onSetName, onVote, onBack, error }) {
  const [showRole, setShowRole] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const players = room?.players || {};
  const currentPlayer = players[playerId] || {};
  const everyoneVoted = Object.keys(room?.votes || {}).length >= Object.keys(players).length;
  const isHost = playerId === room?.hostId;

  useEffect(() => {
    setPendingName(currentPlayer.name || '');
  }, [currentPlayer.name]);

  const statusLabels = {
    waiting: 'Đang chờ',
    playing: 'Đang chơi',
    voting: 'Đang bỏ phiếu',
    result: 'Kết quả',
    end: 'Đã kết thúc'
  };

  return (
    <div className="room-panel">
      <div className="card">
        <div className="room-header">
          <div>
            <h2>Phòng {roomId}</h2>
            <p>Vai trò: {isHost ? 'Host quản trò' : username || currentPlayer.name || 'Bạn'}</p>
            <p>Giai đoạn hiện tại: <strong>{statusLabels[status] || status}</strong></p>
            {isHost && <p className="hint">Bạn chỉ quản lý trò chơi, không tham gia chơi.</p>}
          </div>
          <button className="back-button" onClick={onBack}>
            Quay lại
          </button>
        </div>

        {!currentPlayer.name && !isHost && (
          <div className="name-entry-block">
            <label>
              Nhập tên để hiển thị trong phòng
              <input
                value={pendingName}
                onChange={(event) => setPendingName(event.target.value)}
                placeholder="Tên của bạn"
              />
            </label>
            <button disabled={!pendingName.trim()} onClick={() => onSetName(pendingName.trim())}>
              Lưu tên
            </button>
          </div>
        )}

        {isHost && (
          <div className="host-actions">
            {status === 'waiting' && <button onClick={onStartGame}>Bắt đầu trò chơi</button>}
            {status !== 'waiting' && status !== 'end' && (
              <button onClick={() => onNextPhase(status)}>Chuyển giai đoạn</button>
            )}
            <button onClick={onResetGame}>Đặt lại trò chơi</button>
          </div>
        )}

        <PlayerList players={players} selfId={playerId} status={status} currentPlayer={currentPlayer} showRole={showRole} isHost={isHost} hostId={room?.hostId} />

        {status === 'waiting' && !isHost && (
          <div className="action-block">
            <p className="hint">Đang chờ host bắt đầu trò chơi...</p>
          </div>
        )}

        {status === 'playing' && !isHost && (
          <div className="action-block">
            <div className="status-card role-row">
              <div>
                <strong>Vai trò của bạn:</strong>{' '}
                {currentPlayer.role ? (showRole ? currentPlayer.role : '******') : 'Đang chờ...'}
              </div>
              <button
                className="icon-toggle"
                type="button"
                onClick={() => setShowRole((value) => !value)}
                aria-label={showRole ? 'Ẩn vai trò' : 'Hiện vai trò'}
                title={showRole ? 'Ẩn vai trò' : 'Hiện vai trò'}
              >
                {showRole ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="hint">Đang chơi. Host sẽ chuyển sang giai đoạn bỏ phiếu.</p>
          </div>
        )}
        {status === 'playing' && isHost && (
          <div className="action-block">
            <p className="hint">Bạn đang quản trò, không hiển thị vai trò và không bỏ phiếu.</p>
          </div>
        )}

        {status === 'voting' && !isHost && (
          <div className="vote-block">
            <h3>Bỏ phiếu</h3>
            {everyoneVoted ? (
              <p className="hint">Đang chờ kết quả...</p>
            ) : (
              <p>Chọn người chơi để loại bỏ.</p>
            )}
            <div className="player-grid">
              {Object.entries(players).map(([id, player]) => {
                const isSelf = id === playerId;
                return (
                  <button
                    key={id}
                    className="vote-button"
                    disabled={isSelf || everyoneVoted}
                    onClick={() => onVote(id)}
                  >
                    {player.name || 'Người chơi' }
                    {isSelf ? ' (Bạn)' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {status === 'voting' && isHost && (
          <div className="action-block">
            <p className="hint">Host chỉ quan sát giai đoạn bỏ phiếu, người chơi sẽ bỏ phiếu.</p>
          </div>
        )}

        {status === 'result' && (
          <div className="result-block">
            <h3>Kết quả</h3>
            <p>
              Người bị loại:{' '}
              <strong>{room?.players?.[room.eliminated]?.name || 'Không rõ'}</strong>
            </p>
            <p>{getResultMessage(isHost ? room?.players?.[room.eliminated]?.role : currentPlayer.role)}</p>
          </div>
        )}

        {status === 'end' && (
          <div className="result-block">
            <h3>Trò chơi đã kết thúc</h3>
            <p>Host có thể đặt lại trò chơi để bắt đầu lại.</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}

export default Room;
