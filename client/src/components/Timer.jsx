import { useEffect, useState } from "react";

export default function Timer({ seconds, onEnd }) {
  const [time, setTime] = useState(seconds);

  useEffect(() => {
    if (time <= 0) {
      onEnd && onEnd();
      return;
    }
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
  }, [time]);

  return <h3>⏳ {time}s</h3>;
}
