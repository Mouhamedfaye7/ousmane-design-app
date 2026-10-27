'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Loader2,
  Scissors, Users, Package, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Tailleur {
  id: string;
  nom: string;
  telephone: string | null;
  specialite: string | null;
  taux_piece: number;
  taux_commission: number;
  actif: boolean;
  created_at: string;
}

interface CommandeLite {
  id: string;
  code_commande?: string;
  client_nom?: string;
  statut?: string;
  montant_total?: number;
  tailleur_id?: string | null;
  designation?: string;
}

const NAVY = '#1B3B6F';
const GOLD = '#C9A24B';
const ORANGE = '#C1502E';
const ROLES_AUTORISES = ['admin', 'gerant', 'tailleur'];

const fmt = (val: number) =>
  (Number(val) || 0).toLocaleString('fr-FR').replace(/\u00a0|\u202f/g, ' ');

const formVide = () => ({
  nom: '',
  telephone: '',
  specialite: '',
  taux_piece: '',
  taux_commission: '',
  actif: true,
});

export default function TailleursPage() {
  const [droits, setDroits] = useState<'verification' | 'ok' | 'refuse'>('verification');
  const [tailleurs, setTailleurs] = useState<Tailleur[]>([]);
  const [commandes, setCommandes] = useState<CommandeLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(formVide());

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
    const [tRes, cRes] = await Promise.all([
      supabase.from('tailleurs').select('*').order('nom'),
      supabase.from('commandes').select('id, code_commande, client_nom, statut, montant_total, tailleur_id, designation'),
    ]);
    if (tRes.error) setErreur(tRes.error.message);
    setTailleurs((tRes.data as Tailleur[]) || []);
    setCommandes((cRes.data as CommandeLite[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (droits === 'ok') charger();
  }, [droits, charger]);

  const chargeDe = (tailleurId: string) =>
    commandes.filter(c => c.tailleur_id === tailleurId && c.statut !== 'Livrée');

  const paieEstimee = (t: Tailleur) => {
    const cmds = chargeDe(t.id);
    const pieces = cmds.length;
    const ca = cmds.reduce((s, c) => s + (Number(c.montant_total) || 0), 0);
    const fixe = pieces * (Number(t.taux_piece) || 0);
    const commission = ca * ((Number(t.taux_commission) || 0) / 100);
    return { pieces, ca, total: fixe + commission };
  };

  const ouvrirAjout = () => {
    setEditingId(null);
    setForm(formVide());
    setShowModal(true);
  };

  const ouvrirEdition = (t: Tailleur) => {
    setEditingId(t.id);
    setForm({
      nom: t.nom,
      telephone: t.telephone || '',
      specialite: t.specialite || '',
      taux_piece: String(t.taux_piece || ''),
      taux_commission: String(t.taux_commission || ''),
      actif: t.actif,
    });
    setShowModal(true);
  };

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) { alert('Nom obligatoire'); return; }
    setSaving(true);
    const payload = {
      nom: form.nom.trim(),
      telephone: form.telephone || null,
      specialite: form.specialite || null,
      taux_piece: Number(form.taux_piece) || 0,
      taux_commission: Number(form.taux_commission) || 0,
      actif: form.actif,
    };
    if (editingId) {
      await supabase.from('tailleurs').update(payload).eq('id', editingId);
    } else {
      await supabase.from('tailleurs').insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    charger();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ce tailleur ?')) return;
    await supabase.from('tailleurs').delete().eq('id', id);
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F8FC' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .font-mono-tape { font-family: 'Space Mono', ui-monospace, monospace; }
      `}</style>

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
              <h1 className="font-display italic font-semibold text-2xl md:text-3xl text-white">
                Tailleurs & Production
              </h1>
              <p className="font-body text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Charge atelier, affectation et estimation de paie
              </p>
            </div>
            <button onClick={ouvrirAjout}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition hover:-translate-y-0.5"
              style={{ backgroundColor: GOLD, color: NAVY }}>
              <Plus size={15} /> Ajouter un tailleur
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 pb-16 relative z-10">
        {erreur && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-100">{erreur}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin" style={{ color: NAVY }} /></div>
        ) : tailleurs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-12 text-center text-slate-400">
            <Scissors size={40} className="mx-auto mb-3 opacity-40" />
            <p>Aucun tailleur enregistré</p>
            <button onClick={ouvrirAjout} className="mt-4 px-4 py-2 rounded-full font-bold text-sm" style={{ backgroundColor: GOLD, color: NAVY }}>
              Ajouter le premier
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tailleurs.map(t => {
              const charge = chargeDe(t.id);
              const paie = paieEstimee(t);
              return (
                <div key={t.id}
                  className={`bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-5 ${!t.actif ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#EAF1FB' }}>
                        <Scissors size={18} style={{ color: NAVY }} />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-base" style={{ color: NAVY }}>{t.nom}</h3>
                        {t.specialite && <p className="text-xs text-slate-400">{t.specialite}</p>}
                        {t.telephone && <p className="text-xs text-slate-500">{t.telephone}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => ouvrirEdition(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => supprimer(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {!t.actif && (
                    <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">INACTIF</span>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                      <Package size={14} className="mx-auto mb-1 text-slate-400" />
                      <p className="text-lg font-extrabold font-mono-tape" style={{ color: NAVY }}>{charge.length}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">En cours</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                      <Users size={14} className="mx-auto mb-1 text-slate-400" />
                      <p className="text-lg font-extrabold font-mono-tape" style={{ color: NAVY }}>{paie.pieces}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Pièces</p>
                    </div>
                    <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: '#FDF8ED' }}>
                      <p className="text-lg font-extrabold font-mono-tape" style={{ color: GOLD }}>{fmt(paie.total)}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Paie est.</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-2">
                    <p>Taux / pièce : <span className="font-semibold text-slate-700">{fmt(t.taux_piece)} F</span></p>
                    <p>Commission : <span className="font-semibold text-slate-700">{t.taux_commission}%</span></p>
                  </div>

                  {charge.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-28 overflow-y-auto">
                      {charge.slice(0, 5).map(c => (
                        <div key={c.id} className="flex justify-between text-[11px] bg-slate-50 rounded-lg px-2 py-1">
                          <span className="font-medium text-slate-700 truncate">{c.code_commande || c.client_nom}</span>
                          <span className="text-slate-400">{c.statut}</span>
                        </div>
                      ))}
                      {charge.length > 5 && (
                        <p className="text-[10px] text-slate-400 text-center">+{charge.length - 5} autres</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
              <X size={18} />
            </button>
            <h2 className="font-display font-semibold text-xl mb-5" style={{ color: NAVY }}>
              {editingId ? 'Modifier le tailleur' : 'Nouveau tailleur'}
            </h2>
            <form onSubmit={sauvegarder} className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold mb-1">Nom *</label>
                <input type="text" required value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Téléphone</label>
                  <input type="text" value={form.telephone}
                    onChange={e => setForm({ ...form, telephone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties} />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Spécialité</label>
                  <input type="text" value={form.specialite}
                    onChange={e => setForm({ ...form, specialite: e.target.value })}
                    placeholder="ex: Boubou, Costume..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Taux / pièce (F)</label>
                  <input type="text" value={form.taux_piece}
                    onChange={e => setForm({ ...form, taux_piece: e.target.value })}
                    placeholder="ex: 2000"
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none font-mono-tape"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties} />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Commission (%)</label>
                  <input type="text" value={form.taux_commission}
                    onChange={e => setForm({ ...form, taux_commission: e.target.value })}
                    placeholder="ex: 10"
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none font-mono-tape"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.actif}
                  onChange={e => setForm({ ...form, actif: e.target.checked })}
                  className="rounded" />
                <span className="font-semibold">Actif</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-200 text-slate-700 font-semibold">Annuler</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 rounded-full font-bold flex items-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: GOLD, color: NAVY }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingId ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
