'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Scissors, 
  Layers, 
  BarChart3, 
  ShoppingBag,
  ChevronRight, 
  Plus, 
  Clock, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    commandesEnCours: 0,
    commandesPretes: 0,
    chiffreAffaires: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(false);
      const { count: countClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      const { data: commandes } = await supabase
        .from('commandes')
        .select('statut, prix_total');

      if (commandes) {
        const enCours = commandes.filter(
          (c) => c.statut !== 'Livrée' && c.statut !== 'Prête'
        ).length;
        const pretes = commandes.filter((c) => c.statut === 'Prête').length;
        const totalCA = commandes.reduce((acc, c) => acc + (c.prix_total || 0), 0);

        setStats({
          totalClients: countClients || 0,
          commandesEnCours: enCours,
          commandesPretes: pretes,
          chiffreAffaires: totalCA,
        });
      }
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      title: 'Ventes & Caisse Directe',
      description: 'Enregistrement des ventes boutique, encaissements Wave/Espèces et imprimerie de tickets.',
      icon: ShoppingBag,
      href: '/ventes',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Gestion des Clients',
      description: 'Répertoire client, numéros WhatsApp et mesures personnelles.',
      icon: Users,
      href: '/clients',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Suivi d\'Atelier & Commandes',
      description: 'Kanban de production, statuts, notifications WhatsApp et reçus.',
      icon: Scissors,
      href: '/commandes',
      color: 'bg-amber-50 text-[#b8860b]',
    },
    {
      title: 'Stock de Tissus',
      description: 'Inventaire des tissus, suivi du métrage et valeur estimée.',
      icon: Layers,
      href: '/stock',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Statistiques & Revenus',
      description: 'Suivi du chiffre d\'affaires, acomptes encaissés et reste à recouvrer.',
      icon: BarChart3,
      href: '/statistiques',
      color: 'bg-slate-100 text-slate-800',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* En-tête avec actions rapides */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">OUSMANE DESIGN</h1>
            <p className="text-slate-500 text-sm mt-1">
              Tableau de bord — Haute Couture & Atelier Sur-Mesure
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/ventes"
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm shadow-sm transition"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nouvelle Vente
            </Link>
            <Link
              href="/commandes"
              className="inline-flex items-center px-4 py-2 bg-[#b8860b] hover:bg-[#966d09] text-white font-medium rounded-xl text-sm shadow-sm transition"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nouvelle Commande
            </Link>
          </div>
        </div>

        {/* Section KPI / Métriques Rapides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Clients</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '...' : stats.totalClients}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">En cours en atelier</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {loading ? '...' : stats.commandesEnCours}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Commandes Prêtes</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {loading ? '...' : stats.commandesPretes}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chiffre d'Affaires</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '...' : `${stats.chiffreAffaires.toLocaleString()} F`}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Cartes de navigation principales */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Modules de Gestion</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.title}
                  href={m.href}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between group"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl ${m.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-[#b8860b] transition">
                        {m.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        {m.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#b8860b] group-hover:translate-x-1 transition" />
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
