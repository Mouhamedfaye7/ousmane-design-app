'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, KeyRound, Loader2, X, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth, ROLE_LABELS } from '@/components/AuthProvider';
import type { Role } from '@/components/AuthProvider';

interface Utilisateur {
  id: string;
  email: string | null;
  nom: string | null;
  role: Role;
  actif: boolean;
}

const NAVY = '#1B3B6F';
const GOLD = '#C9A24B';
const ORANGE = '#C1502E';

const ROLES: Role[] = ['admin', 'gerant', 'caissier', 'tailleur'];

const DROITS: Record<Role, string> = {
  admin: 'Tous les droits, gestion des utilisateurs',
  gerant: 'Tous les modules sauf la gestion des utilisateurs',
  caissier: 'Ventes et factures uniquement',
  tailleur: 'Consultation et saisie des mesures clients uniquement',
};

export default function UtilisateursPage() {
  const { profil } = useAuth();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);

  const [modal, setModal] = useState<null | { type: 'creation' } | { type: 'motdepasse'; user: Utilisateur }>(null);
  const [fNom, setFNom] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fMotDePasse, setFMotDePasse] = useState('');
  const [fRole, setFRole] = useState<Role>('tailleur');

  const appeler = async (methode: string, corps?: object) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch('/api/admin/utilisateurs', {
      method: methode,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const texte = await res.text();
    let json: any = {};
    try { json = JSON.parse(texte); } catch { /* reponse non JSON */ }
    if (!res.ok) throw new Error(json.erreur || `Erreur serveur (code ${res.status}) : ${texte.slice(0, 160)}`);
    return json;
  };

  const charger = async () => {
    setLoading(true);
    try {
      const json = await appeler('GET');
      setUtilisateurs(json.utilisateurs || []);
    } catch (err: any) {
      setMessage(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ouvrirCreation = () => {
    setFNom(''); setFEmail(''); setFMotDePasse(''); setFRole('tailleur'); setMessage('');
    setModal({ type: 'creation' });
  };

  const creer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnCours(true); setMessage('');
    try {
      await appeler('POST', { nom: fNom, email: fEmail, motDePasse: fMotDePasse, role: fRole });
      setModal(null);
      await charger();
    } catch (err: any) {
      setMessage(err.message);
    }
    setEnCours(false);
  };

  const modifier = async (id: string, champs: object) => {
    setMessage('');
    try {
      await appeler('PATCH', { id, ...champs });
      await charger();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const reinitialiserMotDePasse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal || modal.type !== 'motdepasse') return;
    setEnCours(true); setMessage('');
    try {
      await appeler('PATCH', { id: modal.user.id, motDePasse: fMotDePasse });
      setModal(null);
    } catch (err: any) {
      setMessage(err.message);
    }
    setEnCours(false);
  };

  return (
    <div className="min-h-screen font-body" style={{ backgroundColor: '#F5F8FC' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700;800&display=swap');
        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      `}</style>

      <div className="relative overflow-hidden" style={{ backgroundColor: NAVY }}>
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}
        />
        <div className="max-w-5xl mx-auto px-6 pt-8 pb-16 md:pb-20 relative">
          <Link href="/" className="text-xs font-semibold flex items-center gap-1.5 mb-4 hover:opacity-80" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <ArrowLeft size={14} /> Retour au tableau de bord
          </Link>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <h1 className="font-display italic font-semibold text-2xl md:text-3xl" style={{ color: '#FFFFFF' }}>
                Utilisateurs & Accès
              </h1>
              <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Ousmane Design — Comptes des postes de travail et droits d'accès
              </p>
            </div>
            <button
              onClick={ouvrirCreation}
              className="font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 shrink-0"
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              <UserPlus size={15} /> Nouvel utilisateur
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-10 relative z-10 pb-16 space-y-5">
        {message && (
          <p className="text-xs font-semibold rounded-xl px-4 py-3" style={{ backgroundColor: '#FBEAE3', color: ORANGE }}>
            {message}
          </p>
        )}

        <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.25)] p-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#EAF1FB' }}>
                <th className="p-3 font-bold uppercase" style={{ color: NAVY }}>Nom</th>
                <th className="p-3 font-bold uppercase" style={{ color: NAVY }}>E-mail</th>
                <th className="p-3 font-bold uppercase" style={{ color: NAVY }}>Profil</th>
                <th className="p-3 font-bold uppercase" style={{ color: NAVY }}>Statut</th>
                <th className="p-3 font-bold uppercase text-center" style={{ color: NAVY }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-6 text-slate-400"><Loader2 size={16} className="animate-spin inline" /> Chargement...</td></tr>
              ) : utilisateurs.map((u) => {
                const estMoi = u.id === profil?.id;
                return (
                  <tr key={u.id} className="hover:bg-[#EAF1FB]/40">
                    <td className="p-3 font-semibold text-slate-900">{u.nom || '-'}{estMoi && <span className="ml-1.5 text-[10px] font-bold" style={{ color: GOLD }}>(vous)</span>}</td>
                    <td className="p-3 text-slate-600">{u.email}</td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        disabled={estMoi}
                        onChange={(e) => modifier(u.id, { role: e.target.value })}
                        className="text-xs font-semibold border border-slate-200 rounded-full px-2.5 py-1 bg-white outline-none disabled:opacity-60 cursor-pointer"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <button
                        disabled={estMoi}
                        onClick={() => modifier(u.id, { actif: !u.actif })}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full disabled:opacity-60 cursor-pointer"
                        style={u.actif ? { backgroundColor: '#ECFDF5', color: '#047857' } : { backgroundColor: '#FBEAE3', color: ORANGE }}
                        title={u.actif ? 'Cliquer pour désactiver' : 'Cliquer pour réactiver'}
                      >
                        {u.actif ? 'Actif' : 'Désactivé'}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => { setFMotDePasse(''); setMessage(''); setModal({ type: 'motdepasse', user: u }); }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full border cursor-pointer"
                        style={{ borderColor: `${NAVY}33`, color: NAVY }}
                      >
                        <KeyRound size={12} /> Mot de passe
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2 mb-3" style={{ color: NAVY }}>
            <ShieldCheck size={16} style={{ color: GOLD }} /> Droits par profil
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <div key={r} className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <p className="font-bold text-slate-800">{ROLE_LABELS[r]}</p>
                <p className="text-slate-500 mt-0.5">{DROITS[r]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <div onClick={() => setModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="font-display font-semibold text-base" style={{ color: NAVY }}>
                {modal.type === 'creation' ? 'Nouvel utilisateur' : `Mot de passe de ${modal.user.nom || modal.user.email}`}
              </h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>

            {message && <p className="text-xs font-semibold rounded-lg px-3 py-2" style={{ backgroundColor: '#FBEAE3', color: ORANGE }}>{message}</p>}

            {modal.type === 'creation' ? (
              <form onSubmit={creer} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom complet</label>
                  <input value={fNom} onChange={(e) => setFNom(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Adresse e-mail (identifiant de connexion) *</label>
                  <input type="email" required value={fEmail} onChange={(e) => setFEmail(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mot de passe (8 caractères minimum) *</label>
                  <input type="password" required minLength={8} value={fMotDePasse} onChange={(e) => setFMotDePasse(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Profil *</label>
                  <select value={fRole} onChange={(e) => setFRole(e.target.value as Role)} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white">
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">{DROITS[fRole]}</p>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-full bg-slate-200 font-bold cursor-pointer">Annuler</button>
                  <button type="submit" disabled={enCours} className="px-4 py-2 rounded-full font-bold cursor-pointer disabled:opacity-60 flex items-center gap-1.5" style={{ backgroundColor: GOLD, color: NAVY }}>
                    {enCours && <Loader2 size={13} className="animate-spin" />} Créer le compte
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={reinitialiserMotDePasse} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nouveau mot de passe (8 caractères minimum)</label>
                  <input type="password" required minLength={8} value={fMotDePasse} onChange={(e) => setFMotDePasse(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-full bg-slate-200 font-bold cursor-pointer">Annuler</button>
                  <button type="submit" disabled={enCours} className="px-4 py-2 rounded-full font-bold cursor-pointer disabled:opacity-60 flex items-center gap-1.5" style={{ backgroundColor: GOLD, color: NAVY }}>
                    {enCours && <Loader2 size={13} className="animate-spin" />} Enregistrer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
