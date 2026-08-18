import { prisma } from './client';

export async function crearNotificacion({ profileId, registroId, titulo, mensaje, tipo }) {
  try {
    const notificacion = await prisma.notificacion.create({
      data: {
        profileId,
        registroId: registroId ? Number(registroId) : null,
        titulo,
        mensaje,
        tipo,
      },
    });
    return { notificacion, error: null };
  } catch (error) {
    console.error('Error en crearNotificacion:', error);
    return { notificacion: null, error };
  }
}

export async function obtenerNotificacionesPorUsuario(profileId, limit = 20) {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { profileId },
      orderBy: { fecha: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.notificacion.count({
      where: { profileId, leida: false },
    });

    return { notificaciones, unreadCount, error: null };
  } catch (error) {
    console.error('Error en obtenerNotificacionesPorUsuario:', error);
    return { notificaciones: [], unreadCount: 0, error };
  }
}

export async function marcarNotificacionLeida(id, profileId) {
  try {
    const notificacion = await prisma.notificacion.updateMany({
      where: { id: Number(id), profileId },
      data: { leida: true },
    });
    return { notificacion, error: null };
  } catch (error) {
    console.error('Error en marcarNotificacionLeida:', error);
    return { notificacion: null, error };
  }
}

export async function marcarTodasLeidas(profileId) {
  try {
    await prisma.notificacion.updateMany({
      where: { profileId, leida: false },
      data: { leida: true },
    });
    return { success: true, error: null };
  } catch (error) {
    console.error('Error en marcarTodasLeidas:', error);
    return { success: false, error };
  }
}
