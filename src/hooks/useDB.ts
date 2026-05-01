import { useEffect, useState } from "react";
import { loadDB } from "@/lib/store";

export function useDB() {
  const [db, setDB] = useState(() => loadDB());
  useEffect(() => {
    const refresh = () => setDB(loadDB());
    window.addEventListener("snowwolf:db", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("snowwolf:db", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return db;
}
