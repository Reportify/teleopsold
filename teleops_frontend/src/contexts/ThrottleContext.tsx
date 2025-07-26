import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ThrottleContextType {
  throttleWait: number | null;
  setThrottleWait: (wait: number | null) => void;
}

const ThrottleContext = createContext<ThrottleContextType>({
  throttleWait: null,
  setThrottleWait: () => {},
});

export const useThrottle = () => useContext(ThrottleContext);

export const ThrottleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [throttleWait, setThrottleWait] = useState<number | null>(null);

  useEffect(() => {
    if (throttleWait && throttleWait > 0) {
      const timer = setInterval(() => {
        setThrottleWait((prev) => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [throttleWait]);

  return <ThrottleContext.Provider value={{ throttleWait, setThrottleWait }}>{children}</ThrottleContext.Provider>;
};

export {};
