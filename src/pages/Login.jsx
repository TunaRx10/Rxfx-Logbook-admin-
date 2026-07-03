import React, { useEffect } from "react";
import { auth } from "../firebase/config";
import { EmailAuthProvider, GoogleAuthProvider } from "firebase/auth";
import * as firebaseui from "firebaseui";
import "firebaseui/dist/firebaseui.css";

const Login = () => {
  useEffect(() => {
    // Initialisation de FirebaseUI
    const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);

    ui.start("#firebaseui-auth-container", {
      signInOptions: [
        {
          provider: EmailAuthProvider.PROVIDER_ID,
          requireDisplayName: true,
        },
        GoogleAuthProvider.PROVIDER_ID,
      ],
      signInSuccessUrl: "/", // Redirection après succès
      credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
      callbacks: {
        signInSuccessWithAuthResult: () => {
          // On laisse le AuthGuard gérer la redirection
          return true;
        },
      },
    });

    return () => {
      // Nettoyage pour éviter les doublons au re-render
      ui.reset();
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-blue-600 p-8 text-center text-white">
          <h2 className="text-3xl font-extrabold tracking-tight">RxFx Admin</h2>
          <p className="mt-2 text-blue-100 opacity-80">Identification requise pour continuer</p>
        </div>
        
        <div className="p-8">
          <div id="firebaseui-auth-container" className="mt-4"></div>
          
          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs text-slate-400">
              Accès réservé aux administrateurs autorisés. 
              Toutes les connexions sont journalisées.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
