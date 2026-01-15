import { useEffect, useState } from "react";
import { socket } from "../socket";

export default function Game() {
  const [role, setRole] = useState(null);
  const [phase, setPhase] = useState("");

  useEffect(() => {
    socket.on("role", setRole);
    socket.on("phase", setPhase);
    return () => socket.off();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Game Phase: {phase}</h2>
      {role && (
        <div>
          <h3>Your Role</h3>
          <p>{role.name}</p>
        </div>
      )}
    </div>
  );
}
