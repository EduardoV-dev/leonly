import { useEffect, useState } from "react";

export const RECONNECTED_DURATION_MS = 5_000;
type ConnectivityStatus = "offline" | "online" | null;

export function useConnectivityBanner(): ConnectivityStatus {
  const [status, setStatus] = useState<ConnectivityStatus>(null);

  useEffect(() => {
    let isOnline = navigator.onLine;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (!isOnline) setStatus("offline");

    const handleOffline = () => {
      if (!isOnline) return;
      isOnline = false;
      clearTimeout(timeout);
      setStatus("offline");
    };
    const handleOnline = () => {
      if (isOnline) return;
      isOnline = true;
      setStatus("online");
      timeout = setTimeout(() => setStatus(null), RECONNECTED_DURATION_MS);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearTimeout(timeout);
    };
  }, []);

  return status;
}
