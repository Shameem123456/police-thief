export default function Leaderboard({ players }) {
  return (
    <div>
      <h2>Final Leaderboard</h2>
      <ol>
        {[...players]
          .sort((a, b) => b.score - a.score)
          .map(p => (
            <li key={p.id}>
              {p.name} — {p.score}
            </li>
          ))}
      </ol>
    </div>
  );
}
