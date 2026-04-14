import PlayerList from './PlayerList.jsx';

function Room({ roomId, room, playerId, username, status, onStartGame, onBeginVoting, onVote, onBack, error }) {
  const players = room?.players || {};
  const currentPlayer = players[playerId] || {};
  const everyoneVoted = Object.keys(room?.votes || {}).length >= Object.keys(players).length;

  return (
    <div className="room-panel">
      <div className="card">
        <div className="room-header">
          <div>
            <h2>Room {roomId}</h2>
            <p>Player: {username}</p>
            <p>Status: {status}</p>
          </div>
          <button className="back-button" onClick={onBack}>
            Back
          </button>
        </div>

        <PlayerList players={players} selfId={playerId} status={status} currentPlayer={currentPlayer} />

        {status === 'waiting' && (
          <div className="action-block">
            <button onClick={onStartGame}>Start game</button>
            <p className="hint">Anyone can start for the demo.</p>
          </div>
        )}

        {status === 'playing' && (
          <div className="action-block">
            <div className="status-card">
              <strong>Your role:</strong> {currentPlayer.role || 'Waiting...'}
            </div>
            <button onClick={onBeginVoting}>Begin voting</button>
            <p className="hint">Reveal your role privately and move to voting.</p>
          </div>
        )}

        {status === 'voting' && (
          <div className="vote-block">
            <h3>Voting</h3>
            {everyoneVoted ? (
              <p className="hint">Waiting for results...</p>
            ) : (
              <p>Select a player to eliminate.</p>
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
                    {player.name}
                    {isSelf ? ' (You)' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {status === 'result' && (
          <div className="result-block">
            <h3>Result</h3>
            <p>
              Eliminated player:{' '}
              <strong>{room?.players?.[room.eliminated]?.name || 'Unknown'}</strong>
            </p>
            <p>{currentPlayer.role === 'impostor' ? 'Impostor wins if crewmates are eliminated!' : 'Crewmates win if impostor is found.'}</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}

export default Room;
