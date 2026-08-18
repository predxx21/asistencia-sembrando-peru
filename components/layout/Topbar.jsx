"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { fetchConToken } from "@/lib/api/client";
import { formatFechaEs } from "@/lib/utils/fecha";
import styles from "./Topbar.module.css";

export default function Topbar() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");

  // Estado de notificaciones
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

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

        if (typeof window !== "undefined") {
          const storedAvatar = localStorage.getItem(`user_avatar_${user.id}`);
          setUserAvatar(storedAvatar || "/images/default_avatar.jpg");
        }
      }
    } catch (err) {
      console.error("Error al cargar usuario en Topbar:", err);
    }
  }

  async function loadNotifications() {
    try {
      const res = await fetchConToken("/api/notificaciones");
      if (!res.ok) return;
      const body = await res.json();
      setNotifications(body.data || []);
      setUnreadCount(body.unreadCount || 0);
    } catch (err) {
      // Silencioso si falla
    }
  }

  useEffect(() => {
    let active = true;

    loadUser();
    loadNotifications();

    // Polling cada 15s para verificar nuevas notificaciones
    const interval = setInterval(() => {
      if (active) loadNotifications();
    }, 15000);

    function handleProfileUpdate() {
      loadUser();
    }

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("profileUpdated", handleProfileUpdate);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      active = false;
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("profileUpdated", handleProfileUpdate);
        document.removeEventListener("mousedown", handleClickOutside);
      }
    };
  }, []);

  async function handleNotificationClick(item) {
    try {
      if (!item.leida) {
        await fetchConToken("/api/notificaciones", {
          method: "PATCH",
          body: { id: item.id },
        });
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, leida: true } : n))
        );
      }
    } catch (err) {
      console.error("Error al marcar notificación leída:", err);
    }

    setShowNotifications(false);

    // Redirigir directamente al detalle del registro revisado en el historial
    if (item.registroId) {
      router.push(`/historial/${item.registroId}`);
    } else {
      router.push("/historial");
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await fetchConToken("/api/notificaciones", {
        method: "PATCH",
        body: { todo: true },
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch (err) {
      console.error("Error al marcar todas leídas:", err);
    }
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.brandTitle}>
        <strong>Sistema Web de Control de Asistencia y Evidencias</strong>
      </div>

      <div className={styles.topActions}>
        {/* Campana de Notificación con Dropdown */}
        <div className={styles.notificationWrapper} ref={dropdownRef}>
          <button
            type="button"
            className={`${styles.iconBtn} ${showNotifications ? styles.iconBtnActive : ""}`}
            title="Notificaciones"
            aria-label="Notificaciones"
            onClick={() => setShowNotifications((prev) => !prev)}
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

            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Menú Desplegable de Notificaciones */}
          {showNotifications && (
            <div className={styles.notificationDropdown}>
              <div className={styles.dropdownHeader}>
                <strong>Notificaciones</strong>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className={styles.markAllBtn}
                    onClick={handleMarkAllAsRead}
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              <div className={styles.dropdownList}>
                {notifications.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No tienes notificaciones por el momento.</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`${styles.notifItem} ${!item.leida ? styles.notifUnread : ""}`}
                      onClick={() => handleNotificationClick(item)}
                    >
                      <div className={styles.notifIcon}>
                        {item.tipo === "aprobado" ? "✅" : "❌"}
                      </div>
                      <div className={styles.notifContent}>
                        <div className={styles.notifTitleRow}>
                          <strong>{item.titulo}</strong>
                          {!item.leida && <span className={styles.unreadDot} />}
                        </div>
                        <p>{item.mensaje}</p>
                        <span className={styles.notifTime}>
                          {formatFechaEs(item.fecha)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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