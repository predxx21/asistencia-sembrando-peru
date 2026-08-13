"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { fetchConToken } from "@/lib/api/client";
import { comprimirImagen } from "@/lib/utils/imagen";
import styles from "./EditarPerfil.module.css";

export default function EditarPerfil() {
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Carga el perfil (nombre/apellido) desde la API y la foto desde localStorage.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No hay sesión activa.");

        setUserId(user.id);

        const res = await fetchConToken("/api/auth/perfil");
        const body = await res.json().catch(() => null);

        if (cancelled) return;

        if (!body?.profile) throw new Error("No se encontró tu perfil.");

        setForm({
          nombre: body.profile.nombre || "",
          apellido: body.profile.apellido || "",
        });

        // Obtener la foto de perfil almacenada en el navegador (localStorage)
        if (typeof window !== "undefined") {
          const storedAvatar = localStorage.getItem(`user_avatar_${user.id}`);
          setAvatarUrl(storedAvatar || null);
        }

        setEmail(user.email || "");
      } catch (err) {
        if (!cancelled) {
          setMensaje("❌ " + (err.message || "No se pudo cargar el perfil."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAvatarSelect(event) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!["image/jpeg", "image/png", "image/jpg"].includes(selectedFile.type)) {
      setMensaje("❌ Selecciona una imagen en formato JPG o PNG.");
      return;
    }

    try {
      const comprimida = await comprimirImagen(selectedFile, { maxDimension: 400, calidad: 0.85 });
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        setAvatarUrl(dataUrl);
        if (userId && typeof window !== "undefined") {
          localStorage.setItem(`user_avatar_${userId}`, dataUrl);
          window.dispatchEvent(new CustomEvent("profileUpdated"));
        }
      };
      reader.readAsDataURL(comprimida);
    } catch (err) {
      console.error("Error al procesar avatar:", err);
      setMensaje("❌ No se pudo cargar la imagen seleccionada.");
    }
  }

  function handleDeleteAvatar() {
    setAvatarUrl(null);
    if (userId && typeof window !== "undefined") {
      localStorage.removeItem(`user_avatar_${userId}`);
      window.dispatchEvent(new CustomEvent("profileUpdated"));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.nombre.trim() || !form.apellido.trim()) {
      setMensaje("❌ El nombre y el apellido son obligatorios.");
      return;
    }

    setSaving(true);
    setMensaje("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No hay sesión activa.");

      const res = await fetch("/api/auth/perfil", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo actualizar el perfil.");
      }

      setMensaje("✅ Perfil actualizado correctamente.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
      setMensaje("❌ " + (err.message || "No se pudo actualizar el perfil."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Cargando perfil...</p>;
  if (!form) return <p>No hay datos para mostrar.</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Editar Perfil</h1>
      <p className={styles.subtitle}>Actualiza tu información personal</p>

      <form className={styles.card} onSubmit={handleSubmit}>
        {/* FOTO DE PERFIL */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl || "/images/default_avatar.jpg"}
              alt="Foto de perfil"
              className={styles.avatarImage}
            />
          </div>

          <div className={styles.avatarDetails}>
            <h2 className={styles.avatarTitle}>Foto de Perfil</h2>
            <p className={styles.avatarHint}>
              Recomendamos una imagen cuadrada de al menos 400×400px. Formatos aceptados: JPG, PNG.
            </p>

            <div className={styles.avatarActions}>
              <button
                type="button"
                className={styles.changeBtn}
                onClick={() => document.getElementById("avatarFileInput").click()}
                disabled={saving}
              >
                Cambiar Imagen
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={handleDeleteAvatar}
                  disabled={saving}
                >
                  Eliminar
                </button>
              )}

              <input
                id="avatarFileInput"
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                style={{ display: "none" }}
                onChange={handleAvatarSelect}
              />
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              disabled={saving}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="apellido">Apellido</label>
            <input
              id="apellido"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              disabled={saving}
              required
            />
          </div>

          <div className={styles.fieldFull}>
            <label>Correo Electrónico</label>
            <input value={email} disabled className={styles.disabled} />
            <span className={styles.hint}>El correo no se puede modificar</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => router.push("/principal")}
            disabled={saving}
          >
            Cancelar
          </button>

          <button type="submit" className={styles.save} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>

        {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
      </form>
    </div>
  );
}
