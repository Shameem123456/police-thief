import { useState } from "react";

export default function RoleCard({ role }) {
  const [hide, setHide] = useState(false);

  return (
    <div style={card}>
      <button onClick={() => setHide(!hide)}>
        {hide ? "Show Role" : "Hide Role"}
      </button>

      {!hide && (
        <>
          <h3>{role.name}</h3>
          <p>Base Score: {role.score}</p>
        </>
      )}
    </div>
  );
}

const card = {
  border: "2px solid black",
  padding: 15,
  marginBottom: 15,
  textAlign: "center"
};
