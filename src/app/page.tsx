'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  ShoppingBag,
  Scissors,
  Layers,
  BookOpen,
  BarChart3,
  DollarSign,
  AlertCircle
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
  reste?: number;
  created_at?: string;
}

interface Vente {
  id?: string;
  client_nom?: string;
  mode_commande?: string;
  montant_total?: number;
  avance?: number;
  reste?: number;
  created_at?: string;
}

// Certains montants historiques sont stockés "en milliers" (ex: 65 au lieu de 65000).
// On applique la même règle de normalisation que sur les pages Ventes / Statistiques.
const normalizeAmount = (val: number | undefined | null) => {
  let num = Number(val) || 0;
  if (num > 0 && num < 1000) num = num * 1000;
  return num;
};

// Une vente issue du solde d'une commande sur-mesure (bouton "Solder une Commande")
// duplique volontairement les montants de la commande d'origine, pour la facturation.
// Il ne faut donc JAMAIS l'additionner en plus de la commande dans les totaux globaux,
// sous peine de double comptage. Seules les vraies ventes boutique / catalogue comptent ici.
const isVenteBoutique = (v: Vente) =>
  v.mode_commande !== 'Sur Mesure' && v.mode_commande !== 'Sur Mesure (Groupé)';

export default function Dashboard() {
  const [totalClients, setTotalClients] = useState<number>(0);
  const [enCoursCount, setEnCoursCount] = useState<number>(0);
  const [pretesCount, setPretesCount] = useState<number>(0);
  const [chiffreAffaires, setChiffreAffaires] = useState<number>(0);
  const [totalAvances, setTotalAvances] = useState<number>(0);
  const [totalReste, setTotalReste] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper : Alignement strict avec la page statistiques pour le calcul des finances (commandes)
  const getCalculatedFinancials = (c: Commande) => {
    const tot = Number(c.montant_total) || 0;
    let av = Number(c.avance) || 0;

    if (c.statut === 'Livrée') {
      av = tot; // Une commande livrée est totalement réglée
    }

    const reste = Math.max(0, tot - av);
    return { tot, av, reste };
  };

  useEffect(() => {
    async function loadDashboardStats() {
      setLoading(true);

      // On charge en parallèle les commandes sur-mesure ET les ventes boutique,
      // pour que le tableau de bord reflète la même réalité que la page Statistiques.
      const [{ data: commandes, error: errCmd }, { data: ventes, error: errVentes }] = await Promise.all([
        supabase.from('commandes').select('*'),
        supabase.from('ventes').select('*')
      ]);

      const cmds: Commande[] = !errCmd && commandes ? commandes : [];
      const vts: Vente[] = !errVentes && ventes ? ventes : [];
      // On ne garde que les ventes boutique / catalogue : les ventes "Sur Mesure" (solde
      // d'une commande) ne doivent pas être réadditionnées, la commande les compte déjà.
      const boutiqueVentes = vts.filter(isVenteBoutique);

      // Total des clients uniques (commandes sur-mesure + ventes, tous types confondus)
      const clientsUniques = new Set(
        [...cmds, ...vts]
          .map(c => (c.client_nom || '').trim().toLowerCase())
          .filter(Boolean)
      );
      setTotalClients(clientsUniques.size);

      // Commandes en cours atelier (Reçue / En Coupe) — propre aux commandes sur-mesure
      const enCours = cmds.filter(
        c => !c.statut || c.statut === 'Reçue' || c.statut === 'En Coupe'
      ).length;
      setEnCoursCount(enCours);

      // Commandes prêtes — propre aux commandes sur-mesure
      const pretes = cmds.filter(c => c.statut === 'Prête').length;
      setPretesCount(pretes);

      // Chiffre d'affaires : commandes sur-mesure + ventes boutique (hors soldes de commandes)
      const caCommandes = cmds.reduce((acc, c) => acc + (Number(c.montant_total) || 0), 0);
      const caVentes = boutiqueVentes.reduce((acc, v) => acc + normalizeAmount(v.montant_total), 0);
      setChiffreAffaires(caCommandes + caVentes);

      // Total encaissé : commandes (Livrée = totalement réglée) + ventes boutique
      const avCommandes = cmds.reduce((acc, c) => acc + getCalculatedFinancials(c).av, 0);
      const avVentes = boutiqueVentes.reduce((acc, v) => acc + normalizeAmount(v.avance), 0);
      setTotalAvances(avCommandes + avVentes);

      // Reste à recouvrer : commandes + ventes boutique
      const resteCommandes = cmds.reduce((acc, c) => acc + getCalculatedFinancials(c).reste, 0);
      const resteVentes = boutiqueVentes.reduce((acc, v) => {
        const tot = normalizeAmount(v.montant_total);
        const av = normalizeAmount(v.avance);
        const reste = v.reste !== undefined && v.reste !== null ? normalizeAmount(v.reste) : Math.max(0, tot - av);
        return acc + reste;
      }, 0);
      setTotalReste(resteCommandes + resteVentes);

      setLoading(false);
    }

    loadDashboardStats();
  }, []);

  const formatAmount = (val: number) => {
    return val.toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  };

  const kpis = [
    {
      label: 'Total Clients',
      value: loading ? '-' : String(totalClients),
      icon: Users,
      accent: '#6C8CD5',
      bg: '#EEF2FC'
    },
    {
      label: "En Cours d'Atelier",
      value: loading ? '-' : String(enCoursCount),
      icon: Clock,
      accent: '#C9A24B',
      bg: '#FBF3E2'
    },
    {
      label: 'Prêtes à Livrer',
      value: loading ? '-' : String(pretesCount),
      icon: CheckCircle2,
      accent: '#2F8F6F',
      bg: '#E8F5EF'
    },
    {
      label: "Chiffre d'Affaires",
      value: loading ? '-' : `${formatAmount(chiffreAffaires)} F`,
      icon: TrendingUp,
      accent: '#171B2E',
      bg: '#ECEDF3'
    },
    {
      label: 'Total Encaissé',
      value: loading ? '-' : `${formatAmount(totalAvances)} F`,
      icon: DollarSign,
      accent: '#2F8F6F',
      bg: '#E8F5EF'
    },
    {
      label: 'Reste à Recouvrer',
      value: loading ? '-' : `${formatAmount(totalReste)} F`,
      icon: AlertCircle,
      accent: '#B5502E',
      bg: '#FBEAE3'
    }
  ];

  const modules = [
    {
      href: '/ventes',
      icon: ShoppingBag,
      title: 'Ventes & Caisse Directe',
      desc: 'Enregistrement des ventes boutique, encaissement Wave / Espèces et facturation client.',
      accent: '#2F8F6F',
      bg: '#E8F5EF'
    },
    {
      href: '/clients',
      icon: Users,
      title: 'Gestion des Clients',
      desc: 'Répertoire client, numéros WhatsApp et carnet de mesures personnalisées.',
      accent: '#6C8CD5',
      bg: '#EEF2FC'
    },
    {
      href: '/commandes',
      icon: Scissors,
      title: "Suivi d'Atelier & Commandes",
      desc: 'Kanban de production, statuts de fabrication et notifications clients.',
      accent: '#C9A24B',
      bg: '#FBF3E2'
    },
    {
      href: '/stock',
      icon: Layers,
      title: 'Stock de Tissus',
      desc: 'Inventaire des étoffes (Gezner, Bazin, Soie), métrage disponible et valeur estimée.',
      accent: '#8B6BC9',
      bg: '#F1ECFB'
    },
    {
      href: '/catalogue',
      icon: BookOpen,
      title: 'Catalogue & Modèles',
      desc: "Galerie des modèles de l'atelier, grille tarifaire indicative et book photo client.",
      accent: '#B5502E',
      bg: '#FBEAE3'
    },
    {
      href: '/statistiques',
      icon: BarChart3,
      title: 'Statistiques & Revenus',
      desc: "Suivi des acomptes, chiffre d'affaires global et reste à recouvrer.",
      accent: '#171B2E',
      bg: '#ECEDF3'
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F6F1E4' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');

        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .font-mono-tape { font-family: 'Space Mono', ui-monospace, monospace; }

        .stitch-line {
          height: 1px;
          background-image: repeating-linear-gradient(
            to right,
            #C9A24B 0px,
            #C9A24B 8px,
            transparent 8px,
            transparent 16px
          );
        }

        .swatch-card {
          position: relative;
        }
        .swatch-card::before {
          content: '';
          position: absolute;
          top: 16px;
          left: 16px;
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          border: 2px solid #C9A24B;
          background: #F6F1E4;
          z-index: 2;
        }

        @keyframes riseIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rise-in {
          animation: riseIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .rise-in { animation: none !important; }
        }
      `}</style>

      {/* HERO - bandeau indigo facon tissu teint, fil dore */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: '#171B2E' }}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #C9A24B, transparent 70%)' }}
        />
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-24 md:pt-16 md:pb-28 relative">
          <div className="rise-in flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <p
                className="font-body text-[11px] font-bold tracking-[0.28em] uppercase mb-3"
                style={{ color: '#C9A24B' }}
              >
                Atelier de Haute Couture — Hann Maristes, Dakar
              </p>
              <h1
                className="font-display italic font-semibold leading-[0.95] tracking-tight"
                style={{ color: '#F6F1E4', fontSize: 'clamp(2.6rem, 6vw, 4.5rem)' }}
              >
                Ousmane Design
              </h1>
              <p
                className="font-body text-sm md:text-base mt-4 max-w-md"
                style={{ color: '#F6F1E4', opacity: 0.65 }}
              >
                Tableau de bord de l'atelier - chaque commande, chaque mesure,
                chaque paiement, cousu au fil pres.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/ventes"
                className="font-body font-bold text-sm px-5 py-3 rounded-full flex items-center gap-2 transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: '#C9A24B', color: '#171B2E', outlineColor: '#C9A24B' }}
              >
                <Plus size={17} strokeWidth={2.5} /> Nouvelle Vente
              </Link>
              <Link
                href="/commandes"
                className="font-body font-bold text-sm px-5 py-3 rounded-full flex items-center gap-2 border transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: 'rgba(246,241,228,0.35)', color: '#F6F1E4', outlineColor: '#C9A24B' }}
              >
                <Plus size={17} strokeWidth={2.5} /> Nouvelle Commande
              </Link>
            </div>
          </div>

          <div className="stitch-line mt-10" />
        </div>
      </div>

      {/* KPI - cartes ivoire qui remontent sur le bandeau indigo */}
      <div className="max-w-7xl mx-auto px-6 -mt-14 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rise-in bg-white p-5 rounded-2xl shadow-[0_10px_30px_-15px_rgba(23,27,46,0.25)] border border-black/5 flex flex-col gap-3"
                style={{ animationDelay: `${80 + i * 60}ms` }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: kpi.bg, color: kpi.accent }}
                >
                  <Icon size={17} />
                </div>
                <div>
                  <p
                    className="font-body text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: '#171B2E', opacity: 0.45 }}
                  >
                    {kpi.label}
                  </p>
                  <h2
                    className="font-mono-tape text-lg font-bold mt-1"
                    style={{ color: '#171B2E' }}
                  >
                    {kpi.value}
                  </h2>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODULES - fiches facon echantillons de tissu */}
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="rise-in" style={{ animationDelay: '260ms' }}>
          <p
            className="font-body text-[11px] font-bold tracking-[0.28em] uppercase mb-2"
            style={{ color: '#B5502E' }}
          >
            Modules
          </p>
          <h2
            className="font-display italic font-semibold text-2xl md:text-3xl"
            style={{ color: '#171B2E' }}
          >
            Piloter l'atelier, d'un seul point de vue
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {modules.map((m, i) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="swatch-card rise-in bg-white rounded-2xl border border-black/5 p-6 pt-7 shadow-[0_10px_30px_-18px_rgba(23,27,46,0.2)] hover:shadow-[0_18px_40px_-18px_rgba(23,27,46,0.3)] hover:-translate-y-1 transition-all group flex flex-col gap-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ animationDelay: `${320 + i * 70}ms`, outlineColor: '#C9A24B' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ backgroundColor: m.bg, color: m.accent }}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <h3
                    className="font-display font-semibold text-base"
                    style={{ color: '#171B2E' }}
                  >
                    {m.title}
                  </h3>
                  <p
                    className="font-body text-xs mt-1.5 leading-relaxed"
                    style={{ color: '#171B2E', opacity: 0.55 }}
                  >
                    {m.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
