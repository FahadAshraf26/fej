import React, { useEffect, useState } from "react";
import { Alert, Text } from "@mantine/core";

const NetworkStatus = () => {
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const checkConnectionSpeed = () => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      if (connection) {
        const isLowBandwidth =
          connection.downlink < 1 ||
          ["slow-2g", "2g", "cellular"].includes(connection.effectiveType);
        setIsSlowConnection(isLowBandwidth);

        // Listen for connection changes
        connection.addEventListener("change", checkConnectionSpeed);
        return () =>
          connection.removeEventListener("change", checkConnectionSpeed);
      } else {
        // Fallback to online/offline status
        const handleOnline = () => setIsSlowConnection(false);
        const handleOffline = () => setIsSlowConnection(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
        };
      }
    };

    checkConnectionSpeed();
    const interval = setInterval(checkConnectionSpeed, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (!isSlowConnection) return null;
  return (
    <Alert
      title="Network Status"
      color="red"
      radius="md"
      variant="filled"
      sx={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        maxWidth: "20rem",
        zIndex: 9999,
      }}
    >
      <Text size="sm">Slow network detected.</Text>
    </Alert>
  );
};

export default NetworkStatus;
