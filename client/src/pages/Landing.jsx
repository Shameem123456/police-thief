import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function Landing() {
  const nav = useNavigate();
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState({
    name: "",
    roomId: "",
    password: ""
  });

  function submit() {
    socket.emit(
      mode === "create" ? "create-room" : "join-room",
      form
    );

    socket.once("room-response", (res) => {
      if (res.error) return alert(res.error);
      nav("/lobby", { state: { roomId: form.roomId, name: form.name } });
    });
  }

  return (
    <div style={styles.center}>
      <h1>Police & Thief</h1>

      {!mode && (
        <>
          <button onClick={() => setMode("create")}>Create Room</button>
          <button onClick={() => setMode("join")}>Join Room</button>
        </>
      )}

      {mode && (
        <>
          <input placeholder="Player Name"
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Room Number"
            onChange={(e) => setForm({ ...form, roomId: e.target.value })} />
          <input placeholder="Room Password" type="password"
            onChange={(e) => setForm({ ...form, password: e.target.value })} />

          <button onClick={submit}>
            {mode === "create" ? "Create" : "Join"}
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  center: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "center",
    marginTop: "30vh"
  }
};
