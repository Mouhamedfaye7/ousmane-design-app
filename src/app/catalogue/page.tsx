'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trash2, Plus, ArrowLeft, Package, Loader2, Edit3, X, Check,
  Search, ArrowUpCircle, ArrowDownCircle, History, BarChart3, AlertTriangle, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Produit {
  id: string;
  nom: string;
  categorie: string;
  prix: number;
  tailles: string[];
  couleurs: string[];
  quantiteStock: number;
  description: string;
  createdAt: string;
}

interface Mouvement {
  id: string;
  produit_id: string;
  produit_nom: string;
  type: 'entree' | 'sortie';
  quantite: number;
  motif?: string;
  created_at: string;
}

// Fonction utilitaire pour associer les noms de couleurs en français aux valeurs CSS
const getCouleurHex = (couleur: string): string => {
  const c = couleur.trim().toLowerCase();
  const dictionary: Record<string, string> = {
    noir: '#000000',
    blanc: '#ffffff',
    rouge: '#ef4444',
    bleu: '#3b82f6',
    'bleu marine': '#1e3a8a',
    marine: '#1e3a8a',
    vert: '#22c55e',
    jaune: '#eab308',
    'doré': '#d4af37',
    dore: '#d4af37',
    'argenté': '#c0c0c0',
    argent: '#c0c0c0',
    gris: '#6b7280',
    marron: '#78350f',
    bordeaux: '#800020',
    violet: '#8b5cf6',
    rose: '#ec4899',
    orange: '#f97316',
    beige: '#f5f5dc',
    crème: '#fffdd0',
    creme: '#fffdd0',
  };

  return dictionary[c] || c;
};

type Granularite = 'jour' | 'semaine' | 'mois';

interface Bucket {
  debut: Date;
  fin: Date;
  label: string;
}

export default function CataloguePretAPorterPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulaire
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('Homme');
  const [prix, setPrix] = useState<number | ''>('');
  const [quantiteStock, setQuantiteStock] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [taillesSelectionnees, setTaillesSelectionnees] = useState<string[]>([]);
  const [saisieCouleurs, setSaisieCouleurs] = useState('');

  // Recherche
  const [recherche, setRecherche] = useState('');

  // Mouvements de stock (entrées / sorties)
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [loadingMouvements, setLoadingMouvements] = useState(true);
  const [mouvementModal, setMouvementModal] = useState<{ produit: Produit; type: 'entree' | 'sortie' } | null>(null);
  const [mouvementQuantite, setMouvementQuantite] = useState<number | ''>('');
  const [mouvementMotif, setMouvementMotif] = useState('');
  const [mouvementSubmitting, setMouvementSubmitting] = useState(false);

  const optionsTailles = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Sur Mesure'];

  // Calcul du nombre total de produits en stock disponibles
  const totalStock = produits.reduce((sum, p) => sum + (p.quantiteStock || 0), 0);
  const valeurStock = produits.reduce((sum, p) => sum + p.prix * (p.quantiteStock || 0), 0);
  const ruptureCount = produits.filter((p) => p.quantiteStock <= 3).length;

  // Chargement des données depuis Supabase
  const chargerProduits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('catalogue')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur Supabase :', error.message);
    } else if (data) {
      setProduits(
        data.map((item) => ({
          id: item.id,
          nom: item.nom,
          categorie: item.categorie,
          prix: Number(item.prix),
          tailles: item.tailles || [],
          couleurs: item.couleurs || [],
          quantiteStock: Number(item.quantite_stock),
          description: item.description || '',
          createdAt: item.created_at,
        }))
      );
    }
    setLoading(false);
  };

  const chargerMouvements = async () => {
    setLoadingMouvements(true);
    const { data, error } = await supabase
      .from('mouvements_stock')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement mouvements :', error.message);
    } else if (data) {
      setMouvements(data);
    }
    setLoadingMouvements(false);
  };

  useEffect(() => {
    chargerProduits();
    chargerMouvements();
  }, []);

  const toggleTaille = (taille: string) => {
    if (taillesSelectionnees.includes(taille)) {
      setTaillesSelectionnees(taillesSelectionnees.filter((t) => t !== taille));
    } else {
      setTaillesSelectionnees([...taillesSelectionnees, taille]);
    }
  };

  const reinitialiserFormulaire = () => {
    setEditingId(null);
    setNom('');
    setCategorie('Homme');
    setPrix('');
    setQuantiteStock('');
    setDescription('');
    setTaillesSelectionnees([]);
    setSaisieCouleurs('');
  };

  const editerProduit = (p: Produit) => {
    setEditingId(p.id);
    setNom(p.nom);
    setCategorie(p.categorie);
    setPrix(p.prix);
    setQuantiteStock(p.quantiteStock);
    setDescription(p.description);
    setTaillesSelectionnees(p.tailles);
    setSaisieCouleurs(p.couleurs.join(', '));

    // Scroll vers le formulaire pour faciliter l'expérience sur mobile / petits écrans
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const enregistrerProduit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nom || !prix || quantiteStock === '') {
      alert('Veuillez remplir le nom, le prix et le stock.');
      return;
    }

    setIsSubmitting(true);

    const listeCouleurs = saisieCouleurs
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const payload = {
      nom,
      categorie,
      prix: Number(prix),
      tailles: taillesSelectionnees.length > 0 ? taillesSelectionnees : ['Standard'],
      couleurs: listeCouleurs.length > 0 ? listeCouleurs : ['Unique'],
      quantite_stock: Number(quantiteStock),
      description,
    };

    if (editingId) {
      // --- MODE MODIFICATION ---
      const { error } = await supabase
        .from('catalogue')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        console.error('Erreur lors de la modification :', error.message);
        alert('Erreur lors de la mise à jour de l’article.');
      } else {
        setProduits(
          produits.map((p) =>
            p.id === editingId
              ? {
                  ...p,
                  nom,
                  categorie,
                  prix: Number(prix),
                  tailles: payload.tailles,
                  couleurs: payload.couleurs,
                  quantiteStock: Number(quantiteStock),
                  description,
                }
              : p
          )
        );
        reinitialiserFormulaire();
      }
    } else {
      // --- MODE CREATION ---
      const { data, error } = await supabase
        .from('catalogue')
        .insert([payload])
        .select();

      if (error) {
        console.error('Erreur lors de l’ajout :', error.message);
        alert('Erreur lors de l’enregistrement dans la base de données.');
      } else if (data && data[0]) {
        const p = data[0];
        const prodAjoute: Produit = {
          id: p.id,
          nom: p.nom,
          categorie: p.categorie,
          prix: Number(p.prix),
          tailles: p.tailles || [],
          couleurs: p.couleurs || [],
          quantiteStock: Number(p.quantite_stock),
          description: p.description || '',
          createdAt: p.created_at,
        };

        setProduits([prodAjoute, ...produits]);
        reinitialiserFormulaire();
      }
    }

    setIsSubmitting(false);
  };

  const supprimerProduit = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cet article du catalogue ?')) {
      const { error } = await supabase.from('catalogue').delete().eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression :', error.message);
        alert('Erreur lors de la suppression de l’article.');
      } else {
        setProduits(produits.filter((p) => p.id !== id));
        if (editingId === id) {
          reinitialiserFormulaire();
        }
      }
    }
  };

  // --- GESTION DES MOUVEMENTS DE STOCK (ENTRÉES / SORTIES) ---
  const ouvrirMouvement = (produit: Produit, type: 'entree' | 'sortie') => {
    setMouvementModal({ produit, type });
    setMouvementQuantite('');
    setMouvementMotif(type === 'entree' ? 'Réapprovisionnement' : 'Ajustement inventaire');
  };

  const confirmerMouvement = async () => {
    if (!mouvementModal) return;
    const { produit, type } = mouvementModal;

    if (!mouvementQuantite || Number(mouvementQuantite) <= 0) {
      alert('Veuillez indiquer une quantité valide.');
      return;
    }

    setMouvementSubmitting(true);
    const qte = Number(mouvementQuantite);
    const nouveauStock = type === 'entree' ? produit.quantiteStock + qte : Math.max(0, produit.quantiteStock - qte);

    const { error: errStock } = await supabase
      .from('catalogue')
      .update({ quantite_stock: nouveauStock })
      .eq('id', produit.id);

    if (errStock) {
      console.error('Erreur mise à jour du stock :', errStock.message);
      alert('Erreur lors de la mise à jour du stock.');
      setMouvementSubmitting(false);
      return;
    }

    const { data: mvtData, error: errMvt } = await supabase
      .from('mouvements_stock')
      .insert([{
        produit_id: produit.id,
        produit_nom: produit.nom,
        type,
        quantite: qte,
        motif: mouvementMotif || null,
      }])
      .select();

    setProduits(produits.map((p) => (p.id === produit.id ? { ...p, quantiteStock: nouveauStock } : p)));

    if (!errMvt && mvtData && mvtData[0]) {
      setMouvements([mvtData[0], ...mouvements]);
    }

    setMouvementModal(null);
    setMouvementQuantite('');
    setMouvementMotif('');
    setMouvementSubmitting(false);
  };

  // --- RECHERCHE ---
  const produitsFiltres = produits.filter((p) => {
    const q = recherche.trim().toLowerCase();
    if (!q) return true;
    return (
      p.nom.toLowerCase().includes(q) ||
      p.categorie.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.couleurs.some((c) => c.toLowerCase().includes(q)) ||
      p.tailles.some((t) => t.toLowerCase().includes(q))
    );
  });

  // --- COURBE D'ÉVOLUTION : DEPUIS LE PREMIER ARTICLE ENREGISTRÉ, GRANULARITÉ ADAPTATIVE ---
  const construireBuckets = (dateDebut: Date, dateFin: Date, granularite: Granularite): Bucket[] => {
    const buckets: Bucket[] = [];

    if (granularite === 'jour') {
      const curseur = new Date(dateDebut);
      while (curseur <= dateFin) {
        const debut = new Date(curseur);
        debut.setHours(0, 0, 0, 0);
        const fin = new Date(curseur);
        fin.setHours(23, 59, 59, 999);
        buckets.push({ debut, fin, label: debut.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) });
        curseur.setDate(curseur.getDate() + 1);
      }
    } else if (granularite === 'semaine') {
      const curseur = new Date(dateDebut);
      while (curseur <= dateFin) {
        const debut = new Date(curseur);
        debut.setHours(0, 0, 0, 0);
        const finBrute = new Date(curseur);
        finBrute.setDate(finBrute.getDate() + 6);
        finBrute.setHours(23, 59, 59, 999);
        const fin = finBrute > dateFin ? dateFin : finBrute;
        buckets.push({ debut, fin, label: debut.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) });
        curseur.setDate(curseur.getDate() + 7);
      }
    } else {
      const curseur = new Date(dateDebut.getFullYear(), dateDebut.getMonth(), 1);
      while (curseur <= dateFin) {
        const debut = new Date(curseur);
        const finBrute = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0);
        finBrute.setHours(23, 59, 59, 999);
        const fin = finBrute > dateFin ? dateFin : finBrute;
        buckets.push({ debut, fin, label: debut.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) });
        curseur.setMonth(curseur.getMonth() + 1);
      }
    }

    return buckets;
  };

  const timestampsProduits = produits
    .map((p) => new Date(p.createdAt).getTime())
    .filter((t) => !isNaN(t));

  const aujourdHui = new Date();
  aujourdHui.setHours(23, 59, 59, 999);

  const dateDebutCatalogue = timestampsProduits.length > 0 ? new Date(Math.min(...timestampsProduits)) : new Date();
  dateDebutCatalogue.setHours(0, 0, 0, 0);

  const diffJours = Math.max(1, Math.ceil((aujourdHui.getTime() - dateDebutCatalogue.getTime()) / 86400000) + 1);

  const granularite: Granularite = diffJours <= 31 ? 'jour' : diffJours <= 180 ? 'semaine' : 'mois';

  const buckets = construireBuckets(dateDebutCatalogue, aujourdHui, granularite);

  const donneesEvolution = buckets.map((b) => {
    const mvtsBucket = mouvements.filter((m) => {
      const dm = new Date(m.created_at);
      return dm >= b.debut && dm <= b.fin;
    });
    const entrees = mvtsBucket.filter((m) => m.type === 'entree').reduce((s, m) => s + m.quantite, 0);
    const sorties = mvtsBucket.filter((m) => m.type === 'sortie').reduce((s, m) => s + m.quantite, 0);
    return { label: b.label, entrees, sorties };
  });

  const maxEvolution = Math.max(1, ...donneesEvolution.map((d) => Math.max(d.entrees, d.sorties)));
  const totalEntreesPeriode = donneesEvolution.reduce((s, d) => s + d.entrees, 0);
  const totalSortiesPeriode = donneesEvolution.reduce((s, d) => s + d.sorties, 0);
  const nbBuckets = Math.max(1, donneesEvolution.length);
  const etiquetteStep = Math.max(1, Math.ceil(nbBuckets / 10));

  const formaterDateHeure = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const libelleGranularite = granularite === 'jour' ? 'par jour' : granularite === 'semaine' ? 'par semaine' : 'par mois';
  const libelleDepuis = dateDebutCatalogue.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft size={16} /> Retour au tableau de bord
        </Link>

        {/* HEADER PREMIUM */}
        <header className="bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 rounded-2xl p-6 shadow-lg text-white flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-3 rounded-xl backdrop-blur-sm">
              <Package size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Catalogue & Modèles Prêt-à-Porter <Sparkles size={18} className="text-amber-200" />
              </h1>
              <p className="text-sm font-medium text-amber-100">
                Ousmane Design — Gestion du stock, des entrées / sorties et de la performance du catalogue
              </p>
            </div>
          </div>
        </header>

        {/* CARTES DE STATISTIQUES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Articles au catalogue</p>
            <p className="text-2xl font-extrabold text-slate-900">{produits.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Unités en stock</p>
            <p className="text-2xl font-extrabold text-blue-700">{totalStock}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Valeur du stock</p>
            <p className="text-lg font-extrabold text-amber-800">{valeurStock.toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div className={`rounded-xl border shadow-sm p-4 space-y-1 ${ruptureCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
              {ruptureCount > 0 && <AlertTriangle size={12} className="text-red-600" />} Stock faible (≤3)
            </p>
            <p className={`text-2xl font-extrabold ${ruptureCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{ruptureCount}</p>
          </div>
        </div>

        {/* COURBE D'ÉVOLUTION DES MOUVEMENTS DE STOCK */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 size={16} className="text-amber-700" /> Évolution des Entrées / Sorties
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Depuis le {libelleDepuis} (premier article enregistré) — vue {libelleGranularite}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" /> Entrées : {totalEntreesPeriode}
              </span>
              <span className="flex items-center gap-1.5 text-red-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" /> Sorties : {totalSortiesPeriode}
              </span>
            </div>
          </div>

          {loadingMouvements ? (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin" /> <span className="text-xs font-semibold">Chargement des données...</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 700 230" width="100%" height="220" preserveAspectRatio="none">
                <line x1="0" y1="180" x2="700" y2="180" stroke="#e2e8f0" strokeWidth="1" />
                {donneesEvolution.map((d, i) => {
                  const largeurBucket = 700 / nbBuckets;
                  const xBase = i * largeurBucket + largeurBucket * 0.15;
                  const largeurBarre = Math.max(2, largeurBucket * 0.35);
                  const hEntree = (d.entrees / maxEvolution) * 130;
                  const hSortie = (d.sorties / maxEvolution) * 130;
                  return (
                    <g key={i}>
                      <rect x={xBase} y={180 - hEntree} width={largeurBarre} height={hEntree} fill="#059669" rx="1.5" />
                      <rect x={xBase + largeurBarre + 2} y={180 - hSortie} width={largeurBarre} height={hSortie} fill="#dc2626" rx="1.5" />
                      {i % etiquetteStep === 0 && (
                        <text x={xBase + largeurBarre} y={198} fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="600">
                          {d.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORMULAIRE */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 self-start">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Modifier l’Article' : 'Ajouter un Article Prêt-à-Porter'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={reinitialiserFormulaire}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  title="Annuler l'édition"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <form onSubmit={enregistrerProduit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom du modèle / Article</label>
                <input
                  type="text"
                  placeholder="Ex: Ensemble Tunique Brodé"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 p-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-600"
                  >
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                    <option value="Enfant">Enfant</option>
                    <option value="Accessoires">Accessoires</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    placeholder="Ex: 25000"
                    value={prix}
                    onChange={(e) => setPrix(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stock Initial (Quantité)</label>
                <input
                  type="number"
                  placeholder="Ex: 10"
                  value={quantiteStock}
                  onChange={(e) => setQuantiteStock(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tailles disponibles</label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {optionsTailles.map((t) => {
                    const estSelectionne = taillesSelectionnees.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => toggleTaille(t)}
                        className={`px-2.5 py-1 text-xs rounded-md font-bold border transition-all cursor-pointer ${
                          estSelectionne
                            ? 'bg-amber-700 text-white border-amber-700'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Couleurs (séparées par une virgule)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Blanc, Bleu Marine, Doré, Noir"
                  value={saisieCouleurs}
                  onChange={(e) => setSaisieCouleurs(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Tissu</label>
                <textarea
                  placeholder="Ex: Tissu Bazin riche, col officier, coupe ajustée"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 p-2.5 rounded-lg text-sm h-20 focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : editingId ? (
                    <>
                      <Check size={18} /> Enregistrer les Modifications
                    </>
                  ) : (
                    <>
                      <Plus size={18} /> Enregistrer le Modèle
                    </>
                  )}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={reinitialiserFormulaire}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Annuler la modification
                  </button>
                )}
              </div>
            </form>

            {/* HISTORIQUE DES MOUVEMENTS RÉCENTS */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <History size={14} className="text-amber-700" /> Mouvements récents
              </h3>
              {loadingMouvements ? (
                <p className="text-xs text-slate-400">Chargement...</p>
              ) : mouvements.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucun mouvement enregistré pour l’instant.</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {mouvements.slice(0, 8).map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {m.type === 'entree' ? (
                          <ArrowUpCircle size={15} className="text-emerald-600 shrink-0" />
                        ) : (
                          <ArrowDownCircle size={15} className="text-red-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">{m.produit_nom}</p>
                          <p className="text-[10px] text-slate-400">{formaterDateHeure(m.created_at)}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-extrabold shrink-0 ${m.type === 'entree' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.type === 'entree' ? '+' : '−'}{m.quantite}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* LISTE DES ARTICLES */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                Articles Prêt-à-Porter
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Rechercher un article..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <Loader2 size={32} className="animate-spin text-amber-700" />
                <p className="text-sm font-semibold">Chargement du catalogue...</p>
              </div>
            ) : produitsFiltres.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2 border border-dashed border-slate-300 rounded-xl">
                <Package size={40} className="stroke-1 text-slate-400" />
                <p className="text-sm font-medium">
                  {recherche ? 'Aucun article ne correspond à cette recherche.' : 'Aucun article enregistré dans le catalogue.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {produitsFiltres.map((p) => (
                  <div
                    key={p.id}
                    className={`border rounded-xl p-4 space-y-3 transition-all flex flex-col justify-between ${
                      editingId === p.id
                        ? 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-slate-50/50 border-slate-200 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          {p.categorie}
                        </span>

                        {/* ACTIONS : MODIFIER & SUPPRIMER */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => editerProduit(p)}
                            className="text-slate-400 hover:text-amber-600 transition-colors p-1.5 rounded-lg hover:bg-amber-100/60 cursor-pointer"
                            title="Modifier cet article"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => supprimerProduit(p.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Supprimer cet article"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900">{p.nom}</h3>
                        <p className="text-sm font-extrabold text-amber-800">
                          {p.prix.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">{p.description || 'Aucune description'}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                      {/* TAILLES */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-slate-700">Tailles :</span>
                        <div className="flex flex-wrap gap-1">
                          {p.tailles.map((t) => (
                            <span key={t} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-semibold">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* COULEURS AVEC CERCLAGE COLORÉ */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-700">Couleurs :</span>
                        {p.couleurs.length === 0 ? (
                          <span className="text-slate-500 italic">Non spécifié</span>
                        ) : (
                          p.couleurs.map((couleur, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-800 text-xs font-medium shadow-2xs"
                            >
                              <span
                                className="w-3 h-3 rounded-full border border-slate-300 shrink-0 inline-block"
                                style={{ backgroundColor: getCouleurHex(couleur) }}
                              />
                              {couleur}
                            </span>
                          ))
                        )}
                      </div>

                      {/* QUANTITE EN STOCK */}
                      <div className="flex justify-between items-center pt-1 font-semibold">
                        <span className="text-slate-700">Quantité en Stock :</span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            p.quantiteStock > 3
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {p.quantiteStock} dispo.
                        </span>
                      </div>

                      {/* ENTRÉE / SORTIE RAPIDE DE STOCK */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => ouvrirMouvement(p, 'entree')}
                          className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          <ArrowUpCircle size={13} /> Entrée
                        </button>
                        <button
                          onClick={() => ouvrirMouvement(p, 'sortie')}
                          className="flex-1 flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          <ArrowDownCircle size={13} /> Sortie
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL MOUVEMENT DE STOCK */}
      {mouvementModal && (
        <div onClick={() => setMouvementModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className={`text-base font-bold flex items-center gap-2 ${mouvementModal.type === 'entree' ? 'text-emerald-700' : 'text-red-700'}`}>
                {mouvementModal.type === 'entree' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                {mouvementModal.type === 'entree' ? 'Entrée de Stock' : 'Sortie de Stock'}
              </h2>
              <button onClick={() => setMouvementModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <p className="font-bold text-slate-900">{mouvementModal.produit.nom}</p>
                <p className="text-slate-500">Stock actuel : <strong>{mouvementModal.produit.quantiteStock}</strong></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantité *</label>
                <input
                  type="number"
                  min="1"
                  autoFocus
                  value={mouvementQuantite}
                  onChange={(e) => setMouvementQuantite(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motif</label>
                <input
                  type="text"
                  value={mouvementMotif}
                  onChange={(e) => setMouvementMotif(e.target.value)}
                  placeholder={mouvementModal.type === 'entree' ? 'Ex: Réapprovisionnement' : 'Ex: Perte, casse, ajustement'}
                  className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setMouvementModal(null)} className="px-4 py-2 rounded-lg bg-slate-200 font-bold cursor-pointer">Annuler</button>
                <button
                  type="button"
                  onClick={confirmerMouvement}
                  disabled={mouvementSubmitting}
                  className={`px-4 py-2 rounded-lg text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2 ${
                    mouvementModal.type === 'entree' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {mouvementSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Valider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
