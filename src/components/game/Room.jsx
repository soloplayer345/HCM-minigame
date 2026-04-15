import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import PlayerList from './PlayerList.jsx';
import { getResultMessage, isEnemyRole, ROLE_SECRETARY, ROLE_INTELLIGENCE, ROLE_IMPOSTOR } from '../../services/roles.js';

function Room({ roomId, room, playerId, username, status, onStartGame, onNextPhase, onResetGame, onSetName, onProtectPlayer, onIntelReveal, onVote, onBack, error }) {
  const [showRole, setShowRole] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [intelTargetId, setIntelTargetId] = useState('');
  const [intelReveal, setIntelReveal] = useState(null);
  const players = room?.players || {};
  const currentPlayer = players[playerId] || {};
  const everyoneVoted = Object.keys(room?.votes || {}).length >= Object.keys(players).length;
  const isHost = playerId === room?.hostId;
  const protectedTarget = room?.protectedId ? players[room.protectedId] : null;
  const isDay = room?.timeOfDay !== 'night';
  const canProtect = currentPlayer.role === ROLE_SECRETARY && status === 'playing' && !room?.protectedId && isDay;
  const canIntel = currentPlayer.role === ROLE_INTELLIGENCE && status === 'playing' && !isDay && !currentPlayer.intelUsed;
  const canTamper = isEnemyRole(currentPlayer.role) && status === 'playing' && !isDay && !currentPlayer.tamperUsed;
  const sameTeam = showRole && isEnemyRole(currentPlayer.role)
    ? Object.entries(players)
        .filter(([id, player]) => id !== playerId && isEnemyRole(player.role))
        .map(([, player]) => player.name || (player.role === 'trùm gián điệp' ? 'Trùm gián điệp' : 'Gián điệp'))
    : [];

  useEffect(() => {
    setPendingName(currentPlayer.name || '');
    if (currentPlayer.role !== ROLE_INTELLIGENCE) {
      setIntelTargetId('');
      setIntelReveal(null);
    }
  }, [currentPlayer.name, currentPlayer.role]);

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
            <p>Thời gian: <strong>{room?.timeOfDay === 'night' ? 'Đêm' : 'Ngày'}</strong></p>
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

        {canProtect && isDay && (
          <div className="action-block">
            <div className="status-card">
              <p><strong>Bí thư chi bộ</strong> có thể bảo vệ 1 người khỏi phiếu loại, nhưng vai trò sẽ bị lộ.</p>
              <div className="player-grid">
                {Object.entries(players)
                  .filter(([id, player]) => id !== playerId && !player.eliminated)
                  .map(([id, player]) => (
                    <button key={id} className="vote-button" onClick={() => onProtectPlayer(id)}>
                      {player.name || 'Người chơi'}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {canTamper && (
          <div className="action-block">
            <div className="status-card">
              <p><strong>Gián điệp</strong> có thể nhiễu tình báo bằng cách dán role giả cho 1 người mỗi đêm.</p>
              <div className="player-grid">
                {Object.entries(players)
                  .filter(([id, player]) => id !== playerId && !player.eliminated)
                  .map(([id, player]) => (
                    <button key={id} className="vote-button" onClick={() => onTamperPlayer(id)}>
                      {player.name || 'Người chơi'}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {room?.tamperedId && isHost && room?.timeOfDay === 'night' && (
          <div className="status-card">
            <p>Gián điệp đã sử dụng kỹ năng nhiễu tình báo trong đêm này.</p>
          </div>
        )}

        {currentPlayer.role === ROLE_INTELLIGENCE && (
          <div className="action-block">
            <div className="status-card">
              <p><strong>Tình báo</strong> có thể khám phá vai trò 1 người mỗi đêm.</p>
              {isDay ? (
                <p className="hint">Hiện là ngày, bạn sẽ sử dụng kỹ năng vào đêm tiếp theo.</p>
              ) : (
                !intelReveal ? (
                  <div className="player-grid">
                    {Object.entries(players)
                      .filter(([id, player]) => id !== playerId && !player.eliminated)
                      .map(([id, player]) => (
                        <button
                          key={id}
                          className="vote-button"
                          disabled={!canIntel}
                          onClick={() => {
                            setIntelTargetId(id);
                            const fake = room?.tamperedId === id;
                            setIntelReveal({ name: player.name || 'Người chơi', role: fake ? ROLE_IMPOSTOR : player.role || 'dân' });
                            onIntelReveal(id);
                          }}
                        >
                          {player.name || 'Người chơi'}
                        </button>
                      ))}
                  </div>
                ) : (
                  <p className="hint">Bạn đã khám phá: <strong>{intelReveal.name}</strong> là <strong>{intelReveal.role}</strong>.</p>
                )
              )}
              {currentPlayer.intelUsed && !isDay && <p className="hint">Bạn đã sử dụng năng lực tình báo.</p>}
            </div>
          </div>
        )}

        {protectedTarget && currentPlayer.role === ROLE_SECRETARY && (
          <div className="status-card">
            <p>Đã bảo vệ: <strong>{protectedTarget.name || 'Người chơi'}</strong></p>
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
                {showRole && sameTeam.length > 0 && (
                  <div className="hint" style={{ marginTop: '10px' }}>
                    <strong>Đồng đội cùng phe:</strong> {sameTeam.join(', ')}
                  </div>
                )}
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
            <p className="hint">
              {isDay
                ? 'Ngày: dân làng thảo luận và chuẩn bị bỏ phiếu.'
                : 'Đêm: hành động đêm diễn ra, chỉ tình báo có thể khám phá.'}
            </p>
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
              {(() => {
                const nameCounts = Object.values(players).reduce((acc, player) => {
                  const name = player.name || 'Người chơi';
                  acc[name] = (acc[name] || 0) + 1;
                  return acc;
                }, {});
                return Object.entries(players).map(([id, player]) => {
                  const isSelf = id === playerId;
                  const rawName = player.name || 'Người chơi';
                  const duplicateName = nameCounts[rawName] > 1;
                  const displayName = duplicateName ? `${rawName} (${id.slice(-4)})` : rawName;
                  return (
                    <button
                      key={id}
                      className="vote-button"
                      disabled={isSelf || everyoneVoted}
                      onClick={() => onVote(id)}
                    >
                      {displayName}
                      {isSelf ? ' (Bạn)' : ''}
                    </button>
                  );
                });
              })()}
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
            {room?.voteOutcome === 'protected' ? (
              <p><strong>Người chơi được bảo vệ, không ai bị loại.</strong></p>
            ) : room?.voteOutcome === 'boss-escaped' ? (
              <p><strong>Trùm gián điệp đã né được phiếu và tiếp tục ẩn mình.</strong></p>
            ) : (
              <p>
                Người bị loại:{' '}
                <strong>{room?.players?.[room.eliminated]?.name || 'Không rõ'}</strong>
              </p>
            )}
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
