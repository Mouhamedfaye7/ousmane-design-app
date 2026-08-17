'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PieChart,
  FileDown,
  CalendarRange,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Commande {
  id?: string;
  code_commande?: string;
  client_nom?: string;
  statut?: string;
  designation?: string;
  montant_total?: number;
  avance?: number;
  acompte?: number;
  reste?: number;
  created_at?: string;
}

interface VenteRow {
  id?: string;
  client_nom?: string;
  mode_commande?: string;
  mode_paiement?: string;
  designation?: string;
  montant_total?: number;
  avance?: number;
  reste?: number;
  created_at?: string;
}

interface CatalogueItem {
  id?: string;
  nom: string;
  categorie?: string;
  prix?: number;
  quantite_stock?: number;
}

type PeriodKey = 'semaine' | 'mois' | 'semestre' | 'annee';

interface PeriodDef {
  key: PeriodKey;
  label: string;
  sublabel: string;
  days: number;
}

const PERIODS: PeriodDef[] = [
  { key: 'semaine', label: 'Hebdomadaire', sublabel: '7 derniers jours', days: 7 },
  { key: 'mois', label: 'Mensuel', sublabel: '30 derniers jours', days: 30 },
  { key: 'semestre', label: 'Semestriel', sublabel: '6 derniers mois', days: 182 },
  { key: 'annee', label: 'Annuel', sublabel: '12 derniers mois', days: 365 },
];

// Nombre de lignes de tableau par "bloc" capturé pour la génération PDF.
// Un bloc de cette taille tient toujours confortablement sur une page A4,
// ce qui évite qu'une ligne soit coupée entre deux pages.
const ROWS_PER_CHUNK = 18;

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export default function StatistiquesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [ventes, setVentes] = useState<VenteRow[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Bilan périodique téléchargeable
  const [bilanPeriod, setBilanPeriod] = useState<PeriodKey | null>(null);
  const bilanRef = useRef<HTMLDivElement>(null);

  const fetchStatsData = async () => {
    setLoading(true);
    const [cmdRes, venteRes, catRes] = await Promise.all([
      supabase.from('commandes').select('*').order('created_at', { ascending: false }),
      supabase.from('ventes').select('*').order('created_at', { ascending: false }),
      supabase.from('catalogue').select('*').order('nom', { ascending: true })
    ]);
    if (!cmdRes.error && cmdRes.data) setCommandes(cmdRes.data);
    if (!venteRes.error && venteRes.data) setVentes(venteRes.data);
    if (!catRes.error && catRes.data) setCatalogue(catRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatsData();
  }, []);

  const formatAmount = (val: number | undefined | null) => {
    return (Number(val) || 0).toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  };

  // Normalise les montants stockés en "milliers" (ex: 25 -> 25 000), même logique que la page Ventes
  const normalizeAmount = (val: number | undefined | null) => {
    let num = Number(val) || 0;
    if (num > 0 && num < 1000) num = num * 1000;
    return num;
  };

  // --- HELPER : CALCUL FINANCIER PRÉCIS (commandes sur-mesure) ---
  const getCalculatedFinancials = (c: Commande) => {
    const tot = Number(c.montant_total) || 0;
    let av = Number(c.avance ?? c.acompte) || 0;

    if (
      c.statut === 'Livrée' ||
      c.statut === 'Soldée' ||
      (c.reste !== undefined && Number(c.reste) === 0 && tot > 0)
    ) {
      av = tot;
    }

    const reste = c.reste !== undefined ? Math.max(0, Number(c.reste)) : Math.max(0, tot - av);
    return { tot, av, reste };
  };

  // Ventes boutique/catalogue NON liées à une commande sur-mesure soldée
  const ventesBoutique = ventes.filter(v => !(v.mode_commande || '').startsWith('Sur Mesure'));

  const getVenteFinancials = (v: VenteRow) => {
    const tot = normalizeAmount(v.montant_total);
    const av = normalizeAmount(v.avance);
    const reste = v.reste !== undefined ? Math.max(0, normalizeAmount(v.reste)) : Math.max(0, tot - av);
    return { tot, av, reste };
  };

  // --- CALCULS DYNAMIQUES EN TEMPS RÉEL (combinés commandes + ventes boutique) ---
  const totalCommandes = commandes.length;
  const totalVentesBoutique = ventesBoutique.length;

  const caCommandes = commandes.reduce((acc, c) => acc + (Number(c.montant_total) || 0), 0);
  const caBoutique = ventesBoutique.reduce((acc, v) => acc + getVenteFinancials(v).tot, 0);
  const caTotal = caCommandes + caBoutique;

  const avanceCommandes = commandes.reduce((acc, c) => acc + getCalculatedFinancials(c).av, 0);
  const avanceBoutique = ventesBoutique.reduce((acc, v) => acc + getVenteFinancials(v).av, 0);
  const totalAvances = avanceCommandes + avanceBoutique;

  const resteCommandes = commandes.reduce((acc, c) => acc + getCalculatedFinancials(c).reste, 0);
  const resteBoutique = ventesBoutique.reduce((acc, v) => acc + getVenteFinancials(v).reste, 0);
  const totalReste = resteCommandes + resteBoutique;

  const nbRecues = commandes.filter(c => (c.statut || 'Reçue') === 'Reçue').length;
  const nbEnCoupe = commandes.filter(c => c.statut === 'En Coupe').length;
  const nbPretes = commandes.filter(c => c.statut === 'Prête').length;
  const nbLivrees = commandes.filter(c => c.statut === 'Livrée' || c.statut === 'Soldée').length;

  const pctLivrees = totalCommandes > 0 ? Math.round((nbLivrees / totalCommandes) * 100) : 0;
  const pctEnCours = totalCommandes > 0 ? Math.round(((nbRecues + nbEnCoupe + nbPretes) / totalCommandes) * 100) : 0;

  // --- BILAN PÉRIODIQUE ---
  const getPeriodStartDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

  const filterByPeriod = <T extends { created_at?: string }>(list: T[], days: number): T[] => {
    const start = getPeriodStartDate(days);
    return list.filter(item => item.created_at && new Date(item.created_at) >= start);
  };

  const activePeriodDef = PERIODS.find(p => p.key === bilanPeriod) || PERIODS[1];
  const bilanCommandes = filterByPeriod(commandes, activePeriodDef.days);
  const bilanVentesBoutique = filterByPeriod(ventesBoutique, activePeriodDef.days);

  const bilanCaCommandes = bilanCommandes.reduce((acc, c) => acc + (Number(c.montant_total) || 0), 0);
  const bilanCaBoutique = bilanVentesBoutique.reduce((acc, v) => acc + getVenteFinancials(v).tot, 0);
  const bilanCaTotal = bilanCaCommandes + bilanCaBoutique;

  const bilanAvanceCommandes = bilanCommandes.reduce((acc, c) => acc + getCalculatedFinancials(c).av, 0);
  const bilanAvanceBoutique = bilanVentesBoutique.reduce((acc, v) => acc + getVenteFinancials(v).av, 0);
  const bilanAvanceTotal = bilanAvanceCommandes + bilanAvanceBoutique;

  const bilanResteCommandes = bilanCommandes.reduce((acc, c) => acc + getCalculatedFinancials(c).reste, 0);
  const bilanResteBoutique = bilanVentesBoutique.reduce((acc, v) => acc + getVenteFinancials(v).reste, 0);
  const bilanResteTotal = bilanResteCommandes + bilanResteBoutique;

  const inventoryTotalStock = catalogue.reduce((acc, item) => acc + (Number(item.quantite_stock) || 0), 0);
  const inventoryTotalValue = catalogue.reduce(
    (acc, item) => acc + (Number(item.prix) || 0) * (Number(item.quantite_stock) || 0),
    0
  );

  // Compteurs rapides par période (affichés sous chaque bouton, avant génération)
  const getQuickCounts = (days: number) => {
    const cmds = filterByPeriod(commandes, days);
    const vts = filterByPeriod(ventesBoutique, days);
    const ca = cmds.reduce((acc, c) => acc + (Number(c.montant_total) || 0), 0) +
      vts.reduce((acc, v) => acc + getVenteFinancials(v).tot, 0);
    return { count: cmds.length + vts.length, ca };
  };

  // --- GÉNÉRATION DU PDF DE BILAN (par blocs, pour ne jamais couper une ligne) ---
  const downloadBilanPDF = async () => {
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
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      // Cas extrême : un bloc individuel est plus grand qu'une page entière.
      // On le découpe alors classiquement, mais ceci n'arrive jamais en pratique
      // puisque chaque bloc est limité à ROWS_PER_CHUNK lignes.
      if (imgHeight > usableHeight) {
        if (cursorY !== margin) {
          pdf.addPage();
        }
        let heightLeft = imgHeight;
        let position = margin;
        pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
        heightLeft -= usableHeight;
        while (heightLeft > 0) {
          pdf.addPage();
          position = margin - (imgHeight - heightLeft);
          pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
          heightLeft -= usableHeight;
        }
        cursorY = pageHeight; // force le bloc suivant à démarrer une nouvelle page
        continue;
      }

      // Cas normal : si le bloc ne tient pas dans l'espace restant, nouvelle page.
      if (cursorY + imgHeight > pageHeight - margin) {
        pdf.addPage();
        cursorY = margin;
      }

      pdf.addImage(imgData, 'JPEG', margin, cursorY, usableWidth, imgHeight);
      cursorY += imgHeight + gap;
    }

    const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    pdf.save(`Bilan_${activePeriodDef.label}_OusmaneDesign_${dateStr}.pdf`);
  };

  const handleDownloadBilan = (period: PeriodKey) => {
    setBilanPeriod(period);
  };

  useEffect(() => {
    if (!bilanPeriod) return;
    const timer = setTimeout(async () => {
      try {
        await downloadBilanPDF();
      } catch (err) {
        console.error('Erreur génération du bilan PDF :', err);
        alert('Erreur lors de la génération du bilan PDF. Veuillez réessayer.');
      }
      setBilanPeriod(null);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilanPeriod]);

  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const dateDebutPeriode = getPeriodStartDate(activePeriodDef.days).toLocaleDateString('fr-FR');
  const dateFinPeriode = new Date().toLocaleDateString('fr-FR');

  const commandesChunks = chunkArray(bilanCommandes, ROWS_PER_CHUNK);
  const ventesChunks = chunkArray(bilanVentesBoutique, ROWS_PER_CHUNK);
  const catalogueChunks = chunkArray(catalogue, ROWS_PER_CHUNK);

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2 font-semibold">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Rapport Statistique & Performance</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Analyse financière et suivi de la production</p>
        </div>

        <button
          onClick={fetchStatsData}
          disabled={loading}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer self-start md:self-auto text-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Actualiser les données</span>
        </button>
      </div>

      {/* KPI METRICS (INDICATEURS CLÉS) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Chiffre d'Affaires Total</p>
            <h2 className="text-xl font-bold text-slate-900">{formatAmount(caTotal)} FCFA</h2>
            <p className="text-xs text-slate-400 mt-1">{totalCommandes} commande(s) + {totalVentesBoutique} vente(s) boutique</p>
          </div>
          <div className="bg-amber-100 text-amber-700 p-3 rounded-lg">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Encaissements / Avances</p>
            <h2 className="text-xl font-bold text-emerald-600">{formatAmount(totalAvances)} FCFA</h2>
            <p className="text-xs text-emerald-600/80 mt-1 font-semibold">
              {caTotal > 0 ? Math.round((totalAvances / caTotal) * 100) : 0}% du total encaissé
            </p>
          </div>
          <div className="bg-emerald-100 text-emerald-700 p-3 rounded-lg">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reste à Recouvrer</p>
            <h2 className="text-xl font-bold text-rose-600">{formatAmount(totalReste)} FCFA</h2>
            <p className="text-xs text-rose-600/80 mt-1 font-semibold">Créances clients en attente</p>
          </div>
          <div className="bg-rose-100 text-rose-700 p-3 rounded-lg">
            <AlertCircle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Commandes Livrées</p>
            <h2 className="text-xl font-bold text-slate-900">{nbLivrees} / {totalCommandes}</h2>
            <p className="text-xs text-blue-600 mt-1 font-semibold">{pctLivrees}% de taux de finalisation</p>
          </div>
          <div className="bg-blue-100 text-blue-700 p-3 rounded-lg">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* SECTION RÉPARTITION PAR STATUT ET FINANCES */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* STATUT DE PRODUCTION */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <PieChart size={18} className="text-amber-600" /> État de la Production
            </h2>
            <span className="text-xs font-semibold text-slate-500">{totalCommandes} au total</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-slate-600">Reçues ({nbRecues})</span>
                <span className="text-slate-800">{totalCommandes > 0 ? Math.round((nbRecues/totalCommandes)*100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full transition-all duration-500" style={{ width: `${totalCommandes > 0 ? (nbRecues/totalCommandes)*100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-amber-700">En Coupe ({nbEnCoupe})</span>
                <span className="text-amber-700">{totalCommandes > 0 ? Math.round((nbEnCoupe/totalCommandes)*100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalCommandes > 0 ? (nbEnCoupe/totalCommandes)*100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-blue-700">Prêtes ({nbPretes})</span>
                <span className="text-blue-700">{totalCommandes > 0 ? Math.round((nbPretes/totalCommandes)*100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalCommandes > 0 ? (nbPretes/totalCommandes)*100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold">
                <span className="text-emerald-700">Livrées ({nbLivrees})</span>
                <span className="text-emerald-700">{totalCommandes > 0 ? Math.round((nbLivrees/totalCommandes)*100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalCommandes > 0 ? (nbLivrees/totalCommandes)*100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* RÉCAPITULATIF FINANCIER DÉTAILLÉ */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-600" /> Bilan Financier de l'Atelier
              </h2>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Temps Réel
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Valeur globale (commandes + boutique)</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{formatAmount(caTotal)} F</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <p className="text-xs text-emerald-700 font-medium">Total Perçu (Encaissements)</p>
                <p className="text-lg font-bold text-emerald-700 mt-1">{formatAmount(totalAvances)} F</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-800 font-medium">Solde restant à encaisser</p>
                <p className="text-lg font-bold text-amber-800 mt-1">{formatAmount(totalReste)} F</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Taux de réalisation de l'Atelier (commandes sur-mesure) :</p>
              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${pctLivrees}%` }} title={`Livrées: ${pctLivrees}%`}></div>
                <div className="bg-amber-400 h-full" style={{ width: `${pctEnCours}%` }} title={`En cours: ${pctEnCours}%`}></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-medium">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Livrées ({pctLivrees}%)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> En cours de fabrication ({pctEnCours}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION BILAN PÉRIODIQUE TÉLÉCHARGEABLE */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-2xs p-6 mb-6">
        <div className="flex justify-between items-center mb-1">
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <CalendarRange size={18} className="text-amber-600" /> Bilan Périodique Téléchargeable
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Génère un PDF complet : chiffre d'affaires, encaissements, détail des commandes, des ventes boutique et l'inventaire actuel du catalogue.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PERIODS.map((p) => {
            const quick = getQuickCounts(p.days);
            const isGenerating = bilanPeriod === p.key;
            return (
              <div key={p.key} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{p.label}</h3>
                  <p className="text-[11px] text-slate-500">{p.sublabel}</p>
                  <p className="text-xs text-slate-600 mt-2">
                    {quick.count} mouvement(s) · <strong className="text-slate-800">{formatAmount(quick.ca)} F</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadBilan(p.key)}
                  disabled={bilanPeriod !== null}
                  className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Génération...
                    </>
                  ) : (
                    <>
                      <FileDown size={14} /> Télécharger PDF
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABLEAU DES DERNIÈRES COMMANDES SYNCHRONISÉES */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Clock size={18} className="text-amber-600" /> Historique Dynamique des Commandes
          </h2>
          <span className="text-xs text-slate-400">{commandes.slice(0, 10).length} dernières entrées</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="p-3">Code</th>
                <th className="p-3">Client</th>
                <th className="p-3">Article</th>
                <th className="p-3">Statut Fabrication</th>
                <th className="p-3 text-right">Montant Total</th>
                <th className="p-3 text-right">Réglé / Avance</th>
                <th className="p-3 text-right">Reste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">Chargement des statistiques...</td>
                </tr>
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">Aucune commande enregistrée pour le moment.</td>
                </tr>
              ) : (
                commandes.slice(0, 10).map((c) => {
                  const { tot, av, reste } = getCalculatedFinancials(c);

                  let badgeColor = "bg-slate-100 text-slate-700 border-slate-300";
                  if (c.statut === 'En Coupe') badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
                  if (c.statut === 'Prête') badgeColor = "bg-blue-100 text-blue-800 border-blue-300";
                  if (c.statut === 'Livrée' || c.statut === 'Soldée') badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-semibold text-slate-700">{c.code_commande || '-'}</td>
                      <td className="p-3 font-bold text-slate-900">{c.client_nom || 'Anonyme'}</td>
                      <td className="p-3 text-slate-600">{c.designation || 'Commande sur mesure'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${badgeColor}`}>
                          {c.statut || 'Reçue'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-800">{formatAmount(tot)} F</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{formatAmount(av)} F</td>
                      <td className="p-3 text-right font-bold text-amber-700">{formatAmount(reste)} F</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONTENU CACHÉ POUR GÉNÉRATION DU PDF DE BILAN (capturé bloc par bloc) */}
      <div
        ref={bilanRef}
        className="fixed top-0 left-[-10000px] w-[800px] bg-white text-slate-900 font-sans space-y-3"
      >
        {/* Bloc En-tête + KPI de la période */}
        <div className="pdf-block bg-white p-6 space-y-4">
          <div className="flex justify-between items-start border-b-2 border-amber-900/20 pb-4">
            <div>
              <h1 className="text-2xl font-serif font-extrabold text-amber-900 tracking-wide">Ousmane Design</h1>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Création & Couture Contemporaine</p>
              <p className="text-xs text-slate-600 mt-1">Hann Maristes, Dakar, Sénégal · 77 646 21 02 / 70 348 26 82</p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-amber-900 text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider">
                Bilan {activePeriodDef.label}
              </span>
              <p className="text-xs font-semibold text-slate-500 mt-2">Période : {dateDebutPeriode} au {dateFinPeriode}</p>
              <p className="text-[10px] text-slate-400">Généré le {dateGeneration}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-slate-500 font-medium">Chiffre d'Affaires</p>
              <p className="text-base font-bold text-slate-900 mt-1">{formatAmount(bilanCaTotal)} F</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <p className="text-emerald-700 font-medium">Total Encaissé</p>
              <p className="text-base font-bold text-emerald-700 mt-1">{formatAmount(bilanAvanceTotal)} F</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <p className="text-amber-800 font-medium">Reste à Recouvrer</p>
              <p className="text-base font-bold text-amber-800 mt-1">{formatAmount(bilanResteTotal)} F</p>
            </div>
          </div>
        </div>

        {/* Blocs Commandes de la période */}
        {commandesChunks.length === 0 ? (
          <div className="pdf-block bg-white p-6">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
              Commandes Sur-Mesure de la Période (0)
            </h2>
            <p className="text-[10px] text-slate-400 italic">Aucune commande sur cette période.</p>
          </div>
        ) : (
          commandesChunks.map((chunk, idx) => (
            <div key={`cmd-chunk-${idx}`} className="pdf-block bg-white p-6">
              {idx === 0 && (
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
                  Commandes Sur-Mesure de la Période ({bilanCommandes.length})
                </h2>
              )}
              <table className="w-full text-left text-[10px]">
                <thead className="bg-amber-900 text-white font-bold uppercase">
                  <tr>
                    <th className="p-1.5">Code</th>
                    <th className="p-1.5">Client</th>
                    <th className="p-1.5">Article</th>
                    <th className="p-1.5">Statut</th>
                    <th className="p-1.5 text-right">Total</th>
                    <th className="p-1.5 text-right">Avance</th>
                    <th className="p-1.5 text-right">Reste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chunk.map((c) => {
                    const { tot, av, reste } = getCalculatedFinancials(c);
                    return (
                      <tr key={c.id}>
                        <td className="p-1.5 font-mono">{c.code_commande || '-'}</td>
                        <td className="p-1.5 font-semibold">{c.client_nom || 'Anonyme'}</td>
                        <td className="p-1.5">{c.designation || '-'}</td>
                        <td className="p-1.5">{c.statut || 'Reçue'}</td>
                        <td className="p-1.5 text-right">{formatAmount(tot)} F</td>
                        <td className="p-1.5 text-right text-emerald-700">{formatAmount(av)} F</td>
                        <td className="p-1.5 text-right text-amber-700">{formatAmount(reste)} F</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}

        {/* Blocs Ventes Boutique de la période */}
        {ventesChunks.length === 0 ? (
          <div className="pdf-block bg-white p-6">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
              Ventes Boutique & Catalogue de la Période (0)
            </h2>
            <p className="text-[10px] text-slate-400 italic">Aucune vente boutique sur cette période.</p>
          </div>
        ) : (
          ventesChunks.map((chunk, idx) => (
            <div key={`vte-chunk-${idx}`} className="pdf-block bg-white p-6">
              {idx === 0 && (
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
                  Ventes Boutique & Catalogue de la Période ({bilanVentesBoutique.length})
                </h2>
              )}
              <table className="w-full text-left text-[10px]">
                <thead className="bg-amber-900 text-white font-bold uppercase">
                  <tr>
                    <th className="p-1.5">Client</th>
                    <th className="p-1.5">Désignation</th>
                    <th className="p-1.5">Paiement</th>
                    <th className="p-1.5 text-right">Total</th>
                    <th className="p-1.5 text-right">Réglé</th>
                    <th className="p-1.5 text-right">Reste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chunk.map((v) => {
                    const { tot, av, reste } = getVenteFinancials(v);
                    return (
                      <tr key={v.id}>
                        <td className="p-1.5 font-semibold">{v.client_nom || 'Client'}</td>
                        <td className="p-1.5">{v.designation || '-'}</td>
                        <td className="p-1.5">{v.mode_paiement || 'Espèces'}</td>
                        <td className="p-1.5 text-right">{formatAmount(tot)} F</td>
                        <td className="p-1.5 text-right text-emerald-700">{formatAmount(av)} F</td>
                        <td className="p-1.5 text-right text-amber-700">{formatAmount(reste)} F</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}

        {/* Blocs Inventaire du Catalogue (état actuel) */}
        {catalogueChunks.length === 0 ? (
          <div className="pdf-block bg-white p-6">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
              Inventaire du Catalogue — État Actuel (0)
            </h2>
            <p className="text-[10px] text-slate-400 italic">Aucun article dans le catalogue.</p>
          </div>
        ) : (
          catalogueChunks.map((chunk, idx) => (
            <div key={`cat-chunk-${idx}`} className="pdf-block bg-white p-6">
              {idx === 0 && (
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
                  Inventaire du Catalogue — État Actuel ({catalogue.length} article(s), {inventoryTotalStock} unité(s))
                </h2>
              )}
              <table className="w-full text-left text-[10px]">
                <thead className="bg-amber-900 text-white font-bold uppercase">
                  <tr>
                    <th className="p-1.5">Article</th>
                    <th className="p-1.5">Catégorie</th>
                    <th className="p-1.5 text-right">Prix Unitaire</th>
                    <th className="p-1.5 text-right">Stock</th>
                    <th className="p-1.5 text-right">Valeur Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chunk.map((item) => (
                    <tr key={item.id}>
                      <td className="p-1.5 font-semibold">{item.nom}</td>
                      <td className="p-1.5">{item.categorie || '-'}</td>
                      <td className="p-1.5 text-right">{formatAmount(item.prix)} F</td>
                      <td className="p-1.5 text-right">{item.quantite_stock ?? 0}</td>
                      <td className="p-1.5 text-right font-semibold">{formatAmount((Number(item.prix) || 0) * (Number(item.quantite_stock) || 0))} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}

        {/* Bloc Total du stock */}
        {catalogueChunks.length > 0 && (
          <div className="pdf-block bg-white p-6">
            <div className="flex justify-end items-center gap-3 text-xs font-bold pt-2 border-t-2 border-amber-900/20">
              <span className="text-slate-700">Valeur totale du stock :</span>
              <span className="text-amber-800">{formatAmount(inventoryTotalValue)} F</span>
            </div>
          </div>
        )}

        {/* Bloc Pied de page */}
        <div className="pdf-block bg-white p-6">
          <div className="text-[9px] text-slate-400 text-center pt-2 border-t border-slate-200">
            Document généré automatiquement par l'outil de gestion Ousmane Design — {dateGeneration}
          </div>
        </div>
      </div>
    </div>
  );
}
