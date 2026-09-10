'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trash2, Plus, ArrowLeft, Package, Loader2, Edit3, X, Check,
  Search, ArrowUpCircle, ArrowDownCircle, History, BarChart3, AlertTriangle,
  Tag, Layers, Wallet
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Produit {
  id: string;
  nom: string;
  categorie: string;
  code: string;
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

interface Categorie {
  id: string;
  label: string;
  code: string;
}

const CATEGORIES: Categorie[] = [
  { id: 'diaspora', label: 'Diaspora', code: 'DIA' },
  { id: 'chemises', label: 'Chemises', code: 'CHM' },
  { id: 'caftan', label: 'Ensembles Ton sur Ton (Caftan)', code: 'CAF' },
  { id: 'robes', label: 'Robes', code: 'ROB' },
  { id: 'chaussures', label: 'Chaussures', code: 'CHA' },
  { id: 'montres', label: 'Montres', code: 'MON' },
  { id: 'chapeaux', label: 'Chapeaux', code: 'CHP' },
  { id: 'parfums', label: 'Parfums', code: 'PAR' },
  { id: 'accessoires', label: 'Accessoires', code: 'ACC' },
];

const CATEGORIE_AUTRES: Categorie = { id: 'autres', label: 'Autres Articles', code: 'ART' };
const TOUTES_CATEGORIES = [...CATEGORIES, CATEGORIE_AUTRES];

// Palette d'accent par catégorie, pour distinguer visuellement chaque bloc
const getStyleCategorie = (id: string) => {
  switch (id) {
    case 'diaspora':
      return { entete: 'bg-blue-50 border-blue-100', pastille: 'bg-blue-600' };
    case 'chemises':
      return { entete: 'bg-cyan-50 border-cyan-100', pastille: 'bg-cyan-600' };
    case 'caftan':
      return { entete: 'bg-amber-50 border-amber-100', pastille: 'bg-amber-700' };
    case 'robes':
      return { entete: 'bg-rose-50 border-rose-100', pastille: 'bg-rose-600' };
    case 'chaussures':
      return { entete: 'bg-orange-50 border-orange-100', pastille: 'bg-orange-600' };
    case 'montres':
      return { entete: 'bg-slate-100 border-slate-200', pastille: 'bg-slate-700' };
    case 'chapeaux':
      return { entete: 'bg-violet-50 border-violet-100', pastille: 'bg-violet-600' };
    case 'parfums':
      return { entete: 'bg-fuchsia-50 border-fuchsia-100', pastille: 'bg-fuchsia-600' };
    case 'accessoires':
      return { entete: 'bg-emerald-50 border-emerald-100', pastille: 'bg-emerald-600' };
    default:
      return { entete: 'bg-amber-50 border-amber-200', pastille: 'bg-amber-500' };
  }
};

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

const genererCode = (categorieId: string, produitsExistants: Produit[]): string => {
  const cat = CATEGORIES.find((c) => c.id === categorieId);
  const prefix = cat ? cat.code : 'ART';
  const numeros = produitsExistants
    .filter((p) => p.code && p.code.startsWith(prefix + '-'))
    .map((p) => parseInt(p.code.split('-')[1], 10))
    .filter((n) => !isNaN(n));
  const prochain = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return `${prefix}-${prochain.toString().padStart(3, '0')}`;
};

type Granularite = 'jour' | 'semaine' | 'mois';

interface Bucket {
  debut: Date;
  fin: Date;
  label: string;
}

// Génère un chemin SVG lissé (Catmull-Rom -> Bézier) à partir d'une liste de points
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

const NAVY = '#1B3B6F';
const GOLD = '#C9A24B';
const ORANGE = '#C1502E';
const BLUE = '#2C5AA0';

export default function CataloguePretAPorterPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulaire
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('chemises');
  const [prix, setPrix] = useState<number | ''>('');
  const [quantiteStock, setQuantiteStock] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [taillesSelectionnees, setTaillesSelectionnees] = useState<string[]>([]);
  const [saisieCouleurs, setSaisieCouleurs] = useState('');

  // Recherche & filtre
  const [recherche, setRecherche] = useState('');
  const [categorieActive, setCategorieActive] = useState<string>('toutes');

  // Mouvements de stock (entrées / sorties)
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [loadingMouvements, setLoadingMouvements] = useState(true);
  const [mouvementModal, setMouvementModal] = useState<{ produit: Produit; type: 'entree' | 'sortie' } | null>(null);
  const [mouvementQuantite, setMouvementQuantite] = useState<number | ''>('');
  const [mouvementMotif, setMouvementMotif] = useState('');
  const [mouvementSubmitting, setMouvementSubmitting] = useState(false);

  const optionsTailles = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Sur Mesure'];

  const totalStock = produits.reduce((sum, p) => sum + (p.quantiteStock || 0), 0);
  const valeurStock = produits.reduce((sum, p) => sum + p.prix * (p.quantiteStock || 0), 0);
  const ruptureCount = produits.filter((p) => p.quantiteStock <= 3).length;
  const nonClassesCount = produits.filter((p) => !CATEGORIES.some((c) => c.id === p.categorie)).length;

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
          code: item.code || '',
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
    setCategorie('chemises');
    setPrix('');
    setQuantiteStock('');
    setDescription('');
    setTaillesSelectionnees([]);
    setSaisieCouleurs('');
  };

  const editerProduit = (p: Produit) => {
    setEditingId(p.id);
    setNom(p.nom);
    setCategorie(CATEGORIES.some((c) => c.id === p.categorie) ? p.categorie : 'chemises');
    setPrix(p.prix);
    setQuantiteStock(p.quantiteStock);
    setDescription(p.description);
    setTaillesSelectionnees(p.tailles);
    setSaisieCouleurs(p.couleurs.join(', '));
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

    if (editingId) {
      // --- MODE MODIFICATION ---
      const produitActuel = produits.find((p) => p.id === editingId);
      const codeFinal =
        produitActuel && produitActuel.code && produitActuel.code.trim() !== ''
          ? produitActuel.code
          : genererCode(categorie, produits);

      const payload = {
        nom,
        categorie,
        code: codeFinal,
        prix: Number(prix),
        tailles: taillesSelectionnees.length > 0 ? taillesSelectionnees : ['Standard'],
        couleurs: listeCouleurs.length > 0 ? listeCouleurs : ['Unique'],
        quantite_stock: Number(quantiteStock),
        description,
      };

      const { error } = await supabase.from('catalogue').update(payload).eq('id', editingId);

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
                  code: codeFinal,
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
      // --- MODE CREATION (génération automatique du code article) ---
      const codeGenere = genererCode(categorie, produits);

      const payload = {
        nom,
        categorie,
        code: codeGenere,
        prix: Number(prix),
        tailles: taillesSelectionnees.length > 0 ? taillesSelectionnees : ['Standard'],
        couleurs: listeCouleurs.length > 0 ? listeCouleurs : ['Unique'],
        quantite_stock: Number(quantiteStock),
        description,
      };

      const { data, error } = await supabase.from('catalogue').insert([payload]).select();

      if (error) {
        console.error('Erreur lors de l’ajout :', error.message);
        alert('Erreur lors de l’enregistrement dans la base de données.');
      } else if (data && data[0]) {
        const p = data[0];
        const prodAjoute: Produit = {
          id: p.id,
          nom: p.nom,
          categorie: p.categorie,
          code: p.code || codeGenere,
          prix: Number(p.prix),
          tailles: p.tailles || [],
          couleurs: p.couleurs || [],
          quantiteStock: Number(p.quantite_stock),
          description: p.description || '',
          createdAt: p.created_at,
        };

        setProduits([prodAjoute, ...produits]);

        if (prodAjoute.quantiteStock > 0) {
          const { data: mvtData, error: errMvt } = await supabase
            .from('mouvements_stock')
            .insert([{
              produit_id: p.id,
              produit_nom: `${prodAjoute.code} — ${p.nom}`,
              type: 'entree',
              quantite: prodAjoute.quantiteStock,
              motif: 'Enregistrement du produit',
            }])
            .select();

          if (!errMvt && mvtData && mvtData[0]) {
            setMouvements((prev) => [mvtData[0], ...prev]);
          }
        }

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

  // --- RECLASSEMENT RAPIDE DEPUIS LA CARTE (sans ouvrir le formulaire) ---
  const reclasserCategorie = async (produit: Produit, nouvelleCategorieId: string) => {
    const codeFinal =
      produit.code && produit.code.trim() !== '' ? produit.code : genererCode(nouvelleCategorieId, produits);

    const { error } = await supabase
      .from('catalogue')
      .update({ categorie: nouvelleCategorieId, code: codeFinal })
      .eq('id', produit.id);

    if (error) {
      console.error('Erreur reclassement :', error.message);
      alert('Erreur lors du reclassement de l’article.');
      return;
    }

    setProduits((prev) =>
      prev.map((p) => (p.id === produit.id ? { ...p, categorie: nouvelleCategorieId, code: codeFinal } : p))
    );
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
        produit_nom: `${produit.code ? produit.code + ' — ' : ''}${produit.nom}`,
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
      (p.code || '').toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.couleurs.some((c) => c.toLowerCase().includes(q)) ||
      p.tailles.some((t) => t.toLowerCase().includes(q))
    );
  });

  // --- REGROUPEMENT PAR CATÉGORIE ---
  const groupesBruts = TOUTES_CATEGORIES.map((cat) => ({
    ...cat,
    items: produitsFiltres.filter((p) =>
      cat.id === 'autres' ? !CATEGORIES.some((c) => c.id === p.categorie) : p.categorie === cat.id
    ),
  }));

  const groupesAffiches = groupesBruts.filter(
    (g) => g.items.length > 0 && (categorieActive === 'toutes' || categorieActive === g.id)
  );

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

  const timestampsProduits = produits.map((p) => new Date(p.createdAt).getTime()).filter((t) => !isNaN(t));

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
  const etiquetteStep = Math.max(1, Math.ceil(nbBuckets / 8));

  const largeurGraph = 700;
  const getX = (i: number) => (nbBuckets <= 1 ? largeurGraph / 2 : (i / (nbBuckets - 1)) * largeurGraph);
  const getY = (val: number) => 170 - (val / maxEvolution) * 125;

  const pointsEntrees = donneesEvolution.map((d, i) => ({ x: getX(i), y: getY(d.entrees) }));
  const pointsSorties = donneesEvolution.map((d, i) => ({ x: getX(i), y: getY(d.sorties) }));
  const cheminEntrees = courbeLissee(pointsEntrees);
  const cheminSorties = courbeLissee(pointsSorties);
  const aireEntrees =
    pointsEntrees.length > 0
      ? `${cheminEntrees} L ${pointsEntrees[pointsEntrees.length - 1].x} 170 L ${pointsEntrees[0].x} 170 Z`
      : '';
  const aireSorties =
    pointsSorties.length > 0
      ? `${cheminSorties} L ${pointsSorties[pointsSorties.length - 1].x} 170 L ${pointsSorties[0].x} 170 Z`
      : '';

  const formaterDateHeure = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const libelleGranularite = granularite === 'jour' ? 'par jour' : granularite === 'semaine' ? 'par semaine' : 'par mois';
  const libelleDepuis = dateDebutCatalogue.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F8FC' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .font-mono-tape { font-family: 'Space Mono', ui-monospace, monospace; }
      `}</style>

      {/* HEADER — bandeau navy premium */}
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

          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: GOLD, color: NAVY }}>
              <Package size={22} />
            </span>
            <div>
              <h1 className="font-display italic font-semibold text-2xl md:text-3xl" style={{ color: '#FFFFFF' }}>
                Catalogue Prêt-à-Porter
              </h1>
              <p className="font-body text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Ousmane Design — Articles, stock et évolution
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-10 pb-16 space-y-6">

        {/* ALERTE ARTICLES À CLASSER */}
        {nonClassesCount > 0 && (
          <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border shadow-[0_10px_30px_-18px_rgba(23,27,46,0.25)]" style={{ borderColor: `${ORANGE}33` }}>
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FBEAE3', color: ORANGE }}>
              <AlertTriangle size={16} />
            </span>
            <p className="font-body text-xs font-semibold" style={{ color: ORANGE }}>
              {nonClassesCount} article{nonClassesCount > 1 ? 's' : ''} n’{nonClassesCount > 1 ? 'ont' : 'a'} pas encore de catégorie précise
              — reclassez-{nonClassesCount > 1 ? 'les' : 'le'} depuis le bloc "Autres Articles" ci-dessous.
            </p>
          </div>
        )}

        {/* CARTES DE STATISTIQUES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-body">
          <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-18px_rgba(23,27,46,0.2)] p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#EAF1FB', color: NAVY }}><Layers size={17} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Articles</p>
              <p className="font-mono-tape text-lg font-extrabold" style={{ color: NAVY }}>{produits.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-18px_rgba(23,27,46,0.2)] p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#EAF1FB', color: BLUE }}><Package size={17} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Stock total</p>
              <p className="font-mono-tape text-lg font-extrabold" style={{ color: BLUE }}>{totalStock}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-18px_rgba(23,27,46,0.2)] p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#FBF3E2', color: GOLD }}><Wallet size={17} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Valeur stock</p>
              <p className="font-mono-tape text-sm font-extrabold" style={{ color: '#8A6A22' }}>{valeurStock.toLocaleString('fr-FR')} FCFA</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 shadow-[0_10px_30px_-18px_rgba(23,27,46,0.2)] p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: ruptureCount > 0 ? '#FBEAE3' : '#E8F5EF', color: ruptureCount > 0 ? ORANGE : '#16A34A' }}>
              <AlertTriangle size={17} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Stock faible</p>
              <p className="font-mono-tape text-lg font-extrabold" style={{ color: ruptureCount > 0 ? ORANGE : '#16A34A' }}>{ruptureCount}</p>
            </div>
          </div>
        </div>

        {/* COURBE D'ÉVOLUTION */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-3 font-body">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <h2 className="font-display font-semibold text-base flex items-center gap-2" style={{ color: '#16233D' }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EAF1FB', color: NAVY }}>
                  <BarChart3 size={16} />
                </span>
                Évolution des Entrées / Sorties
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-1 ml-10">
                Depuis le {libelleDepuis} — vue {libelleGranularite}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Entrées : <span className="font-mono-tape">{totalEntreesPeriode}</span>
              </span>
              <span className="flex items-center gap-1.5" style={{ color: ORANGE }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: ORANGE }} /> Sorties : <span className="font-mono-tape">{totalSortiesPeriode}</span>
              </span>
            </div>
          </div>

          {loadingMouvements ? (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin" /> <span className="text-xs font-semibold">Chargement des données...</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 700 195" width="100%" height="220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="degradeEntrees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="degradeSorties" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ORANGE} stopOpacity="0.14" />
                    <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
                  </linearGradient>
                </defs>

                <line x1="0" y1="45" x2="700" y2="45" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="107.5" x2="700" y2="107.5" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="170" x2="700" y2="170" stroke="#E2E8F0" strokeWidth="1" />

                {aireEntrees && <path d={aireEntrees} fill="url(#degradeEntrees)" stroke="none" />}
                {aireSorties && <path d={aireSorties} fill="url(#degradeSorties)" stroke="none" />}
                <path d={cheminEntrees} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
                <path d={cheminSorties} fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeDasharray="5 4" />

                {pointsEntrees.map((p, i) => (
                  <circle key={`pe-${i}`} cx={p.x} cy={p.y} r="2.5" fill="#059669" />
                ))}
                {pointsSorties.map((p, i) => (
                  <circle key={`ps-${i}`} cx={p.x} cy={p.y} r="2" fill={ORANGE} />
                ))}

                {donneesEvolution.map((d, i) => (
                  <g key={i}>
                    {i % etiquetteStep === 0 && (
                      <text x={getX(i)} y={188} fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="600" fontFamily="'Space Mono', monospace">
                        {d.label}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORMULAIRE */}
          <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-4 self-start font-body">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="font-display font-semibold text-base" style={{ color: NAVY }}>
                {editingId ? 'Modifier l’Article' : 'Ajouter un Article'}
              </h2>
              {editingId && (
                <button type="button" onClick={reinitialiserFormulaire} className="text-slate-400 hover:text-slate-600 p-1 rounded-md" title="Annuler l'édition">
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:bg-white transition-colors"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie</label>
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:bg-white transition-colors"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                {editingId ? (
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Tag size={11} /> Code article : <span className="font-mono-tape font-bold" style={{ color: NAVY }}>{produits.find((p) => p.id === editingId)?.code || genererCode(categorie, produits)}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Tag size={11} /> Code généré : <span className="font-mono-tape font-bold" style={{ color: NAVY }}>{genererCode(categorie, produits)}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    placeholder="Ex: 25000"
                    value={prix}
                    onChange={(e) => setPrix(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:bg-white transition-colors"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Initial</label>
                  <input
                    type="number"
                    placeholder="Ex: 10"
                    value={quantiteStock}
                    onChange={(e) => setQuantiteStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:bg-white transition-colors"
                    style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                    required
                  />
                </div>
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
                        className="px-2.5 py-1 text-xs rounded-full font-bold border transition-all cursor-pointer"
                        style={estSelectionne
                          ? { backgroundColor: GOLD, color: NAVY, borderColor: GOLD }
                          : { backgroundColor: '#F8FAFC', color: '#475569', borderColor: '#E2E8F0' }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Couleurs (séparées par une virgule)</label>
                <input
                  type="text"
                  placeholder="Ex: Blanc, Bleu Marine, Doré, Noir"
                  value={saisieCouleurs}
                  onChange={(e) => setSaisieCouleurs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:bg-white transition-colors"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Tissu</label>
                <textarea
                  placeholder="Ex: Tissu Bazin riche, col officier, coupe ajustée"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 p-2.5 rounded-lg text-sm h-20 focus:outline-none focus:ring-2 focus:bg-white transition-colors"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                />
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full disabled:opacity-50 py-2.5 rounded-full font-bold text-sm shadow-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: GOLD, color: NAVY }}
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
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-full font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Annuler la modification
                  </button>
                )}
              </div>
            </form>

            {/* HISTORIQUE DES MOUVEMENTS RÉCENTS */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <History size={14} style={{ color: GOLD }} /> Mouvements récents
              </h3>
              {loadingMouvements ? (
                <p className="text-xs text-slate-400">Chargement...</p>
              ) : mouvements.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucun mouvement enregistré pour l’instant.</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {mouvements.slice(0, 8).map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {m.type === 'entree' ? (
                          <ArrowUpCircle size={15} className="text-emerald-600 shrink-0" />
                        ) : (
                          <ArrowDownCircle size={15} className="shrink-0" style={{ color: ORANGE }} />
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">{m.produit_nom}</p>
                          <p className="text-[10px] text-slate-400">{formaterDateHeure(m.created_at)}</p>
                        </div>
                      </div>
                      <span className="font-mono-tape text-xs font-extrabold shrink-0" style={{ color: m.type === 'entree' ? '#059669' : ORANGE }}>
                        {m.type === 'entree' ? '+' : '−'}{m.quantite}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* LISTE DES ARTICLES REGROUPÉS PAR CATÉGORIE, CHACUNE DANS SON PROPRE BLOC */}
          <div className="lg:col-span-2 space-y-5 font-body">
            <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={15} style={{ color: NAVY, opacity: 0.5 }} />
                <input
                  type="text"
                  placeholder="Rechercher par nom, code, couleur, taille..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-full bg-slate-50 outline-none focus:ring-2 focus:bg-white text-slate-900 transition-colors"
                  style={{ '--tw-ring-color': GOLD } as React.CSSProperties}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCategorieActive('toutes')}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer"
                  style={categorieActive === 'toutes'
                    ? { backgroundColor: NAVY, color: '#FFFFFF', borderColor: NAVY }
                    : { backgroundColor: '#F8FAFC', color: '#475569', borderColor: '#E2E8F0' }}
                >
                  Toutes ({produits.length})
                </button>
                {TOUTES_CATEGORIES.map((cat) => {
                  const count = produits.filter((p) =>
                    cat.id === 'autres' ? !CATEGORIES.some((c) => c.id === p.categorie) : p.categorie === cat.id
                  ).length;
                  if (count === 0) return null;
                  const style = getStyleCategorie(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategorieActive(cat.id)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5"
                      style={categorieActive === cat.id
                        ? { backgroundColor: NAVY, color: '#FFFFFF', borderColor: NAVY }
                        : { backgroundColor: '#F8FAFC', color: '#475569', borderColor: '#E2E8F0' }}
                    >
                      <span className={`w-2 h-2 rounded-full ${style.pastille}`} />
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm flex flex-col items-center justify-center py-14 text-slate-500 gap-2">
                <Loader2 size={32} className="animate-spin" style={{ color: GOLD }} />
                <p className="text-sm font-semibold">Chargement du catalogue...</p>
              </div>
            ) : groupesAffiches.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center py-14 text-slate-500 gap-2">
                <Package size={40} className="stroke-1 text-slate-400" />
                <p className="text-sm font-medium">
                  {recherche ? 'Aucun article ne correspond à cette recherche.' : 'Aucun article enregistré dans le catalogue.'}
                </p>
              </div>
            ) : (
              groupesAffiches.map((groupe) => {
                const style = getStyleCategorie(groupe.id);
                return (
                  <div key={groupe.id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                    {/* EN-TÊTE DU BLOC CATÉGORIE */}
                    <div className={`flex items-center justify-between px-5 py-3.5 border-b ${style.entete}`}>
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${style.pastille}`} />
                        <h3 className="font-display font-semibold text-sm text-slate-800">{groupe.label}</h3>
                        <span className="font-mono-tape text-[10px] font-bold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full border border-slate-200">
                          {groupe.items.length}
                        </span>
                      </div>
                    </div>

                    {groupe.id === 'autres' && (
                      <div className="px-5 pt-3 text-[11px] font-semibold flex items-center gap-2" style={{ color: ORANGE }}>
                        <AlertTriangle size={13} className="shrink-0" /> Utilisez le menu "Catégorie" sur chaque carte pour classer ces articles.
                      </div>
                    )}

                    {/* CONTENU DU BLOC : GRILLE DES ARTICLES DE CETTE CATÉGORIE */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groupe.items.map((p) => (
                        <div
                          key={p.id}
                          className="border rounded-xl p-4 space-y-3 transition-all flex flex-col justify-between"
                          style={editingId === p.id
                            ? { backgroundColor: '#FBF3E2', borderColor: GOLD, boxShadow: `0 0 0 2px ${GOLD}33` }
                            : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-mono-tape text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={{ backgroundColor: NAVY, color: '#FFFFFF' }}>
                                {p.code || 'Sans code'}
                              </span>

                              <select
                                value={CATEGORIES.some((c) => c.id === p.categorie) ? p.categorie : ''}
                                onChange={(e) => e.target.value && reclasserCategorie(p, e.target.value)}
                                className="text-[10px] font-bold border rounded-md px-1.5 py-1 outline-none cursor-pointer"
                                style={CATEGORIES.some((c) => c.id === p.categorie)
                                  ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                                  : { backgroundColor: '#FBF3E2', color: '#8A6A22', borderColor: `${GOLD}66` }}
                              >
                                <option value="" disabled>Catégorie...</option>
                                {CATEGORIES.map((c) => (
                                  <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                              </select>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => editerProduit(p)}
                                  className="text-slate-400 hover:text-amber-600 transition-colors p-1.5 rounded-lg hover:bg-amber-100/60 cursor-pointer"
                                  title="Modifier cet article"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={() => supprimerProduit(p.id)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                                  title="Supprimer cet article"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            <div>
                              <h3 className="font-display font-semibold text-base text-slate-900">{p.nom}</h3>
                              <p className="font-mono-tape text-sm font-extrabold" style={{ color: '#8A6A22' }}>{p.prix.toLocaleString('fr-FR')} FCFA</p>
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-2">{p.description || 'Aucune description'}</p>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
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

                            <div className="flex justify-between items-center pt-1 font-semibold">
                              <span className="text-slate-700">Quantité en Stock :</span>
                              <span
                                className="font-mono-tape px-2 py-0.5 rounded-full font-bold"
                                style={p.quantiteStock > 3 ? { backgroundColor: '#E8F5EF', color: '#166534' } : { backgroundColor: '#FBEAE3', color: ORANGE }}
                              >
                                {p.quantiteStock} dispo.
                              </span>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => ouvrirMouvement(p, 'entree')}
                                className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold py-1.5 rounded-full text-[11px] transition-colors cursor-pointer"
                              >
                                <ArrowUpCircle size={13} /> Entrée
                              </button>
                              <button
                                onClick={() => ouvrirMouvement(p, 'sortie')}
                                className="flex-1 flex items-center justify-center gap-1 font-bold py-1.5 rounded-full text-[11px] transition-colors cursor-pointer border"
                                style={{ backgroundColor: '#FBEAE3', color: ORANGE, borderColor: `${ORANGE}44` }}
                              >
                                <ArrowDownCircle size={13} /> Sortie
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL MOUVEMENT DE STOCK */}
      {mouvementModal && (
        <div onClick={() => setMouvementModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200 font-body">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="font-display font-semibold text-base flex items-center gap-2" style={{ color: mouvementModal.type === 'entree' ? '#047857' : ORANGE }}>
                {mouvementModal.type === 'entree' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                {mouvementModal.type === 'entree' ? 'Entrée de Stock' : 'Sortie de Stock'}
              </h2>
              <button onClick={() => setMouvementModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <p className="font-bold text-slate-900">
                  <span className="font-mono-tape text-slate-500">{mouvementModal.produit.code || 'Sans code'}</span> — {mouvementModal.produit.nom}
                </p>
                <p className="text-slate-500">Stock actuel : <strong className="font-mono-tape">{mouvementModal.produit.quantiteStock}</strong></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantité *</label>
                <input
                  type="number"
                  min="1"
                  autoFocus
                  value={mouvementQuantite}
                  onChange={(e) => setMouvementQuantite(e.target.value === '' ? '' : Number(e.target.value))}
                  className="font-mono-tape w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motif</label>
                <input
                  type="text"
                  value={mouvementMotif}
                  onChange={(e) => setMouvementMotif(e.target.value)}
                  placeholder={mouvementModal.type === 'entree' ? 'Ex: Réapprovisionnement' : 'Ex: Perte, casse, ajustement'}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setMouvementModal(null)} className="px-4 py-2 rounded-full bg-slate-200 font-bold cursor-pointer">Annuler</button>
                <button
                  type="button"
                  onClick={confirmerMouvement}
                  disabled={mouvementSubmitting}
                  className="px-4 py-2 rounded-full text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: mouvementModal.type === 'entree' ? '#059669' : ORANGE }}
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
