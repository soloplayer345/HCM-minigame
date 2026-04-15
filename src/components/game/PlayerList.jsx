import { getRoleLabel } from '../../services/roles.js';

function PlayerList({ players, selfId, status, currentPlayer, showRole, isHost, hostId }) {
  const visiblePlayerEntries = Object.entries(players).filter(([id]) => id !== hostId);

  return (
    <div className="player-list">
      <h3>Người chơi</h3>
      <ul>
        {visiblePlayerEntries.map(([id, player]) => {
          const isSelf = id === selfId;
          const hiddenRole = status === 'playing' && !isSelf;
          const shouldHideSelf = status === 'playing' && isSelf && !showRole;
          const roleLabel = shouldHideSelf ? '******' : hiddenRole ? 'Không rõ' : getRoleLabel(player.role);
          const displayName = player.name || 'Người chơi';
          const eliminatedLabel = player.eliminated ? ' - Bị loại' : '';

          return (
            <li key={id} className={player.eliminated ? 'eliminated' : ''}>
              <span>{displayName}</span>
              <span className="player-meta">
                {isSelf ? '(You)' : ''} {status === 'playing' ? `• ${roleLabel}` : ''}
                {eliminatedLabel}
              </span>
            </li>
          );
        })}
      </ul>
      {status === 'playing' && currentPlayer.role && !isHost && (
        <div className="hint">Bạn đang chơi với tư cách <strong>{currentPlayer.role}</strong>.</div>
      )}
    </div>
  );
}

export default PlayerList;
