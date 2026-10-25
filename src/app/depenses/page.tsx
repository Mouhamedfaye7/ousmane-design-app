'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Loader2, Wallet, PiggyBank,
  TrendingUp, ChevronLeft, ChevronRight, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { computeFinanceTotals, CommandeLike, VenteLike } from '@/lib/finance';

interface Depense {
  id: string;
  date_depense: string;
  categorie: string;
  description: string | null;
  montant: number;
  mode_paiement: string | null;
  fournisseur: string | null;
}

const NAVY = '#1B3B6F';
const GOLD = '#C9A24B';
const ORANGE = '#C1502E';

// Rôles autorisés (doivent correspondre aux règles SQL "depenses_admin_gerant")
const ROLES_AUTORISES = ['admin', 'gerant'];

const CATEGORIES = [
  { nom: 'Tissus & fournitures', couleur: '#1B3B6F' },
  { nom: 'Salaires & tailleurs', couleur: '#C9A24B' },
  { nom: 'Loyer & charges', couleur: '#C1502E' },
  { nom: 'Transport & livraison', couleur: '#0891b2' },
  { nom: 'Matériel & machines', couleur: '#7c3aed' },
  { nom: 'Marketing & communication', couleur: '#e11d48' },
  { nom: 'Achat d’articles boutique', couleur: '#059669' },
  { nom: 'Autres', couleur: '#64748b' },
];

const MODES = ['Espèces', 'Wave', 'Orange Money', 'Carte Bancaire', 'Virement Bancaire'];

const pad = (n: number) => String(n).padStart(2, '0');
const versDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const moisCourant = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const formVide = () => ({
  date_depense: versDate(new Date()),
  categorie: CATEGORIES[0].nom,
  description: '',
  montant: '',
  mode_paiement: 'Espèces',
  fournisseur: '',
});

const fmt = (val: number) =>
  (Number(val) || 0).toLocaleString('fr-FR').replace(/\u00a0|\u202f/g, ' ');

export default function DepensesPage() {
  const [droits, setDroits] = useState<'verification' | 'ok' | 'refuse'>('verification');
  const [mois, setMois] = useState(moisCourant());
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [commandes, setCommandes] = useState<CommandeLike[]>([]);
  const [ventes, setVentes] = useState<VenteLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtre, setFiltre] = useState('toutes');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(formVide());

  // Vérifie le rôle de l'utilisateur connecté
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDroits('refuse');
        return;
      }
      const { data } = await supabase.from('profils').select('role').eq('id', user.id).maybeSingle();
      setDroits(data && ROLES_AUTORISES.includes(data.role) ? 'ok' : 'refuse');
    })();
  }, []);

  // Bornes de la période choisie
  const [annee, numMois] = mois.split('-').map(Number);
  const debutDate = `${mois}-01`;
  const suivant = new Date(annee, numMois, 1);
  const finDate = versDate(suivant); // exclue
  const debutIso = new Date(annee, numMois - 1, 1).toISOString();
  const finIso = suivant.toISOString();
  const libelleMois = new Date(annee, numMois - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur('');
    const [dep, cmd, vte] = await Promise.all([
      supabase
        .from('depenses')
        .select('*')
        .gte('date_depense', debutDate)
        .lt('date_depense', finDate)
        .order('date_depense', { ascending: false }),
      supabase.from('commandes').select('*').gte('created_at', debutIso).lt('created_at', finIso),
      supabase.from('ventes').select('*').gte('created_at', debutIso).lt('created_at', finIso),
    ]);
    if (dep.error) setErreur(dep.error.message);
    setDepenses((dep.data as Depense[]) || []);
    setCommandes((cmd.data as CommandeLike[]) || []);
    setVentes((vte.data as VenteLike[]) || []);
    setLoading(false);
  }, [debutDate, finDate, debutIso, finIso]);

  useEffect(() => {
    if (droits === 'ok') charger();
  }, [droits, charger]);

  const decaler = (delta: number) => {
    const d = new Date(annee, numMois - 1 + delta, 1);
    setMois(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    setFiltre('toutes');
  };

  const ouvrirAjout = () => {
    setEditingId(null);
    setForm(formVide());
    setShowModal(true);
  };

  const ouvrirEdition = (d: Depense) => {
    setEditingId(d.id);
    setForm({
      date_depense: d.date_depense,
      categorie: d.categorie,
      description: d.description || '',
      montant: String(d.montant),
      mode_paiement: d.mode_paiement || 'Espèces',
      fournisseur: d.fournisseur || '',
    });
    setShowModal(true);
  };

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = Number(form.montant);
    if (!form.categorie || !(montant > 0)) {
      alert('Indiquez une catégorie et un montant supérieur à 0.');
      return;
    }
    setSaving(true);
    const payload = {
      date_depense: form.date_depense,
      categorie: form.categorie,
      description: form.description.trim() || null,
      montant,
      mode_paiement: form.mode_paiement,
      fournisseur: form.fournisseur.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from('depenses').update(payload).eq('id', editingId)
      : await supabase.from('depenses').insert([payload]);
    setSaving(false);
    if (error) {
      alert('Erreur : ' + error.message);
      return;
    }
    setShowModal(false);
    charger();
  };

  const supprimer = async (d: Depense) => {
    if (!confirm(`Supprimer la dépense « ${d.description || d.categorie} » de ${fmt(d.montant)} F ?`)) return;
    const { error } = await supabase.from('depenses').delete().eq('id', d.id);
    if (error) {
      alert('Erreur : ' + error.message);
      return;
    }
    charger();
  };

  // Calculs : mêmes règles que l'Accueil et les Statistiques (src/lib/finance.ts)
  const totaux = computeFinanceTotals(commandes, ventes);
  const totalDepenses = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const benefice = totaux.totalAvances - totalDepenses;
  const beneficePotentiel = totaux.caTotal - totalDepenses;
  const marge = totaux.caTotal > 0 ? Math.round((beneficePotentiel / totaux.caTotal) * 100) : 0;

  const parCategorie = CATEGORIES.map((c) => ({
    ...c,
    total: depenses.filter((d) => d.categorie === c.nom).reduce((s, d) => s + (Number(d.montant) || 0), 0),
  })).filter((c) => c.total > 0);
  const maxCategorie = Math.max(1, ...parCategorie.map((c) => c.total));

  const liste = depenses.filter((d) => filtre === 'toutes' || d.categorie === filtre);

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
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)` }}
        />
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-16 md:pb-20 relative">
          <Link
            href="/"
            className="font-body text-xs font-semibold flex items-center gap-1.5 mb-4 transition-opacity hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            <ArrowLeft size={14} /> Retour au tableau de bord
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <h1 className="font-display italic font-semibold text-2xl md:text-3xl" style={{ color: '#FFFFFF' }}>
                Dépenses & Bénéfice
              </h1>
              <p className="font-body text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Ousmane Design — Ce qui sort, ce qui reste
              </p>
            </div>

            {droits === 'ok' && (
              <button
                onClick={ouvrirAjout}
                className="font-body font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer shrink-0"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                <Plus size={15} /> Nouvelle dépense
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-10 pb-16 space-y-5 font-body">
        {droits === 'verification' && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 size={18} className="animate-spin" /> <span className="text-sm">Vérification de vos droits...</span>
          </div>
        )}

        {droits === 'refuse' && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-10 text-center">
            <ShieldAlert size={30} className="mx-auto mb-3" style={{ color: ORANGE }} />
            <p className="font-display font-semibold text-slate-900 text-lg">Accès réservé</p>
            <p className="text-sm text-slate-500 mt-1">
              Les dépenses sont visibles uniquement par les administrateurs et les gérants.
            </p>
          </div>
        )}

        {droits === 'ok' && (
          <>
            {/* SÉLECTEUR DE MOIS */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-4 flex items-center justify-between gap-3">
              <button
                onClick={() => decaler(-1)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Mois précédent"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <p className="font-display font-semibold text-slate-900 text-lg capitalize">{libelleMois}</p>
                <button
                  onClick={() => { setMois(moisCourant()); setFiltre('toutes'); }}
                  className="text-[11px] font-semibold cursor-pointer"
                  style={{ color: GOLD }}
                >
                  Revenir au mois en cours
                </button>
              </div>
              <button
                onClick={() => decaler(1)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Mois suivant"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {erreur && (
              <div className="rounded-2xl p-4 text-xs font-semibold" style={{ backgroundColor: '#FBEAE3', color: ORANGE }}>
                Erreur de lecture des dépenses : {erreur}. Si le message parle d'une table introuvable, la migration SQL
                n'a pas encore été exécutée.
              </div>
            )}

            {/* INDICATEURS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#EAF1FB', color: NAVY }}><TrendingUp size={17} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Chiffre d'affaires</p>
                  <p className="text-base font-extrabold font-mono-tape" style={{ color: NAVY }}>{fmt(totaux.caTotal)} F</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700"><Wallet size={17} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Encaissé</p>
                  <p className="text-base font-extrabold font-mono-tape text-emerald-700">{fmt(totaux.totalAvances)} F</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#FBEAE3', color: ORANGE }}><Wallet size={17} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Dépenses</p>
                  <p className="text-base font-extrabold font-mono-tape" style={{ color: ORANGE }}>{fmt(totalDepenses)} F</p>
                </div>
              </div>
              <div
                className="rounded-2xl shadow-[0_10px_30px_-15px_rgba(23,27,46,0.25)] p-4 flex items-center gap-3"
                style={{ backgroundColor: NAVY }}
              >
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: GOLD }}><PiggyBank size={17} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.65)' }}>Bénéfice net</p>
                  <p className="text-base font-extrabold font-mono-tape" style={{ color: benefice >= 0 ? '#FFFFFF' : '#FFB4A0' }}>
                    {benefice < 0 ? '−' : ''}{fmt(Math.abs(benefice))} F
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-4 text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Bénéfice net</strong> = encaissé − dépenses du mois.{' '}
              <strong className="text-slate-800">Bénéfice potentiel</strong> (si tous les restes sont payés) :{' '}
              <span className="font-mono-tape font-bold" style={{ color: beneficePotentiel >= 0 ? NAVY : ORANGE }}>
                {beneficePotentiel < 0 ? '−' : ''}{fmt(Math.abs(beneficePotentiel))} F
              </span>{' '}
              (marge {marge}%). Les ventes et commandes sont rattachées au mois où elles ont été créées.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* RÉPARTITION */}
              <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-5 space-y-3">
                <h2 className="font-display font-bold text-slate-900 text-sm">Répartition par catégorie</h2>
                {parCategorie.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune dépense ce mois-ci.</p>
                ) : (
                  parCategorie.map((c) => (
                    <button
                      key={c.nom}
                      onClick={() => setFiltre(filtre === c.nom ? 'toutes' : c.nom)}
                      className="w-full text-left cursor-pointer"
                      title="Cliquer pour filtrer la liste"
                    >
                      <div className="flex justify-between text-[11px] font-semibold mb-1">
                        <span className="text-slate-700" style={filtre === c.nom ? { color: NAVY, fontWeight: 800 } : undefined}>
                          {c.nom}
                        </span>
                        <span className="font-mono-tape text-slate-800">{fmt(c.total)} F</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(c.total / maxCategorie) * 100}%`, backgroundColor: c.couleur }}
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* LISTE */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-5">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <h2 className="font-display font-bold text-slate-900 text-sm">
                    Dépenses du mois {filtre !== 'toutes' && <span style={{ color: GOLD }}>— {filtre}</span>}
                  </h2>
                  {filtre !== 'toutes' && (
                    <button onClick={() => setFiltre('toutes')} className="text-[11px] font-semibold cursor-pointer" style={{ color: GOLD }}>
                      Voir toutes les catégories
                    </button>
                  )}
                </div>

                <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {loading ? (
                    <p className="p-6 text-center text-xs text-slate-400">Chargement...</p>
                  ) : liste.length === 0 ? (
                    <p className="p-6 text-center text-xs text-slate-400 italic">Aucune dépense à afficher.</p>
                  ) : (
                    liste.map((d) => (
                      <div key={d.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{d.description || d.categorie}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(d.date_depense + 'T00:00:00').toLocaleDateString('fr-FR')} · {d.categorie}
                            {d.fournisseur ? ` · ${d.fournisseur}` : ''} · {d.mode_paiement || 'Espèces'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-extrabold font-mono-tape mr-1" style={{ color: ORANGE }}>
                            {fmt(d.montant)} F
                          </span>
                          <button onClick={() => ouvrirEdition(d)} className="p-1.5 rounded-md hover:bg-slate-200/70 text-slate-400 cursor-pointer" title="Modifier">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => supprimer(d)} className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer" title="Supprimer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL AJOUT / MODIFICATION */}
      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 font-body">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <form onSubmit={enregistrer} className="space-y-4 text-xs text-slate-900">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.date_depense}
                    onChange={(e) => setForm({ ...form, date_depense: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none text-slate-900"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Montant (FCFA) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.montant}
                    onChange={(e) => setForm({ ...form, montant: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none font-bold font-mono-tape text-slate-900"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Catégorie *</label>
                <select
                  value={form.categorie}
                  onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 outline-none font-medium text-slate-900"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                >
                  {CATEGORIES.map((c) => <option key={c.nom} value={c.nom}>{c.nom}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Ex: 20 m de bazin riche, loyer d'octobre..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none text-slate-900"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Fournisseur / bénéficiaire</label>
                  <input
                    type="text"
                    value={form.fournisseur}
                    onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none text-slate-900"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Payé par</label>
                  <select
                    value={form.mode_paiement}
                    onChange={(e) => setForm({ ...form, mode_paiement: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 outline-none font-medium text-slate-900"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  >
                    {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-full bg-slate-200 text-slate-700 font-semibold cursor-pointer">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-full font-bold cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-60 flex items-center gap-2"
                  style={{ backgroundColor: GOLD, color: NAVY }}
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingId ? 'Enregistrer' : 'Ajouter la dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
