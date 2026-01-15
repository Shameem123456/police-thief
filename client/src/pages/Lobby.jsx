import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function Lobby() {
  const { state } = useLocation();
  const nav = useNavigate();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    socket.on("room-update", (room) => {
      setPlayers(room.players);
    });

    socket.on("phase", () => {
      nav("/game");
    });

    return () => socket.off();
  }, []);

  function ready() {
    socket.emit("player-ready", { roomId: state.roomId });
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Lobby</h2>

      <h4>Players Joined</h4>
      <ul>
        {players.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>

      <button onClick={ready}>Game Start</button>
    </div>
  );
}
