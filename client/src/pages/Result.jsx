import { useEffect, useState } from "react";
import { socket } from "../socket";

export default function Result() {
  const [data, setData] = useState(null);

  useEffect(() => {
    socket.on("result", setData);
    return () => socket.off();
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Cycle Results</h2>

      <h3>Roles Revealed</h3>
      <ul>
        {Object.values(data.players).map(p => (
          <li key={p.id}>
            {p.name} — {p.role.name} — Cycle Score: {p.cycleScore}
          </li>
        ))}
      </ul>

      <h3>Spy Blocks</h3>
      <p>Minister Blocked: {data.blocks.minister ? "Yes" : "No"}</p>
      <p>Jester Blocked: {data.blocks.jester ? "Yes" : "No"}</p>
    </div>
  );
}
