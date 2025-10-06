import { createContext, useContext, useState, useEffect } from "react";

interface UserContextType {
  userId: string | null;
  setUserId: (id: string | null) => void;
  userName: string | null;
  setUserName: (name: string | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => {
    return localStorage.getItem("userId");
  });
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem("userName");
  });

  useEffect(() => {
    if (userId) {
      localStorage.setItem("userId", userId);
    } else {
      localStorage.removeItem("userId");
    }
  }, [userId]);

  useEffect(() => {
    if (userName) {
      localStorage.setItem("userName", userName);
    } else {
      localStorage.removeItem("userName");
    }
  }, [userName]);

  return (
    <UserContext.Provider value={{ userId, setUserId, userName, setUserName }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
