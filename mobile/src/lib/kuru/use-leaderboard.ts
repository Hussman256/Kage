import { useEffect, useState } from "react";
import { getLeaderboard, type Leaderboard } from "./leaderboard";

export function useLeaderboard() {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // the first load starts on mount

  const settle = (p: Promise<Leaderboard>) =>
    p
      .then((board) => {
        setData(board);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    void settle(getLeaderboard());
  }, []);

  const refresh = () => {
    setLoading(true);
    void settle(getLeaderboard(true));
  };

  return { data, error, loading, refresh };
}
