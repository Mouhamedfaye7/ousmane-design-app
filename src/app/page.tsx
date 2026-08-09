'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  ShoppingBag, 
  Scissors, 
  Layers, 
  BarChart3, 
  Plus, 
  Sparkles 
} from 'lucide-react';

export default function Home() {
  const pathname = usePathname();
  const [stats, setStats] = useState({
    totalClients: 0,
    enCours: 0,
    pretes: 0,
    chiffreAffaires: 0,
  });

  const updateStats = () => {
    const savedVentes = localStorage.getItem('ousmane_ventes');
    const savedCommandes = localStorage.getItem('ousmane_commandes');
    const savedClients = localStorage.getItem('ousmane_clients');

    let totalCA = 0;
    let clientCount = 0;
    let countEnCours = 0;
    let countPretes = 0;

    if (savedVentes) {
      try {
        const ventes = JSON.parse(savedVentes);
        totalCA = ventes.reduce((sum: number, v: any) => sum + (Number(v.avance) || Number(v.total) || 0), 0);
      } catch (e) {}
    } else {
      totalCA = 100000;
    }

    if (savedClients) {
      try {
        const clients = JSON.parse(savedClients);
        clientCount = clients.length;
      } catch (e) {}
    } else {
      clientCount = 3;
    }

    if (savedCommandes) {
      try {
        const commandes = JSON.parse(savedCommandes);
        countEnCours = commandes.filter((c: any) => {
          const s = (c.statut || '').toLowerCase();
          return s === 'reçue' || s === 'recue' || s === 'en coupe' || s === 'en couture' || s === 'en cours';
        }).length;

        countPretes = commandes.filter((c: any) => {
          const s = (c.statut || '').toLowerCase();
          return s === 'prête' || s === 'prete';
        }).length;
      } catch (e) {}
    } else {
      countEnCours = 0;
      countPretes = 2;
    }

    setStats({
      totalClients: clientCount,
      enCours: countEnCours,
      pretes: countPretes,
      chiffreAffaires: totalCA,
    });
  };

  useEffect(() => {
    updateStats();
    window.addEventListener('focus', updateStats);
    window.addEventListener('storage', updateStats);
    return () => {
      window.removeEventListener('focus', updateStats);
      window.removeEventListener('storage', updateStats);
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 text-slate-800">
      
      {/* Header avec typographie Haute Couture */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-800 via-amber-600 to-amber-900 drop-shadow-xs">
            OUSMANE DESIGN
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Tableau de bord — <span className="text-amber-800 font-semibold">Création & Couture Contemporaine</span>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          <Link 
            href="/ventes"
            className="flex-1 md:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus size={16}/> Nouvelle Vente
          </Link>
          <Link 
            href="/commandes"
            className="flex-1 md:flex-none justify-center bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus size={16}/> Nouvelle Commande
          </Link>
        </div>
      </div>

      {/* Cartes de Statistique */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
        
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TOTAL CLIENTS</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900">{stats.totalClients}</span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">EN COURS ATELIER</span>
            <span className="text-xl sm:text-2xl font-black text-amber-600">{stats.enCours}</span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">COMMANDES PRÊTES</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600">{stats.pretes}</span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CHIFFRE D'AFFAIRES</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900">{stats.chiffreAffaires.toLocaleString()} F</span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <TrendingUp size={18} />
          </div>
        </div>

      </div>

      {/* Modules de Gestion (Grille 3 x 2 parfaite) */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-base font-bold text-slate-900 mb-4">Modules de Gestion</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          
          <Link href="/ventes" className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Ventes & Caisse Directe</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Enregistrement des ventes boutique, encaissement Wave/Espèces et impression de tickets.</p>
            </div>
          </Link>

          <Link href="/clients" className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-500 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
              <Users size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">Gestion des Clients</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Répertoire client, numéros WhatsApp et carnet de mesures personnalisées.</p>
            </div>
          </Link>

          <Link href="/commandes" className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-500 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
              <Scissors size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">Suivi d'Atelier & Commandes</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Kanban de production, statuts de fabrication et notifications clients.</p>
            </div>
          </Link>

          <Link href="/stock" className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-500 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
              <Layers size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">Stock de Tissus</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Inventaire des étoffes (Gezner, Bazin, Soie), métrage disponible et valeur estimée.</p>
            </div>
          </Link>

          {/* LE 6IÈME MODULE : CATALOGUE & CRÉATIONS */}
          <Link href="/catalogue" className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-500 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-rose-700 transition-colors">Catalogue & Modèles</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Galerie des modèles de l'atelier, grille tarifaire indicative et book photo pour les clients.</p>
            </div>
          </Link>

          <Link href="/statistiques" className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-800 hover:shadow-md transition-all flex items-start gap-4">
            <div className="p-3 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors shrink-0">
              <BarChart3 size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-slate-900 transition-colors">Statistiques & Revenus</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Suivi des acomptes, chiffre d'affaires global et reste à recouvrir auprès des clients.</p>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}
