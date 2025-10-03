import { useState } from "react";
import { Providers } from "./providers";
import { useInMemoryStorage } from "./hooks/useInMemoryStorage";
import { useMetaMask } from "./hooks/metamask/useMetaMaskProvider";
import { useHorseRace } from "./hooks/useHorseRace";
import "./App.css";

export const App: React.FC = () => {
  return (
    <Providers>
      <AppBody />
    </Providers>
  );
};

const AppBody: React.FC = () => {
  const { storage } = useInMemoryStorage();
  const { isConnected, connect, chainId, accounts } = useMetaMask();
  const hr = useHorseRace({ fhevmDecryptionSignatureStorage: storage });

  if (!isConnected) {
    return (
      <div className="app-container">
        <div className="connect-container">
          <h1 className="connect-title">🏇 HorseRace DApp</h1>
          <p className="connect-subtitle">Fully Homomorphic Encryption + Decentralized Betting</p>
          <button className="btn" onClick={connect}>Connect MetaMask</button>
        </div>
      </div>
    );
  }

  if (hr.isDeployed === false) {
    return (
      <div className="app-container">
        <div className="card">
          <p className="error-message">HorseRace contract is not deployed on chainId={chainId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1 className="header-title">🏇 HorseRace DApp</h1>
        <p className="header-subtitle">FHE + Decentralized Betting</p>
      </div>

      <div className="card">
        <h2 className="card-title">⛓️ Chain Information</h2>
        <div className="info-row">
          <span className="info-label">Chain ID:</span>
          <span className="info-value">{chainId}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Account:</span>
          <span className="info-value">{accounts?.[0] ?? "-"}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Contract Address:</span>
          <span className="info-value">{hr.contractAddress}</span>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">🏆 My Wins (Encrypted)</h2>
        <div className="info-row">
          <span className="info-label">Handle:</span>
          <span className="info-value">{hr.handle ?? "-"}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Decrypted Value:</span>
          <span className="info-value">{hr.isDecrypted ? String(hr.clear) : "Not decrypted yet"}</span>
        </div>
        <div className="button-grid">
          <button className="btn btn-secondary" disabled={!hr.canDecrypt} onClick={hr.decryptWinsHandle}>
            {hr.canDecrypt ? "🔓 Decrypt Wins" : hr.isDecrypting ? "⏳ Decrypting..." : hr.isDecrypted ? `✅ Decrypted: ${String(hr.clear)}` : "Nothing to decrypt"}
          </button>
          <button className="btn btn-success" disabled={!hr.canGetWins} onClick={hr.refreshWinsHandle}>
            {hr.canGetWins ? "🔄 Refresh Wins Handle" : "Contract not available"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">🏁 Race Events</h2>
        <RaceList
          races={hr.races}
          isLoading={hr.isLoadingRaces}
          onRefresh={hr.refreshRaces}
          canBet={hr.canPlaceBet}
          onBet={(raceId, horseId, valueEth) => hr.placeBet(raceId, horseId, valueEth)}
          onCancel={(raceId) => hr.cancelBet(raceId)}
          onPayout={(raceId) => hr.payout(raceId)}
        />
      </div>

      <div className="card">
        <h2 className="card-title">⚙️ Admin Controls</h2>
        <AdminWidget 
          onCreate={hr.adminCreateRace} 
          onLock={hr.adminLockRace} 
          onFinish={hr.adminFinishRace}
          races={hr.races}
        />
      </div>
    </div>
  );
};

const RaceList: React.FC<{
  races: { raceId: number; status: number; statusLabel: string; horses: number; locked: boolean; totalPool: bigint; winnerHorseId: number | null; userBetHorseId: number | null; userBetAmountWei: bigint; }[] | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  canBet: boolean;
  onBet: (raceId: number, horseId: number, valueEth: string) => void | Promise<void>;
  onCancel: (raceId: number) => void | Promise<void>;
  onPayout: (raceId: number) => void | Promise<void>;
}> = ({ races, isLoading, onRefresh, canBet, onBet, onCancel, onPayout }) => {
  const [amountMap, setAmountMap] = useState<Record<number, string>>({});
  const getAmount = (raceId: number) => amountMap[raceId] ?? "0.0001";
  const setAmount = (raceId: number, v: string) => setAmountMap((m) => ({ ...m, [raceId]: v }));

  if (isLoading) {
    return <div className="loading">⏳ Loading races...</div>;
  }
  
  if (!races || races.length === 0) {
    return (
      <div className="no-data">
        <p>No races found.</p>
        <button className="btn btn-secondary btn-small" onClick={onRefresh} style={{ marginTop: "1rem" }}>
          🔄 Refresh
        </button>
      </div>
    );
  }

  const getStatusClass = (status: number) => {
    if (status === 1) return "open";
    if (status === 2) return "locked";
    if (status === 3) return "finished";
    return "";
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <button className="btn btn-secondary btn-small" onClick={onRefresh}>
          🔄 Refresh Races
        </button>
      </div>
      {races.map((r) => (
        <div key={r.raceId} className="race-card">
          <div className="race-header">
            <div className="race-info">
              <div className="race-id">Race #{r.raceId}</div>
              <div>
                <span className={`race-status ${getStatusClass(r.status)}`}>
                  {r.statusLabel}
                </span>
                {r.winnerHorseId !== null && (
                  <span className="winner-badge">🏆 Winner: Horse {r.winnerHorseId}</span>
                )}
              </div>
              <div className="race-details">
                <div>🐴 Horses: <strong>{r.horses}</strong></div>
                <div>💰 Total Pool: <strong>{String(r.totalPool)} wei</strong></div>
              </div>
            </div>
            
            <div className="race-actions">
              {r.status === 1 ? (
                <>
                  {r.userBetHorseId !== null ? (
                    <div className="bet-info">
                      <div>✅ You bet on Horse <strong>{r.userBetHorseId}</strong></div>
                      <div>Amount: <strong>{String(r.userBetAmountWei)}</strong> wei</div>
                      <button className="btn btn-danger btn-small" onClick={() => onCancel(r.raceId)} style={{ marginTop: "0.5rem" }}>
                        ❌ Cancel Bet
                      </button>
                    </div>
                  ) : (
                    <div className="bet-input-group">
                      <div className="bet-input-wrapper">
                        <input 
                          className="input-field" 
                          placeholder="ETH (e.g. 0.0001)" 
                          value={getAmount(r.raceId)} 
                          onChange={(e) => setAmount(r.raceId, e.target.value)} 
                        />
                      </div>
                      {Array.from({ length: r.horses }).map((_, idx) => (
                        <button 
                          key={idx} 
                          className="btn btn-success btn-small horse-button" 
                          disabled={!canBet} 
                          onClick={() => onBet(r.raceId, idx, getAmount(r.raceId))}
                        >
                          🐴 Bet Horse {idx}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : r.status === 3 ? (
                r.userBetHorseId !== null && r.winnerHorseId !== null ? (
                  r.userBetHorseId === r.winnerHorseId ? (
                    <button className="btn btn-success" onClick={() => onPayout(r.raceId)}>
                      🎉 Claim Prize
                    </button>
                  ) : (
                    <div className="bet-info">😔 Your horse didn't win</div>
                  )
                ) : (
                  <div className="bet-info">🏁 Race Finished</div>
                )
              ) : r.status === 2 ? (
                r.userBetHorseId !== null ? (
                  <div className="bet-info">
                    <div>✅ You bet on Horse <strong>{r.userBetHorseId}</strong></div>
                    <div>Amount: <strong>{String(r.userBetAmountWei)}</strong> wei</div>
                  </div>
                ) : (
                  <button className="btn" disabled>🔒 Locked</button>
                )
              ) : (
                <button className="btn" disabled>🔒 Locked</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminWidget: React.FC<{ 
  onCreate: (horses: number) => Promise<void> | void; 
  onLock: (raceId: number) => Promise<void> | void; 
  onFinish: (raceId: number, winnerHorseId: number) => Promise<void> | void;
  races?: { raceId: number; status: number; statusLabel: string; horses: number; locked: boolean; totalPool: bigint; winnerHorseId: number | null; userBetHorseId: number | null; userBetAmountWei: bigint; }[] | undefined;
}> = ({ onCreate, onLock, onFinish, races }) => {
  const [raceId, setRaceId] = useState(0);
  const [horses, setHorses] = useState(6);
  const [isRacing, setIsRacing] = useState(false);
  const [raceData, setRaceData] = useState<{ raceId: number; numHorses: number } | null>(null);

  const handleStartRace = async () => {
    if (raceId === null || raceId === undefined) return;
    
    // Find the race to get the number of horses
    const race = races?.find(r => r.raceId === raceId);
    if (!race) {
      alert(`Race #${raceId} not found!`);
      return;
    }
    
    // First lock the race
    await onLock(raceId);
    
    // Then show the racing animation with the correct number of horses
    setRaceData({ raceId, numHorses: race.horses });
    setIsRacing(true);
  };

  const handleRaceComplete = async (winnerHorseId: number) => {
    setIsRacing(false);
    setRaceData(null);
    
    // Finish the race with the winner from animation
    await onFinish(raceId, winnerHorseId);
  };

  return (
    <div>
      {isRacing && raceData ? (
        <HorseRaceAnimation 
          raceId={raceData.raceId}
          numHorses={raceData.numHorses}
          onComplete={handleRaceComplete}
        />
      ) : (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input 
                className="input-field" 
                placeholder="Number of Horses" 
                type="number" 
                value={horses} 
                onChange={(e) => setHorses(parseInt(e.target.value) || 6)} 
              />
              <button className="btn btn-success" onClick={() => onCreate(horses)}>
                ➕ Create Race
              </button>
            </div>
          </div>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem" }}>
              <input 
                className="input-field" 
                placeholder="Race ID" 
                type="number" 
                value={raceId} 
                onChange={(e) => setRaceId(parseInt(e.target.value) || 0)} 
              />
              <button className="btn btn-success" onClick={handleStartRace}>
                🏁 Start Race
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const HorseRaceAnimation: React.FC<{ 
  raceId: number; 
  numHorses: number; 
  onComplete: (winnerHorseId: number) => void;
}> = ({ raceId, numHorses, onComplete }) => {
  const [horsePositions, setHorsePositions] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);

  const startRace = () => {
    setIsRunning(true);
    setWinner(null);
    
    // Initialize positions
    const positions = Array(numHorses).fill(0);
    setHorsePositions(positions);

    // Simulate race with random speeds
    const interval = setInterval(() => {
      setHorsePositions(prev => {
        const newPositions = prev.map(pos => {
          if (pos >= 100) return pos;
          // Random speed between 1-5% per tick
          return Math.min(100, pos + Math.random() * 3 + 1);
        });

        // Check if any horse finished
        const finishedHorses = newPositions.filter(pos => pos >= 100);
        if (finishedHorses.length > 0 && winner === null) {
          const winnerIndex = newPositions.findIndex(pos => pos >= 100);
          setWinner(winnerIndex);
          setIsRunning(false);
          clearInterval(interval);
          
          // Complete after showing winner
          setTimeout(() => {
            onComplete(winnerIndex);
          }, 3000);
        }

        return newPositions;
      });
    }, 100);

    return () => clearInterval(interval);
  };

  return (
    <div className="race-animation-container">
      <div className="race-animation-header">
        <h3 className="race-animation-title">🏇 Race #{raceId} - Live!</h3>
        {winner !== null && (
          <div className="race-winner-announcement">
            🏆 Horse {winner} Wins! 🏆
          </div>
        )}
      </div>

      <div className="race-track-container">
        {Array.from({ length: numHorses }).map((_, idx) => (
          <div key={idx} className="race-track">
            <div className="race-track-label">
              Horse {idx}
              {winner === idx && <span className="winner-icon">👑</span>}
            </div>
            <div className="race-track-lane">
              <div className="race-track-progress-bg">
                <div 
                  className={`race-track-progress ${winner === idx ? 'winner' : ''}`}
                  style={{ width: `${horsePositions[idx] || 0}%` }}
                >
                  <span className="horse-icon">🐴</span>
                </div>
              </div>
            </div>
            <div className="race-track-percentage">
              {Math.round(horsePositions[idx] || 0)}%
            </div>
          </div>
        ))}
      </div>

      {!isRunning && winner === null && (
        <div className="race-start-button-container">
          <button className="btn btn-success" onClick={startRace}>
            🚀 Start Race Animation
          </button>
        </div>
      )}

      {isRunning && (
        <div className="race-status">
          ⏱️ Race in progress...
        </div>
      )}
    </div>
  );
};


