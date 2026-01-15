export default function PhaseUI({ phase, players, submit }) {
  function pick(id) {
    submit(id);
  }

  if (phase === "MINISTER_JESTER")
    return (
      <>
        <h3>Select a Player (or skip)</h3>
        {players.map(p => (
          <button key={p.id} onClick={() => pick(p.id)}>
            {p.name}
          </button>
        ))}
        <button onClick={() => pick(null)}>Skip</button>
      </>
    );

  if (phase === "SPY")
    return (
      <>
        <h3>Spy Predictions</h3>
        <p>Select Minister then Jester</p>
        {players.map(p => (
          <button key={p.id} onClick={() => pick(p.id)}>
            {p.name}
          </button>
        ))}
      </>
    );

  if (phase === "POLICE_KNIGHT")
    return (
      <>
        <h3>Police / Knight Action</h3>
        {players.map(p => (
          <button key={p.id} onClick={() => pick(p.id)}>
            {p.name}
          </button>
        ))}
        <button onClick={() => pick(null)}>Skip</button>
      </>
    );

  return null;
}
