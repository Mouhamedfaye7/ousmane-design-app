'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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
  const [produits, setProduits] = useState<Produit[]>([
    {
      id: '1',
      nom: 'Boubou 3 Pièces Bazin',
      categorie: 'Homme',
      prix: 45000,
      tailles: ['M', 'L', 'XL', 'XXL'],
      couleurs: ['Bleu Roi', 'Blanc', 'Noir'],
      quantiteStock: 8,
      description: 'Ensemble prêt-à-porter brodé main.',
    },
    {
      id: '2',
      nom: 'Robe Marinière Soie',
      categorie: 'Femme',
      prix: 30000,
      tailles: ['S', 'M', 'L'],
      couleurs: ['Vert Emeraude', 'Beige'],
      quantiteStock: 5,
      description: 'Tenue élégante en soie fluide.',
    },
  ]);

  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('Homme');
  const [prix, setPrix] = useState<number | ''>('');
  const [quantiteStock, setQuantiteStock] = useState<number | ''>('');
  const [description, setDescription] = useState('');

  const optionsTailles = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Sur Mesure'];
  const [taillesSelectionnees, setTaillesSelectionnees] = useState<string[]>([]);
  const [saisieCouleurs, setSaisieCouleurs] = useState('');

  const toggleTaille = (taille: string) => {
    if (taillesSelectionnees.includes(taille)) {
      setTaillesSelectionnees(taillesSelectionnees.filter((t) => t !== taille));
    } else {
      setTaillesSelectionnees([...taillesSelectionnees, taille]);
    }
  };

  const ajouterProduit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nom || !prix || !quantiteStock) {
      alert('Veuillez remplir le nom, le prix et le stock.');
      return;
    }

    const listeCouleurs = saisieCouleurs
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const nouveauProduit: Produit = {
      id: Date.now().toString(),
      nom,
      categorie,
      prix: Number(prix),
      tailles: taillesSelectionnees.length > 0 ? taillesSelectionnees : ['Standard'],
      couleurs: listeCouleurs.length > 0 ? listeCouleurs : ['Unique'],
      quantiteStock: Number(quantiteStock),
      description,
    };

    setProduits([nouveauProduit, ...produits]);

    setNom('');
    setPrix('');
    setQuantiteStock('');
    setDescription('');
    setTaillesSelectionnees([]);
    setSaisieCouleurs('');
  };

  const supprimerProduit = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cet article ?')) {
      setProduits(produits.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <Link href="/" className="text-sm text-slate-600 hover:underline">
          ← Retour au tableau de bord
        </Link>

        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Catalogue & Modèles Prêt-à-Porter</h1>
            <p className="text-sm text-slate-500">Ousmane Design — Enregistrement des tenues, tailles, couleurs et stock</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 pb-2 border-b">
              Ajouter un Article Prêt-à-Porter
            </h2>

            <form onSubmit={ajouterProduit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nom du modèle / Article</label>
                <input
                  type="text"
                  placeholder="Ex: Ensemble Tunique Brodé"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Catégorie</label>
                  <select
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm font-medium"
                  >
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                    <option value="Enfant">Enfant</option>
                    <option value="Accessoires">Accessoires</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    placeholder="Ex: 25000"
                    value={prix}
                    onChange={(e) => setPrix(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Stock Initial (Quantité)</label>
                <input
                  type="number"
                  placeholder="Ex: 10"
                  value={quantiteStock}
                  onChange={(e) => setQuantiteStock(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tailles disponibles</label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {optionsTailles.map((t) => {
                    const estSelectionne = taillesSelectionnees.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => toggleTaille(t)}
                        className={`px-2.5 py-1 text-xs rounded-md font-semibold border transition-all ${
                          estSelectionne
                            ? 'bg-amber-700 text-white border-amber-700'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Couleurs (séparées par une virgule)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Blanc, Bleu Marine, Doré"
                  value={saisieCouleurs}
                  onChange={(e) => setSaisieCouleurs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description & Tissu</label>
                <textarea
                  placeholder="Ex: Tissu Bazin riche, col officier, coupe ajustée"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm h-20"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-700 hover:bg-amber-800 text-white py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors"
              >
                + Enregistrer le Modèle
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h2 className="text-lg font-bold text-slate-800">
                Articles Prêt-à-Porter ({produits.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {produits.map((p) => (
                <div
                  key={p.id}
                  className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50 hover:border-amber-500/50 transition-all relative"
                >
                  <button
                    onClick={() => supprimerProduit(p.id)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-red-600 text-sm font-bold"
                    title="Supprimer"
                  >
                    ✕
                  </button>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {p.categorie}
                    </span>
                    <h3 className="text-base font-bold text-slate-800 mt-1">{p.nom}</h3>
                    <p className="text-sm font-extrabold text-amber-700">
                      {p.prix.toLocaleString()} FCFA
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{p.description || 'Aucune description'}</p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-600">Tailles :</span>
                      <div className="flex flex-wrap gap-1">
                        {p.tailles.map((t) => (
                          <span key={t} className="bg-white border px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-600">Couleurs :</span>
                      <span className="text-slate-700">{p.couleurs.join(', ')}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 font-semibold">
                      <span className="text-slate-600">Quantité en Stock :</span>
                      <span
                        className={`px-2 py-0.5 rounded ${
                          p.quantiteStock > 3
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {p.quantiteStock} dispo.
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
