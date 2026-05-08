"use client";

import { useCallback, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";

export function useAuthModal() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const openAuthModal = useCallback(() => setIsAuthOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthOpen(false), []);

  return {
    isAuthOpen,
    openAuthModal,
    closeAuthModal,
    authModal: isAuthOpen ? <AuthModal onClose={closeAuthModal} /> : null,
  };
}
