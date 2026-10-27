'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Wallet, Plus, X, Trash2,
  Banknote, Smartphone, CreditCard, Building2, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Paiement {
  id: string;
  commande_id: string | null;
  vente_id: string | null;
  montant: number;
  moyen_paiement: string;
  recu_par: string | null;
  date_paiement: string;
  notes: string | null;
  created_at: string;
  // jointure optionnelle
  commandes?: { code_commande?: string; client_nom?: string } | null;
}

const NAVY = '#1B3B6F';
const GOLD = '#C9A24B';
const ORANGE = '#C1502E';

const ROLES_AUTORISES = ['admin', 'gerant', 'caissier'];

const MODES = [
  { nom: 'Espèces', icon: Banknote, couleur: '#059669' },
  { nom: 'Wave', icon: Smartphone, couleur: '#1B3B6F' },
  { nom: 'Orange Money', icon: Smartphone, couleur: '#ea580c' },
  { nom: 'Carte Bancaire', icon: CreditCard, couleur: '#7c3aed' },
  { nom: 'Virement Bancaire', icon: Building2, couleur: '#0891b2' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const versDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmt = (val: number) =>
  (Number(val) || 0).toLocaleString('fr-FR').replace(/\u00a0|\u202f/g, ' ');

export default function CaissePage() {
  const [droits, setDroits] = useState<'verification' | 'ok' | 'refuse'>('verification');
  const [dateJour, setDateJour] = useState(versDate(new Date()));
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    montant: '',
    moyen_paiement: 'Espèces',
    recu_par: '',
    notes: '',
    commande_code: '',
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setDroits('refuse'); return; }
      const { data: profil } = await supabase
        .from('profils').select('role').eq('id', session.user.id).single();
      if (profil && ROLES_AUTORISES.includes(profil.role)) setDroits('ok');
      else setDroits('refuse');
    })();
  }, []);

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur('');
    const { data, error } = await supabase
      .from('paiements')
      .select('*, commandes(code_commande, client_nom)')
      .gte('date_paiement', dateJour + 'T00:00:00')
      .lt('date_paiement', dateJour + 'T23:59:59')
      .order('created_at', { ascending: false });
    if (error) setErreur(error.message);
    setPaiements((data as Paiement[]) || []);
    setLoading(false);
  }, [dateJour]);

  useEffect(() => {
    if (droits === 'ok') charger();
  }, [droits, charger]);

  const totalJour = paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const parMode = MODES.map(m => ({
    ...m,
    total: paiements
      .filter(p => p.moyen_paiement === m.nom)
      .reduce((s, p) => s + (Number(p.montant) || 0), 0),
  }));

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = Number(String(form.montant).replace(/\s/g, '').replace(',', '.'));
    if (!montant || montant <= 0) { alert('Montant invalide'); return; }
    setSaving(true);

    let commande_id: string | null = null;
    if (form.commande_code.trim()) {
      const { data: cmd } = await supabase
        .from('commandes')
        .select('id')
        .eq('code_commande', form.commande_code.trim())
        .maybeSingle();
      if (cmd) commande_id = cmd.id;
    }

    const { error } = await supabase.from('paiements').insert({
      montant,
      moyen_paiement: form.moyen_paiement,
      recu_par: form.recu_par || null,
      notes: form.notes || null,
      date_paiement: new Date(dateJour + 'T12:00:00').toISOString(),
      commande_id,
    });

    setSaving(false);
    if (error) { alert(error.message); return; }
    setShowModal(false);
    setForm({ montant: '', moyen_paiement: 'Espèces', recu_par: '', notes: '', commande_code: '' });
    charger();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ce paiement ?')) return;
    await supabase.from('paiements').delete().eq('id', id);
    charger();
  };

  if (droits === 'verification') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: NAVY }}>
        <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (droits === 'refuse') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#F5F8FC' }}>
        <ShieldAlert size={48} style={{ color: ORANGE }} />
        <h1 className="text-xl font-bold" style={{ color: NAVY }}>Accès refusé</h1>
        <Link href="/" className="px-5 py-2 rounded-full font-bold" style={{ backgroundColor: GOLD, color: NAVY }}>
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const dateLabel = new Date(dateJour + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F8FC' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .font-mono-tape { font-family: 'Space Mono', ui-monospace, monospace; }
      `}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden" style={{ backgroundColor: NAVY }}>
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }} />
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-16 md:pb-20 relative">
          <Link href="/" className="font-body text-xs font-semibold flex items-center gap-1.5 mb-4 transition-opacity hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.75)' }}>
            <ArrowLeft size={14} /> Retour au tableau de bord
          </Link>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <h1 className="font-display italic font-semibold text-2xl md:text-3xl" style={{ color: '#FFFFFF' }}>
                Caisse & Paiements
              </h1>
              <p className="font-body text-sm mt-1 capitalize" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {dateLabel}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={dateJour}
                onChange={e => setDateJour(e.target.value)}
                className="px-3 py-2 rounded-full text-sm font-medium border-0 outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
              />
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition hover:-translate-y-0.5"
                style={{ backgroundColor: GOLD, color: NAVY }}>
                <Plus size={15} /> Encaisser
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 pb-16 relative z-10">
        {erreur && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-100">{erreur}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin" style={{ color: NAVY }} /></div>
        ) : (
          <>
            {/* Total du jour */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#EAF1FB' }}>
                  <Wallet size={22} style={{ color: NAVY }} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total encaissé du jour</p>
                  <p className="text-2xl font-extrabold font-mono-tape" style={{ color: NAVY }}>{fmt(totalJour)} F</p>
                </div>
              </div>
              <p className="text-sm text-slate-500">{paiements.length} paiement{paiements.length > 1 ? 's' : ''}</p>
            </div>

            {/* Par mode */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {parMode.map(m => {
                const Icon = m.icon;
                return (
                  <div key={m.nom} className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.12)] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={16} style={{ color: m.couleur }} />
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{m.nom}</span>
                    </div>
                    <p className="text-lg font-extrabold font-mono-tape" style={{ color: m.couleur }}>{fmt(m.total)} F</p>
                  </div>
                );
              })}
            </div>

            {/* Liste */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-5">
              <h2 className="font-display font-semibold text-lg mb-4" style={{ color: NAVY }}>Journal des paiements</h2>
              {paiements.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">Aucun paiement enregistré pour cette date</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b">
                        <th className="pb-2 font-semibold">Heure</th>
                        <th className="pb-2 font-semibold">Mode</th>
                        <th className="pb-2 font-semibold">Montant</th>
                        <th className="pb-2 font-semibold">Commande / Client</th>
                        <th className="pb-2 font-semibold">Reçu par</th>
                        <th className="pb-2 font-semibold">Notes</th>
                        <th className="pb-2 font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paiements.map(p => (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-500 whitespace-nowrap">
                            {new Date(p.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                              style={{ backgroundColor: MODES.find(m => m.nom === p.moyen_paiement)?.couleur || '#64748b' }}>
                              {p.moyen_paiement}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono-tape font-bold" style={{ color: NAVY }}>{fmt(p.montant)} F</td>
                          <td className="py-2.5 text-slate-700">
                            {p.commandes?.code_commande ? (
                              <span>
                                <span className="font-semibold">{p.commandes.code_commande}</span>
                                {p.commandes.client_nom && <span className="text-slate-400"> — {p.commandes.client_nom}</span>}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-2.5 text-slate-600">{p.recu_par || '—'}</td>
                          <td className="py-2.5 text-slate-500 max-w-[140px] truncate">{p.notes || '—'}</td>
                          <td className="py-2.5">
                            <button onClick={() => supprimer(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
              <X size={18} />
            </button>
            <h2 className="font-display font-semibold text-xl mb-5" style={{ color: NAVY }}>Enregistrer un paiement</h2>
            <form onSubmit={sauvegarder} className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold mb-1">Montant (FCFA)</label>
                <input type="text" required value={form.montant}
                  onChange={e => setForm({ ...form, montant: e.target.value })}
                  placeholder="ex: 25000"
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none font-mono-tape"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Mode de paiement</label>
                <select value={form.moyen_paiement}
                  onChange={e => setForm({ ...form, moyen_paiement: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 outline-none font-medium"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}>
                  {MODES.map(m => <option key={m.nom} value={m.nom}>{m.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Code commande (optionnel)</label>
                <input type="text" value={form.commande_code}
                  onChange={e => setForm({ ...form, commande_code: e.target.value })}
                  placeholder="ex: CMD-817293"
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reçu par</label>
                <input type="text" value={form.recu_par}
                  onChange={e => setForm({ ...form, recu_par: e.target.value })}
                  placeholder="Nom du caissier / vendeur"
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Notes</label>
                <input type="text" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-200 text-slate-700 font-semibold">Annuler</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 rounded-full font-bold flex items-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: GOLD, color: NAVY }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
