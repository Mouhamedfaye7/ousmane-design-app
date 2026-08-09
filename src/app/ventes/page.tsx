'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, MessageCircle, X, ShoppingCart, Plus, Trash2, Eye, Tag } from 'lucide-react';

interface Article {
  id: string;
  nom: string;
  prix: number;
  categorie: string;
}

interface PanierItem {
  article: Article;
  quantite: number;
}

interface Vente {
  id: string;
  client: string;
  telephone: string;
  date: string;
  modeCommande: string;
  modePaiement: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  avance: number;
  reste: number;
  observations: string;
}

export default function VentesPage() {
  const [articles, setArticles] = useState<Article[]>([
    { id: '1', nom: 'Diaspora', prix: 50000, categorie: 'Prêt-à-porter' },
    { id: '2', nom: 'Boubou VIP Getzner', prix: 85000, categorie: 'Sur-mesure' },
    { id: '3', nom: 'Caftan Royal', prix: 45000, categorie: 'Prêt-à-porter' },
    { id: '4', nom: 'Ensemble Tissu Brodé', prix: 35000, categorie: 'Prêt-à-porter' },
  ]);

  const [showArticleModal, setShowArticleModal] = useState(false);
  const [nomArticle, setNomArticle] = useState('');
  const [prixArticle, setPrixArticle] = useState('');
  const [catArticle, setCatArticle] = useState('Prêt-à-porter');

  const [panier, setPanier] = useState<PanierItem[]>([]);
  const [client, setClient] = useState('');
  const [telephone, setTelephone] = useState('');
  const [modePaiement, setModePaiement] = useState('Espèces');
  const [avance, setAvance] = useState<number | ''>('');
  const [observations, setObservations] = useState('');

  const [ventes, setVentes] = useState<Vente[]>([
    {
      id: 'FAC-80392',
      client: 'Ousmane Faye',
      telephone: '+221776462102',
      date: '08/08/2026',
      modeCommande: 'Prêt-à-porter',
      modePaiement: 'Espèces',
      designation: 'Diaspora',
      quantite: 1,
      prixUnitaire: 50000,
      total: 50000,
      avance: 50000,
      reste: 0,
      observations: 'Articles prêts-à-porter livrés en parfait état.'
    }
  ]);

  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);

  useEffect(() => {
    const savedCat = localStorage.getItem('ousmane_catalogue');
    if (savedCat) {
      try { setArticles(JSON.parse(savedCat)); } catch (e) {}
    }
    const savedVentes = localStorage.getItem('ousmane_ventes');
    if (savedVentes) {
      try { setVentes(JSON.parse(savedVentes)); } catch (e) {}
    }
  }, []);

  const saveVentes = (newVentes: Vente[]) => {
    setVentes(newVentes);
    localStorage.setItem('ousmane_ventes', JSON.stringify(newVentes));
  };

  const saveCatalogue = (newArticles: Article[]) => {
    setArticles(newArticles);
    localStorage.setItem('ousmane_catalogue', JSON.stringify(newArticles));
  };

  const handleAddArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomArticle || !prixArticle) return;

    const newArt: Article = {
      id: `ART-${Date.now()}`,
      nom: nomArticle,
      prix: Number(prixArticle),
      categorie: catArticle
    };

    saveCatalogue([...articles, newArt]);
    setNomArticle('');
    setPrixArticle('');
    setShowArticleModal(false);
  };

  const handleDeleteArticle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveCatalogue(articles.filter(a => a.id !== id));
  };

  const ajouterAuPanier = (art: Article) => {
    const existing = panier.find(item => item.article.id === art.id);
    if (existing) {
      setPanier(panier.map(item => item.article.id === art.id ? { ...item, quantite: item.quantite + 1 } : item));
    } else {
      setPanier([...panier, { article: art, quantite: 1 }]);
    }
  };

  const supprimerDuPanier = (id: string) => {
    setPanier(panier.filter(item => item.article.id !== id));
  };

  const totalPanier = panier.reduce((acc, item) => acc + (item.article.prix * item.quantite), 0);
  const avanceNum = Number(avance) || totalPanier;
  const resteAPayer = totalPanier - avanceNum;

  const validerVente = (e: React.FormEvent) => {
    e.preventDefault();
    if (panier.length === 0 || !client) return;

    const nouvelleVente: Vente = {
      id: `FAC-${Math.floor(10000 + Math.random() * 90000)}`,
      client: client,
      telephone: telephone || '+221770000000',
      date: new Date().toLocaleDateString('fr-FR'),
      modeCommande: panier[0]?.article.categorie || 'Prêt-à-porter',
      modePaiement: modePaiement,
      designation: panier.map(i => `${i.article.nom} (x${i.quantite})`).join(', '),
      quantite: panier.reduce((acc, i) => acc + i.quantite, 0),
      prixUnitaire: panier[0]?.article.prix || totalPanier,
      total: totalPanier,
      avance: avanceNum,
      reste: resteAPayer < 0 ? 0 : resteAPayer,
      observations: observations || 'Articles livrés en parfait état.'
    };

    saveVentes([nouvelleVente, ...ventes]);
    setSelectedVente(nouvelleVente);

    setPanier([]);
    setClient('');
    setTelephone('');
    setAvance('');
    setObservations('');
  };

  const handleWhatsAppShare = (v: Vente) => {
    const rawPhone = v.telephone.match(/\d+/g)?.join('') || '';
    let phone = rawPhone.length === 9 ? `221${rawPhone}` : rawPhone;

    const message = encodeURIComponent(
      `*OUSMANE DESIGN*\n_Création & Couture Contemporaine_\n\n` +
      `Bonjour *${v.client}*,\nVoici le récapitulatif de votre facture (${v.id}) :\n` +
      `- Article(s) : ${v.designation}\n` +
      `- Total : ${v.total.toLocaleString()} FCFA\n` +
      `- Avance : ${v.avance.toLocaleString()} FCFA\n` +
      `- Reste à payer : ${v.reste.toLocaleString()} FCFA\n\n` +
      `Merci pour votre confiance ! — L'élégance sur mesure, pensée pour vous.`
    );

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Ventes & Caisse Directe</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Comptoir de vente et facturation</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={16} className="text-amber-600"/> Catalogue Articles
            </h2>
            <button
              onClick={() => setShowArticleModal(true)}
              className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-colors"
            >
              <Plus size={14}/> Nouveau
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[420px] overflow-y-auto pr-1">
            {articles.map((art) => (
              <div 
                key={art.id} 
                onClick={() => ajouterAuPanier(art)}
                className="group relative p-3 border border-slate-200 rounded-lg hover:border-amber-500 hover:bg-amber-50/50 cursor-pointer transition-all flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-sm text-slate-900">{art.nom}</p>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{art.categorie}</span>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-bold text-amber-700 text-sm">{art.prix.toLocaleString()} F</p>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 justify-end"><Plus size={12}/> Ajouter</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteArticle(art.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
            <ShoppingCart size={18} className="text-amber-600"/> Nouvelle Vente / Caisse
          </h2>

          <form onSubmit={validerVente} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Client *</label>
                <input 
                  type="text"
                  placeholder="Ex: Ousmane Faye"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
                <input 
                  type="text"
                  placeholder="Ex: 776462102"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Article</th>
                    <th className="p-2.5 text-center">Qté</th>
                    <th className="p-2.5 text-right">Prix</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {panier.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">Panier vide. Cliquez sur un article à gauche.</td>
                    </tr>
                  ) : (
                    panier.map((item) => (
                      <tr key={item.article.id}>
                        <td className="p-2.5 font-medium text-slate-900">{item.article.nom}</td>
                        <td className="p-2.5 text-center">{item.quantite}</td>
                        <td className="p-2.5 text-right">{item.article.prix.toLocaleString()} F</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{(item.article.prix * item.quantite).toLocaleString()} F</td>
                        <td className="p-2.5 text-center">
                          <button type="button" onClick={() => supprimerDuPanier(item.article.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de Paiement</label>
                <select 
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Wave / Orange Money">Wave / Orange Money</option>
                  <option value="Chèque / Virement">Chèque / Virement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Avance Versée (FCFA)</label>
                <input 
                  type="number"
                  placeholder={totalPanier ? `${totalPanier}` : "Ex: 50000"}
                  value={avance}
                  onChange={(e) => setAvance(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col justify-center items-end">
                <span className="text-xs text-amber-800 font-semibold">TOTAL A PAYER</span>
                <span className="text-xl font-bold text-amber-900">{totalPanier.toLocaleString()} FCFA</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={panier.length === 0 || !client}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-lg shadow-md transition-colors"
            >
              Encaisser & Générer Facture
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-4">Historique des Ventes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">ID Facture</th>
                <th className="p-3">Client</th>
                <th className="p-3">Date</th>
                <th className="p-3">Désignation</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Reste</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ventes.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-amber-800">{v.id}</td>
                  <td className="p-3 font-semibold text-slate-900">{v.client}</td>
                  <td className="p-3 text-slate-500">{v.date}</td>
                  <td className="p-3 text-slate-700">{v.designation}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{v.total.toLocaleString()} F</td>
                  <td className="p-3 text-right font-bold text-amber-700">{v.reste.toLocaleString()} F</td>
                  <td className="p-3 text-center flex justify-center gap-2">
                    <button 
                      onClick={() => setSelectedVente(v)} 
                      className="flex items-center gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200 px-2.5 py-1 rounded font-medium"
                    >
                      <Eye size={13}/> Voir Facture
                    </button>
                    <button 
                      onClick={() => handleWhatsAppShare(v)} 
                      className="flex items-center gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2.5 py-1 rounded font-medium"
                    >
                      <MessageCircle size={13}/> WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showArticleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Ajouter un Article au Catalogue</h2>
            <form onSubmit={handleAddArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du modèle / Tissu *</label>
                <input 
                  type="text"
                  placeholder="Ex: Boubou Brodé 3 Pièces"
                  value={nomArticle}
                  onChange={(e) => setNomArticle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
                <select
                  value={catArticle}
                  onChange={(e) => setCatArticle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="Prêt-à-porter">Prêt-à-porter</option>
                  <option value="Sur-mesure">Sur-mesure</option>
                  <option value="Accessoire">Accessoire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prix de Vente (FCFA) *</label>
                <input 
                  type="number"
                  placeholder="Ex: 60000"
                  value={prixArticle}
                  onChange={(e) => setPrixArticle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowArticleModal(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-colors"
                >
                  Ajouter l'Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedVente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 relative shadow-2xl my-8 border border-amber-200">
            <div className="absolute top-4 right-4 flex items-center gap-2 print:hidden">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                <Printer size={15} /> Imprimer
              </button>
              <button 
                onClick={() => handleWhatsAppShare(selectedVente)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm"
              >
                <MessageCircle size={15} /> WhatsApp
              </button>
              <button 
                onClick={() => setSelectedVente(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="border-2 border-amber-600/80 p-6 rounded-lg bg-amber-50/10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-amber-900 tracking-wide">Ousmane Design</h1>
                  <p className="text-xs font-serif italic text-amber-800 tracking-widest uppercase mt-0.5">Création & Couture Contemporaine</p>
                </div>

                <div className="border border-amber-500/60 rounded-xl p-3 text-[11px] text-amber-900 space-y-1 bg-white/80 shadow-xs">
                  <p className="flex items-center gap-1">📍 Hann Maristes, Dakar, Sénégal</p>
                  <p className="flex items-center gap-1">📞 77 646 21 02 / 70 348 26 82</p>
                  <p className="flex items-center gap-1">📧 @ousmanedesign.sn</p>
                </div>
              </div>

              <div className="border border-amber-600/70 rounded-xl p-4 grid grid-cols-2 gap-y-2 text-xs text-amber-950 mb-6 bg-white/60">
                <div><strong>Nom du client :</strong> {selectedVente.client}</div>
                <div><strong>Mode de commande :</strong> {selectedVente.modeCommande}</div>
                <div><strong>Téléphone :</strong> <span className="text-amber-800">{selectedVente.telephone}</span></div>
                <div><strong>Mode de paiement :</strong> {selectedVente.modePaiement}</div>
                <div><strong>Date de commande :</strong> {selectedVente.date}</div>
              </div>

              <div className="border border-amber-600/70 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-xs text-left">
                  <thead className="bg-amber-600 text-white uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-2.5">Désignation</th>
                      <th className="p-2.5 text-center">Quantité</th>
                      <th className="p-2.5 text-right">Prix Unitaire</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200/60 bg-white">
                    <tr>
                      <td className="p-3 font-semibold text-amber-950">{selectedVente.designation}</td>
                      <td className="p-3 text-center text-amber-900">{selectedVente.quantite}</td>
                      <td className="p-3 text-right text-amber-900">{selectedVente.prixUnitaire.toLocaleString()} FCFA</td>
                      <td className="p-3 text-right font-bold text-amber-950">{selectedVente.total.toLocaleString()} FCFA</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="border border-amber-600/70 rounded-xl p-3 bg-white/60">
                  <span className="text-[11px] font-bold text-amber-900 block mb-1 uppercase tracking-wider">Observations :</span>
                  <p className="text-xs italic text-amber-800">{selectedVente.observations}</p>
                </div>

                <div className="border border-amber-600/70 rounded-xl overflow-hidden bg-white">
                  <div className="p-2 text-xs flex justify-between border-b border-amber-100 text-amber-900">
                    <span>MONTANT TOTAL :</span>
                    <strong className="text-amber-950">{selectedVente.total.toLocaleString()} FCFA</strong>
                  </div>
                  <div className="p-2 text-xs flex justify-between border-b border-amber-100 text-amber-900">
                    <span>AVANCE VERSÉE :</span>
                    <strong className="text-amber-950">{selectedVente.avance.toLocaleString()} FCFA</strong>
                  </div>
                  <div className="p-2.5 bg-amber-600 text-white text-xs flex justify-between font-bold">
                    <span>RESTE À PAYER :</span>
                    <span>{selectedVente.reste.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-amber-300 pt-6 grid grid-cols-2 text-center text-[11px] font-bold text-amber-900 mb-6">
                <div>
                  <p className="uppercase tracking-wider">Signature du Client</p>
                  <div className="border-b border-dotted border-amber-500 mt-8 w-3/4 mx-auto"></div>
                </div>
                <div>
                  <p className="uppercase tracking-wider">Ousmane Design (Signature & Cachet)</p>
                  <div className="border-b border-dotted border-amber-500 mt-8 w-3/4 mx-auto"></div>
                </div>
              </div>

              <p className="text-[10px] text-center italic text-amber-800/80 pt-2 border-t border-amber-200">
                Merci pour votre confiance ! — L'élégance sur mesure, pensée pour vous.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
