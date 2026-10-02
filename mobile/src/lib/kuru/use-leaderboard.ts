import { useEffect, useState } from "react";
import { getLeaderboard, type Leaderboard, type Window } from "./leaderboard";

export function useLeaderboard(window: Window = "1H") {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // the first load starts on mount

  const settle = (p: Promise<Leaderboard>) =>
    p
      .then((board) => {
        // A slow response for a window the user has since left is dropped.
        if (board.window !== window) return;
        setData(board);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    let live = true;
    getLeaderboard(window).then(
      (board) => {
        if (!live) return;
        setData(board);
        setError(null);
        setLoading(false);
      },
      (e) => {
        if (!live) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      },
    );
    return () => {
      live = false;
    };
  }, [window]);

  const refresh = () => {
    setLoading(true);
    void settle(getLeaderboard(window, true));
  };

  return { data, error, loading, refresh };
}
