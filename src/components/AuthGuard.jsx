import React from "react";

/**
 * AuthGuard désactivé à la demande de l'utilisateur.
 * Rend directement les composants enfants sans vérification.
 */
const AuthGuard = ({ children }) => {
  return children;
};

export default AuthGuard;
