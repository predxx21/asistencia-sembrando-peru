import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/authServer';
import {
  obtenerNotificacionesPorUsuario,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from '@/lib/db/notificacion';

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { notificaciones, unreadCount, error } = await obtenerNotificacionesPorUsuario(user.id);

  if (error) {
    return NextResponse.json({ error: 'Error al obtener notificaciones.' }, { status: 500 });
  }

  return NextResponse.json({ data: notificaciones, unreadCount });
}

export async function PATCH(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { id, todo } = body;

  if (todo) {
    await marcarTodasLeidas(user.id);
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: 'Id de notificación requerido.' }, { status: 400 });
  }

  await marcarNotificacionLeida(id, user.id);
  return NextResponse.json({ success: true });
}
