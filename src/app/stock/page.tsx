'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, Trash2, Layers, AlertTriangle, PackageCheck } from 'lucide-react';
import Link from 'next/link';

interface Tissu {
  id: number | string;
  created_at?: string;
  nom: string;
  type: string;
  couleur: string;
  quantite: number;
  prix_metre: number;
}

export default function StockPage() {
  const [tissus, setTissus] = useState<Tissu[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [nom, setNom] = useState('');
  const [type, setType] = useState('Getzner');
  const [couleur, setCouleur] = useState('');
  const [quantite, setQuantite] = useState('');
  const [prixMetre, setPrixMetre] = useState('');

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    const { data, error } = await supabase
      .from('stock')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTissus(data);
    }
  };

  const handleAddTissu = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nom.trim() || !quantite) {
      alert('Veuillez remplir au moins le nom et la quantité.');
      return;
    }

    setLoading(true);

    const nouveauTissu = {
      nom: nom.trim(),
      type: type || 'Getzner',
      couleur: couleur.trim() || 'Non spécifiée',
      quantite: parseFloat(quantite) || 0,
      prix_metre: parseFloat(prixMetre) || 0,
    };

    const { error } = await supabase.from('stock').insert([nouveauTissu]);

    setLoading(false);

    if (error) {
      alert("Erreur lors de l'ajout : " + error.message);
      return;
    }

    // Réinitialisation du formulaire
    setNom('');
    setType('Getzner');
    setCouleur('');
    setQuantite('');
    setPrixMetre('');
    setIsModalOpen(false);
    fetchStock();
  };

  const handleDeleteTissu = async (id: number | string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet article du stock ?')) return;

    const { error } = await supabase.from('stock').delete().eq('id', id);

    if (error) {
      alert('Erreur de suppression : ' + error.message);
    } else {
      fetchStock();
    }
  };

  // Métriques
  const totalMetres = tissus.reduce((sum, item) => sum + (Number(item.quantite) || 0), 0);
  const stockBasCount = tissus.filter((item) => (Number(item.quantite) || 0) < 5).length;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-1">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Gestion du Stock de Tissus</h1>
          <p className="text-xs text-slate-500 font-medium">Ousmane Design — Inventaire et suivi des mètres disponibles</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="py-2.5 px-4 bg-[#b8860b] hover:bg-[#966d09] text-white font-semibold rounded-xl text-sm transition flex items-center shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Ajouter du Tissu
        </button>
      </div>

      {/* Cartes Métriques */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mètres en Stock</p>
            <p className="text-3xl font-black text-slate-900">{totalMetres.toLocaleString()} m</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-[#b8860b]">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alerte Stock Bas (&lt; 5m)</p>
            <p className={`text-3xl font-black ${stockBasCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {stockBasCount} référence(s)
            </p>
          </div>
          <div className={`p-3 rounded-xl ${stockBasCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tableau du Stock */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">NOM DU TISSU</th>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-4">COULEUR</th>
                <th className="py-3 px-4">QUANTITÉ (MÈTRES)</th>
                <th className="py-3 px-4">PRIX / MÈTRE</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {tissus.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Aucun tissu répertorié dans le stock.
                  </td>
                </tr>
              ) : (
                tissus.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.nom}</td>
                    <td className="py-3.5 px-4">{item.type}</td>
                    <td className="py-3.5 px-4">{item.couleur}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md font-bold text-[11px] ${
                          Number(item.quantite) < 5
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {item.quantite} m
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {item.prix_metre ? `${item.prix_metre.toLocaleString()} FCFA` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteTissu(item.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ajouter du Tissu */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Ajouter du Tissu au Stock</h2>

            <form onSubmit={handleAddTissu} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom / Référence *</label>
                <input
                  type="text"
                  placeholder="Ex: Bazin Riche VIP"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type de tissu</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  >
                    <option value="Getzner">Getzner</option>
                    <option value="Bazin">Bazin</option>
                    <option value="Soie">Soie</option>
                    <option value="Coton">Coton</option>
                    <option value="Dentelle">Dentelle</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Couleur</label>
                  <input
                    type="text"
                    placeholder="Ex: Bleu Nuit"
                    value={couleur}
                    onChange={(e) => setCouleur(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité (mètres) *</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 25"
                    value={quantite}
                    onChange={(e) => setQuantite(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prix par mètre (FCFA)</label>
                  <input
                    type="number"
                    placeholder="Ex: 8000"
                    value={prixMetre}
                    onChange={(e) => setPrixMetre(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-xl text-sm transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 bg-[#b8860b] hover:bg-[#966d09] text-white font-bold rounded-xl text-sm transition cursor-pointer"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
