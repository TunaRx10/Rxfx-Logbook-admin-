import React, { createContext, useContext } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

/**
 * AuthProvider simplifié (plus de logique Firebase Auth)
 */
export const AuthProvider = ({ children }) => {
  const value = {
    currentUser: { displayName: "Admin Invité" },
    isAdmin: true,
    loading: false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
