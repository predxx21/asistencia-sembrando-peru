"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import styles from "./Topbar.module.css";

export default function Topbar() {
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");

  async function loadUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) return;

      const body = await res.json();
      const user = body.data;

      if (user) {
        const nombre = user.nombre || "";
        const apellido = user.apellido || "";
        setUserName(`${nombre} ${apellido}`.trim() || user.email);

        // Foto desde localStorage o imagen por defecto
        if (typeof window !== "undefined") {
          const storedAvatar = localStorage.getItem(`user_avatar_${user.id}`);
          setUserAvatar(storedAvatar || "/images/default_avatar.jpg");
        }
      }
    } catch (err) {
      console.error("Error al cargar usuario en Topbar:", err);
    }
  }

  useEffect(() => {
    let active = true;

    loadUser();

    function handleProfileUpdate() {
      loadUser();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("profileUpdated", handleProfileUpdate);
    }

    return () => {
      active = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("profileUpdated", handleProfileUpdate);
      }
    };
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.brandTitle}>
        <strong>Sistema Web de Control de Asistencia y Evidencias</strong>
      </div>

      <div className={styles.topActions}>
        {/* Campana de Notificación */}
        <button
          type="button"
          className={styles.iconBtn}
          title="Notificaciones"
          aria-label="Notificaciones"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* Signo de Interrogación */}
        <button
          type="button"
          className={styles.iconBtn}
          title="Ayuda"
          aria-label="Ayuda"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        {/* Foto de perfil circular */}
        <Link
          href="/editar-perfil"
          className={styles.profileAvatarLink}
          title={userName ? `Perfil: ${userName}` : "Mi Perfil"}
          aria-label="Ver Perfil"
        >
          <div className={styles.profileAvatar}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={userAvatar || "/images/default_avatar.jpg"}
              alt="Foto de perfil"
              className={styles.avatarImg}
            />
          </div>
        </Link>
      </div>
    </header>
  );
}