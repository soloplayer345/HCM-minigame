import { getRoleLabel } from '../../services/roles.js';

function PlayerList({ players, selfId, status, currentPlayer, showRole, isHost, hostId }) {
  const visiblePlayerEntries = Object.entries(players).filter(([id]) => id !== hostId);
  const nameCounts = visiblePlayerEntries.reduce((acc, [, player]) => {
    const name = player.name || 'Người chơi';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="player-list">
      <h3>Người chơi</h3>
      <ul>
        {visiblePlayerEntries.map(([id, player]) => {
          const isSelf = id === selfId;
          const forceShowRole = player.roleRevealed;
          const hiddenRole = status === 'playing' && !isSelf && !forceShowRole;
          const shouldHideSelf = status === 'playing' && isSelf && !showRole;
          const roleLabel = shouldHideSelf ? '******' : hiddenRole ? 'Không rõ' : getRoleLabel(player.role);
          const rawName = player.name || 'Người chơi';
          const duplicateName = nameCounts[rawName] > 1;
          const displayName = duplicateName ? `${rawName} (${id.slice(-4)})` : rawName;
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
    </div>
  );
}

export default PlayerList;
