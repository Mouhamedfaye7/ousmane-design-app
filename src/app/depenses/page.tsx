'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Loader2, Wallet, PiggyBank,
  TrendingUp, ChevronLeft, ChevronRight, ShieldAlert, FileDown, BarChart3
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
  { nom: "Achat d'articles boutique", couleur: '#059669' },
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

// Courbe lissée (identique à la page Catalogue)
const courbeLissee = (pts: { x: number; y: number }[]): string => {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

export default function DepensesPage() {
  const [droits, setDroits] = useState<'verification' | 'ok' | 'refuse'>('verification');
  const [mois, setMois] = useState(moisCourant());
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [depensesHisto, setDepensesHisto] = useState<Depense[]>([]);
  const [commandes, setCommandes] = useState<CommandeLike[]>([]);
  const [ventes, setVentes] = useState<VenteLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtre, setFiltre] = useState('toutes');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(formVide());
  const [pdfLoading, setPdfLoading] = useState(false);

  const bilanRef = useRef<HTMLDivElement>(null);

  // Vérifie le rôle de l'utilisateur connecté
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDroits('refuse');
        return;
      }
      const { data: profil } = await supabase
        .from('profils')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (profil && ROLES_AUTORISES.includes(profil.role)) {
        setDroits('ok');
      } else {
        setDroits('refuse');
      }
    })();
  }, []);

  // Bornes du mois sélectionné
  const [anneeMois, numMois] = mois.split('-').map(Number);
  const debutDate = `${mois}-01`;
  const finDateObj = new Date(anneeMois, numMois, 1);
  const finDate = versDate(finDateObj);
  const debutIso = new Date(anneeMois, numMois - 1, 1).toISOString();
  const finIso = finDateObj.toISOString();

  const moisLabel = new Date(anneeMois, numMois - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur('');

    // Date il y a 12 mois (pour la courbe)
    const ilYa12 = new Date();
    ilYa12.setMonth(ilYa12.getMonth() - 11);
    ilYa12.setDate(1);
    const debutHisto = versDate(ilYa12);

    const [dep, depHisto, cmd, vte] = await Promise.all([
      supabase
        .from('depenses')
        .select('*')
        .gte('date_depense', debutDate)
        .lt('date_depense', finDate)
        .order('date_depense', { ascending: false }),
      supabase
        .from('depenses')
        .select('*')
        .gte('date_depense', debutHisto)
        .order('date_depense', { ascending: true }),
      supabase.from('commandes').select('*').gte('created_at', debutIso).lt('created_at', finIso),
      supabase.from('ventes').select('*').gte('created_at', debutIso).lt('created_at', finIso),
    ]);

    if (dep.error) setErreur(dep.error.message);
    setDepenses((dep.data as Depense[]) || []);
    setDepensesHisto((depHisto.data as Depense[]) || []);
    setCommandes((cmd.data as CommandeLike[]) || []);
    setVentes((vte.data as VenteLike[]) || []);
    setLoading(false);
  }, [debutDate, finDate, debutIso, finIso]);

  useEffect(() => {
    if (droits === 'ok') charger();
  }, [droits, charger]);

  const changerMois = (delta: number) => {
    const d = new Date(anneeMois, numMois - 1 + delta, 1);
    setMois(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };

  // Calculs financiers (source unique = finance.ts)
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

  // ========== COURBE D'ÉVOLUTION (12 derniers mois) ==========
  const buckets: { label: string; debut: string; fin: string; total: number }[] = [];
  const auj = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(auj.getFullYear(), auj.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const debut = `${y}-${pad(m)}-01`;
    const finObj = new Date(y, m, 1);
    const fin = versDate(finObj);
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    const total = depensesHisto
      .filter((dep) => dep.date_depense >= debut && dep.date_depense < fin)
      .reduce((s, dep) => s + (Number(dep.montant) || 0), 0);
    buckets.push({ label, debut, fin, total });
  }
  const maxEvolution = Math.max(1, ...buckets.map((b) => b.total));

  // ========== PDF ==========
  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const Filigrane = ({ size = 58 }: { size?: number }) => (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <span
        className="font-display italic font-bold whitespace-nowrap"
        style={{ fontSize: `${size}px`, color: NAVY, opacity: 0.05, transform: 'rotate(-32deg)' }}
      >
        Ousmane Design
      </span>
    </div>
  );

  const downloadRapportPDF = async () => {
    setPdfLoading(true);
    try {
      const { default: html2canvas } = await import('html2canvas-pro');
      const { default: jsPDF } = await import('jspdf');
      const container = bilanRef.current;
      if (!container) return;

      const blocks = Array.from(container.querySelectorAll<HTMLElement>('.pdf-block'));
      if (blocks.length === 0) return;

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const gap = 3;

      let cursorY = margin;

      for (const block of blocks) {
        const canvas = await html2canvas(block, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        if (cursorY + imgHeight > margin + usableHeight && cursorY > margin) {
          pdf.addPage();
          cursorY = margin;
        }

        let finalHeight = imgHeight;
        if (finalHeight > usableHeight) {
          finalHeight = usableHeight;
        }

        pdf.addImage(imgData, 'JPEG', margin, cursorY, usableWidth, finalHeight);
        cursorY += finalHeight + gap;
      }

      pdf.save(`Rapport_Depenses_${mois}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // ========== CRUD ==========
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

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = Number(String(form.montant).replace(/\s/g, '').replace(',', '.'));
    if (!montant || montant <= 0) {
      alert('Montant invalide');
      return;
    }
    setSaving(true);
    const payload = {
      date_depense: form.date_depense,
      categorie: form.categorie,
      description: form.description || null,
      montant,
      mode_paiement: form.mode_paiement,
      fournisseur: form.fournisseur || null,
    };
    if (editingId) {
      await supabase.from('depenses').update(payload).eq('id', editingId);
    } else {
      await supabase.from('depenses').insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    charger();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    await supabase.from('depenses').delete().eq('id', id);
    charger();
  };

  // ========== RENDU ==========
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
        <p className="text-slate-500">Seuls les administrateurs et gérants peuvent accéder aux dépenses.</p>
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
              <p className="font-body text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Suivi des sorties, bénéfice net et marge
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Sélecteur de mois */}
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                <button onClick={() => changerMois(-1)} className="p-1 rounded-full hover:bg-white/20 transition">
                  <ChevronLeft size={16} color="#fff" />
                </button>
                <span className="font-body text-sm font-semibold capitalize text-white min-w-[120px] text-center">
                  {moisLabel}
                </span>
                <button onClick={() => changerMois(1)} className="p-1 rounded-full hover:bg-white/20 transition">
                  <ChevronRight size={16} color="#fff" />
                </button>
              </div>

              <button
                onClick={downloadRapportPDF}
                disabled={pdfLoading || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition hover:-translate-y-0.5 disabled:opacity-60"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                {pdfLoading ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                Rapport PDF
              </button>

              <button
                onClick={ouvrirAjout}
                className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition hover:-translate-y-0.5"
                style={{ backgroundColor: '#fff', color: NAVY }}
              >
                <Plus size={15} /> Ajouter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div className="max-w-7xl mx-auto px-6 -mt-10 pb-16 relative z-10">
        {erreur && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-100">
            {erreur}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: NAVY }} />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#EAF1FB', color: NAVY }}><TrendingUp size={17} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Chiffre d&apos;affaires</p>
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
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#FDE8E4', color: ORANGE }}><PiggyBank size={17} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Dépenses</p>
                  <p className="text-base font-extrabold font-mono-tape" style={{ color: ORANGE }}>{fmt(totalDepenses)} F</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: benefice >= 0 ? '#E2F2EA' : '#FDE8E4', color: benefice >= 0 ? '#2E7D5B' : ORANGE }}>
                  <TrendingUp size={17} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Bénéfice net</p>
                  <p className="text-base font-extrabold font-mono-tape" style={{ color: benefice >= 0 ? '#2E7D5B' : ORANGE }}>
                    {fmt(benefice)} F
                  </p>
                  <p className="text-[10px] text-slate-400">Marge {marge}%</p>
                </div>
              </div>
            </div>

            {/* COURBE D'ÉVOLUTION */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} style={{ color: NAVY }} />
                <h2 className="font-display font-semibold text-lg" style={{ color: NAVY }}>
                  Évolution des dépenses (12 derniers mois)
                </h2>
              </div>

              <div className="w-full overflow-x-auto">
                <svg viewBox="0 0 720 220" className="w-full h-auto min-w-[600px]">
                  {/* Grille horizontale */}
                  {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                    const y = 180 - t * 150;
                    return (
                      <g key={t}>
                        <line x1="40" y1={y} x2="700" y2={y} stroke="#e2e8f0" strokeWidth="1" />
                        <text x="35" y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                          {fmt(Math.round(maxEvolution * t))}
                        </text>
                      </g>
                    );
                  })}

                  {/* Courbe + points */}
                  {(() => {
                    const pts = buckets.map((b, i) => ({
                      x: 40 + (i / Math.max(1, buckets.length - 1)) * 660,
                      y: 180 - (b.total / maxEvolution) * 150,
                    }));
                    const path = courbeLissee(pts);
                    return (
                      <>
                        <path d={path} fill="none" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" />
                        {pts.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="4" fill={ORANGE} stroke="#fff" strokeWidth="2" />
                            <text x={p.x} y="205" textAnchor="middle" fontSize="10" fill="#64748b">
                              {buckets[i].label}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* RÉPARTITION + LISTE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Par catégorie */}
              <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-5">
                <h2 className="font-display font-semibold text-lg mb-4" style={{ color: NAVY }}>
                  Par catégorie
                </h2>
                {parCategorie.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucune dépense ce mois-ci</p>
                ) : (
                  <div className="space-y-3">
                    {parCategorie.map((c) => (
                      <div key={c.nom}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{c.nom}</span>
                          <span className="font-mono-tape font-bold" style={{ color: c.couleur }}>
                            {fmt(c.total)} F
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(c.total / maxCategorie) * 100}%`, backgroundColor: c.couleur }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Liste des dépenses */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-15px_rgba(23,27,46,0.15)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="font-display font-semibold text-lg" style={{ color: NAVY }}>
                    Dépenses du mois
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFiltre('toutes')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                        filtre === 'toutes' ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      style={filtre === 'toutes' ? { backgroundColor: NAVY } : {}}
                    >
                      Toutes
                    </button>
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.nom}
                        onClick={() => setFiltre(c.nom)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                          filtre === c.nom ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        style={filtre === c.nom ? { backgroundColor: c.couleur } : {}}
                      >
                        {c.nom.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {liste.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">Aucune dépense pour ce filtre</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b">
                          <th className="pb-2 font-semibold">Date</th>
                          <th className="pb-2 font-semibold">Catégorie</th>
                          <th className="pb-2 font-semibold">Description</th>
                          <th className="pb-2 font-semibold text-right">Montant</th>
                          <th className="pb-2 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liste.map((d) => (
                          <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="py-2.5 text-slate-600 whitespace-nowrap">
                              {new Date(d.date_depense + 'T12:00:00').toLocaleDateString('fr-FR')}
                            </td>
                            <td className="py-2.5">
                              <span
                                className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                                style={{
                                  backgroundColor:
                                    CATEGORIES.find((c) => c.nom === d.categorie)?.couleur || '#64748b',
                                }}
                              >
                                {d.categorie}
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-700 max-w-[200px] truncate">
                              {d.description || '—'}
                              {d.fournisseur && (
                                <span className="block text-[11px] text-slate-400">{d.fournisseur}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-right font-mono-tape font-bold" style={{ color: ORANGE }}>
                              {fmt(d.montant)} F
                            </td>
                            <td className="py-2.5">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => ouvrirEdition(d)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => supprimer(d.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========== CONTENU CACHÉ POUR LE PDF ========== */}
      <div
        ref={bilanRef}
        className="fixed top-0 left-[-10000px] w-[800px] bg-white text-slate-900 font-sans space-y-3"
      >
        {/* Bloc 1 : En-tête */}
        <div className="pdf-block relative overflow-hidden">
          <Filigrane size={50} />
          <div className="relative px-8 pt-8 pb-6" style={{ backgroundColor: NAVY, zIndex: 1 }}>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="font-display italic font-semibold text-3xl" style={{ color: '#FFFFFF' }}>
                  Ousmane Design
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5" style={{ color: GOLD }}>
                  Rapport des dépenses
                </p>
              </div>
              <div className="text-right">
                <p className="text-white text-sm font-semibold capitalize">{moisLabel}</p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Généré le {dateGeneration}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bloc 2 : Synthèse */}
        <div className="pdf-block relative px-8 py-5">
          <Filigrane size={40} />
          <div className="relative z-10">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: NAVY }}>
              Synthèse financière
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 border" style={{ borderColor: '#E2E8F0' }}>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Chiffre d&apos;affaires</p>
                <p className="text-lg font-extrabold font-mono-tape" style={{ color: NAVY }}>{fmt(totaux.caTotal)} F</p>
              </div>
              <div className="rounded-xl p-3 border" style={{ borderColor: '#E2E8F0' }}>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Encaissé</p>
                <p className="text-lg font-extrabold font-mono-tape text-emerald-700">{fmt(totaux.totalAvances)} F</p>
              </div>
              <div className="rounded-xl p-3 border" style={{ borderColor: '#E2E8F0' }}>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Total dépenses</p>
                <p className="text-lg font-extrabold font-mono-tape" style={{ color: ORANGE }}>{fmt(totalDepenses)} F</p>
              </div>
              <div className="rounded-xl p-3 border" style={{ borderColor: '#E2E8F0' }}>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Bénéfice net</p>
                <p className="text-lg font-extrabold font-mono-tape" style={{ color: benefice >= 0 ? '#2E7D5B' : ORANGE }}>
                  {fmt(benefice)} F <span className="text-xs font-normal">({marge}%)</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bloc 3 : Répartition par catégorie */}
        {parCategorie.length > 0 && (
          <div className="pdf-block relative px-8 py-5">
            <Filigrane size={40} />
            <div className="relative z-10">
              <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: NAVY }}>
                Répartition par catégorie
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-400 border-b">
                    <th className="pb-1.5">Catégorie</th>
                    <th className="pb-1.5 text-right">Montant</th>
                    <th className="pb-1.5 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {parCategorie.map((c) => (
                    <tr key={c.nom} className="border-b border-slate-100">
                      <td className="py-1.5 font-medium">{c.nom}</td>
                      <td className="py-1.5 text-right font-mono-tape font-bold">{fmt(c.total)} F</td>
                      <td className="py-1.5 text-right text-slate-500">
                        {totalDepenses > 0 ? Math.round((c.total / totalDepenses) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bloc 4 : Liste détaillée */}
        <div className="pdf-block relative px-8 py-5">
          <Filigrane size={40} />
          <div className="relative z-10">
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: NAVY }}>
              Détail des dépenses ({liste.length})
            </h2>
            {liste.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune dépense enregistrée ce mois-ci.</p>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-[9px] uppercase text-slate-400 border-b">
                    <th className="pb-1">Date</th>
                    <th className="pb-1">Catégorie</th>
                    <th className="pb-1">Description</th>
                    <th className="pb-1">Mode</th>
                    <th className="pb-1 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((d) => (
                    <tr key={d.id} className="border-b border-slate-50">
                      <td className="py-1 whitespace-nowrap">
                        {new Date(d.date_depense + 'T12:00:00').toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-1">{d.categorie}</td>
                      <td className="py-1 max-w-[180px] truncate">
                        {d.description || '—'}
                        {d.fournisseur ? ` (${d.fournisseur})` : ''}
                      </td>
                      <td className="py-1">{d.mode_paiement || '—'}</td>
                      <td className="py-1 text-right font-mono-tape font-bold">{fmt(d.montant)} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bloc 5 : Cachet + Signature */}
        <div className="pdf-block relative px-8 py-6">
          <Filigrane size={40} />
          <div className="relative z-10">
            <div className="flex flex-col items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold text-center border-t pt-4" style={{ borderColor: '#E2E8F0' }}>
              <div className="relative h-24 flex items-center justify-center mb-1">
                <img
                  src="/cachet-od.png"
                  alt="Cachet Ousmane Design"
                  className="absolute h-24 w-24 object-contain opacity-90"
                  style={{ left: '50%', transform: 'translateX(-60%) rotate(-6deg)' }}
                />
                <img
                  src="/signature.png"
                  alt="Signature Ousmane Design"
                  className="relative h-16 object-contain"
                  style={{ transform: 'translateX(25%)' }}
                />
              </div>
              Ousmane Design (Signature & Cachet)
            </div>

            <p className="text-[9px] text-slate-400 text-center pt-4 mt-4 border-t border-slate-200">
              Document généré automatiquement par l&apos;outil de gestion Ousmane Design — {dateGeneration}
            </p>
          </div>
        </div>
      </div>

      {/* MODAL AJOUT / ÉDITION */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X size={18} />
            </button>
            <h2 className="font-display font-semibold text-xl mb-5" style={{ color: NAVY }}>
              {editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}
            </h2>
            <form onSubmit={sauvegarder} className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold mb-1">Date</label>
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
                <label className="block font-semibold mb-1">Catégorie</label>
                <select
                  value={form.categorie}
                  onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 outline-none font-medium text-slate-900"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.nom} value={c.nom}>{c.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Montant (FCFA)</label>
                <input
                  type="text"
                  required
                  value={form.montant}
                  onChange={(e) => setForm({ ...form, montant: e.target.value })}
                  placeholder="ex: 25000"
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 outline-none text-slate-900 font-mono-tape"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <input
                  type="text"
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
