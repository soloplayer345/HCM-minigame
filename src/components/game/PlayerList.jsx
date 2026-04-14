function PlayerList({ players, selfId, status, currentPlayer }) {
  return (
    <div className="player-list">
      <h3>Players</h3>
      <ul>
        {Object.entries(players).map(([id, player]) => {
          const isSelf = id === selfId;
          const hiddenRole = status === 'playing' && !isSelf;
          const roleLabel = hiddenRole ? 'Unknown' : player.role || 'Crewmate';
          const eliminatedLabel = player.eliminated ? ' - Eliminated' : '';

          return (
            <li key={id} className={player.eliminated ? 'eliminated' : ''}>
              <span>{player.name}</span>
              <span className="player-meta">
                {isSelf ? '(You)' : ''} {status === 'playing' ? `• ${roleLabel}` : ''}
                {eliminatedLabel}
              </span>
            </li>
          );
        })}
      </ul>
      {status === 'playing' && currentPlayer.role && (
        <div className="hint">You are playing as <strong>{currentPlayer.role}</strong>.</div>
      )}
    </div>
  );
}

export default PlayerList;
