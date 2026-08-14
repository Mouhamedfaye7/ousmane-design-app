'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, Plus, ArrowLeft, Package, Loader2 } from 'lucide-react';
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
}

export default function CataloguePretAPorterPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Formulaire
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('Homme');
  const [prix, setPrix] = useState<number | ''>('');
  const [quantiteStock, setQuantiteStock] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [taillesSelectionnees, setTaillesSelectionnees] = useState<string[]>([]);
  const [saisieCouleurs, setSaisieCouleurs] = useState('');

  const optionsTailles = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Sur Mesure'];

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
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    chargerProduits();
  }, []);

  const toggleTaille = (taille: string) => {
    if (taillesSelectionnees.includes(taille)) {
      setTaillesSelectionnees(taillesSelectionnees.filter((t) => t !== taille));
    } else {
      setTaillesSelectionnees([...taillesSelectionnees, taille]);
    }
  };

  const ajouterProduit = async (e: React.FormEvent) => {
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

    const nouveauProduitPayload = {
      nom,
      categorie,
      prix: Number(prix),
      tailles: taillesSelectionnees.length > 0 ? taillesSelectionnees : ['Standard'],
      couleurs: listeCouleurs.length > 0 ? listeCouleurs : ['Unique'],
      quantite_stock: Number(quantiteStock),
      description,
    };

    const { data, error } = await supabase
      .from('catalogue')
      .insert([nouveauProduitPayload])
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
      };

      setProduits([prodAjoute, ...produits]);

      // Réinitialisation du formulaire
      setNom('');
      setPrix('');
      setQuantiteStock('');
      setDescription('');
      setTaillesSelectionnees([]);
      setSaisieCouleurs('');
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
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft size={16} /> Retour au tableau de bord
        </Link>

        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Catalogue & Modèles Prêt-à-Porter</h1>
            <p className="text-sm font-medium text-slate-500">Ousmane Design — Enregistrement des tenues, tailles, couleurs et stock</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORMULAIRE */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-200">
              Ajouter un Article Prêt-à-Porter
            </h2>

            <form onSubmit={ajouterProduit} className="space-y-4">
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
                    <option value="Homme" className="bg-white text-slate-900">Homme</option>
                    <option value="Femme" className="bg-white text-slate-900">Femme</option>
                    <option value="Enfant" className="bg-white text-slate-900">Enfant</option>
                    <option value="Accessoires" className="bg-white text-slate-900">Accessoires</option>
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
                        className={`px-2.5 py-1 text-xs rounded-md font-bold border transition-all ${
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
                  placeholder="Ex: Blanc, Bleu Marine, Doré"
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={18} /> Enregistrer le Modèle
                  </>
                )}
              </button>
            </form>
          </div>

          {/* LISTE DES ARTICLES */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                Articles Prêt-à-Porter ({produits.length})
              </h2>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <Loader2 size={32} className="animate-spin text-amber-700" />
                <p className="text-sm font-semibold">Chargement du catalogue...</p>
              </div>
            ) : produits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2 border border-dashed border-slate-300 rounded-xl">
                <Package size={40} className="stroke-1 text-slate-400" />
                <p className="text-sm font-medium">Aucun article enregistré dans le catalogue.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {produits.map((p) => (
                  <div
                    key={p.id}
                    className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50 hover:border-amber-500/50 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          {p.categorie}
                        </span>
                        
                        <button
                          onClick={() => supprimerProduit(p.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                          title="Supprimer cet article"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900">{p.nom}</h3>
                        <p className="text-sm font-extrabold text-amber-800">
                          {p.prix.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">{p.description || 'Aucune description'}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-700">Tailles :</span>
                        <div className="flex flex-wrap gap-1">
                          {p.tailles.map((t) => (
                            <span key={t} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-semibold">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-700">Couleurs :</span>
                        <span className="text-slate-800 font-medium">{p.couleurs.join(', ')}</span>
                      </div>

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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
