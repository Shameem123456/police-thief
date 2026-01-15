export default function BoxGrid({ players, onSelect, disabled }) {
  return (
    <div style={grid}>
      {players.map((p, i) => (
        <button
          key={p.id}
          disabled={disabled}
          style={box}
          onClick={() => onSelect(p.id)}
        >
          Box {i + 1}
        </button>
      ))}
    </div>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10
};

const box = {
  padding: 20,
  fontSize: 16
};
