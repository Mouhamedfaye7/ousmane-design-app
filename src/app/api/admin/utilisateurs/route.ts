import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'gerant', 'caissier', 'tailleur'];

const erreur = (message: string, status = 400) => NextResponse.json({ erreur: message }, { status });

function clientAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return null;
  return createClient(url, cle, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Vérifie que l'appelant est bien un administrateur actif (jeton de session envoyé par le navigateur)
async function verifierAdmin(req: NextRequest) {
  const sb = clientAdmin();
  if (!sb) return { erreur: erreur('Configuration serveur incomplète : SUPABASE_SERVICE_ROLE_KEY manquante.', 500) };

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return { erreur: erreur('Non authentifié.', 401) };

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { erreur: erreur('Session invalide.', 401) };

  const { data: profil } = await sb.from('profils').select('role, actif').eq('id', data.user.id).maybeSingle();
  if (!profil || profil.role !== 'admin' || !profil.actif) return { erreur: erreur('Accès réservé à l\'administrateur.', 403) };

  return { sb, userId: data.user.id };
}

export async function GET(req: NextRequest) {
  const ctx = await verifierAdmin(req);
  if (ctx.erreur) return ctx.erreur;
  const { data, error } = await ctx.sb!.from('profils').select('*').order('created_at', { ascending: true });
  if (error) return erreur(error.message, 500);
  return NextResponse.json({ utilisateurs: data });
}

export async function POST(req: NextRequest) {
  const ctx = await verifierAdmin(req);
  if (ctx.erreur) return ctx.erreur;
  const sb = ctx.sb!;

  const { email, motDePasse, nom, role } = await req.json();
  if (!email || !motDePasse || !role) return erreur('E-mail, mot de passe et rôle sont obligatoires.');
  if (!ROLES.includes(role)) return erreur('Rôle invalide.');
  if (String(motDePasse).length < 8) return erreur('Le mot de passe doit contenir au moins 8 caractères.');

  const { data: cree, error: errCreation } = await sb.auth.admin.createUser({
    email: String(email).trim(),
    password: motDePasse,
    email_confirm: true,
  });
  if (errCreation || !cree.user) return erreur(errCreation?.message || 'Création impossible.');

  const { error: errProfil } = await sb.from('profils').insert({
    id: cree.user.id,
    email: cree.user.email,
    nom: (nom || '').trim() || null,
    role,
    actif: true,
  });
  if (errProfil) {
    await sb.auth.admin.deleteUser(cree.user.id);
    return erreur(errProfil.message, 500);
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const ctx = await verifierAdmin(req);
  if (ctx.erreur) return ctx.erreur;
  const sb = ctx.sb!;

  const { id, nom, role, actif, motDePasse } = await req.json();
  if (!id) return erreur('Identifiant manquant.');

  // Empêche de se retirer soi-même les droits d'administrateur
  if (id === ctx.userId && ((role && role !== 'admin') || actif === false)) {
    return erreur("Vous ne pouvez pas retirer vos propres droits d'administrateur.");
  }

  const maj: Record<string, unknown> = {};
  if (typeof nom === 'string') maj.nom = nom.trim() || null;
  if (role) {
    if (!ROLES.includes(role)) return erreur('Rôle invalide.');
    maj.role = role;
  }
  if (typeof actif === 'boolean') maj.actif = actif;

  if (Object.keys(maj).length > 0) {
    const { error } = await sb.from('profils').update(maj).eq('id', id);
    if (error) return erreur(error.message, 500);
  }

  if (motDePasse) {
    if (String(motDePasse).length < 8) return erreur('Le mot de passe doit contenir au moins 8 caractères.');
    const { error } = await sb.auth.admin.updateUserById(id, { password: motDePasse });
    if (error) return erreur(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}
