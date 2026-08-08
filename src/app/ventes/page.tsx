'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, Trash2, Printer, X, Send } from 'lucide-react';
import Link from 'next/link';

interface CartItem {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
}

interface Vente {
  id: string;
  created_at: string;
  client_nom: string;
  client_telephone: string;
  articles: CartItem[];
  mode_paiement: string;
  mode_commande: string;
  total: number;
  montant_total: number;
  avance: number;
  reste_a_payer: number;
  observations: string;
}

export default function VentesPage() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [clientNom, setClientNom] = useState('');
  const [clientTel, setClientTel] = useState('');
  const [modePaiement, setModePaiement] = useState('Espèces');
  const [modeCommande, setModeCommande] = useState('Prêt-à-porter');
  const [observations, setObservations] = useState('Articles prêts-à-porter livrés en parfait état.');

  const [itemDesignation, setItemDesignation] = useState('');
  const [itemPrix, setItemPrix] = useState('');
  const [itemQty, setItemQty] = useState('1');

  const [selectedFacture, setSelectedFacture] = useState<Vente | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVentes();
  }, []);

  const fetchVentes = async () => {
    const { data } = await supabase
      .from('ventes')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setVentes(data);
    }
  };

  const handleAddToCart = () => {
    if (!itemDesignation.trim() || !itemPrix) {
      alert("Veuillez saisir la désignation et le prix unitaire.");
      return;
    }

    const priceNum = parseFloat(itemPrix);
    const qtyNum = parseInt(itemQty) || 1;

    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Prix invalide.");
      return;
    }

    const newItem: CartItem = {
      id: Date.now().toString(),
      designation: itemDesignation.trim(),
      quantite: qtyNum,
      prixUnitaire: priceNum,
    };

    setCart(prev => [...prev, newItem]);
    setItemDesignation('');
    setItemPrix('');
    setItemQty('1');
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const totalCart = cart.reduce((sum, item) => sum + item.quantite * item.prixUnitaire, 0);

  const handleEncaisser = async () => {
    if (cart.length === 0) {
      alert('Le panier est vide !');
      return;
    }

    setLoading(true);

    const nouvelleVente = {
      client_nom: clientNom.trim() || 'Client Passager',
      client_telephone: clientTel.trim() || 'Non renseigné',
      articles: cart,
      mode_paiement: modePaiement,
      mode_commande: modeCommande,
      total: totalCart,
      montant_total: totalCart,
      avance: totalCart,
      reste_a_payer: 0,
      observations: observations,
    };

    const { data, error } = await supabase.from('ventes').insert([nouvelleVente]).select().single();

    setLoading(false);

    if (error) {
      alert("Erreur d'enregistrement : " + error.message);
      return;
    }

    setCart([]);
    setClientNom('');
    setClientTel('');
    fetchVentes();

    if (data) {
      setSelectedFacture(data);
    }
  };

  const sendWhatsApp = (facture: Vente) => {
    let cleanPhone = (facture.client_telephone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 9) cleanPhone = '221' + cleanPhone;

    const summaryArticles = Array.isArray(facture.articles)
      ? facture.articles.map(a => `• ${a.quantite}x ${a.designation} (${(a.quantite * a.prixUnitaire).toLocaleString()} FCFA)`).join('\n')
      : '';

    const montantAffiché = facture.total || facture.montant_total || 0;

    const text = `*OUSMANE DESIGN — RECEPISSE DE FACTURE*\n\n` +
      `Bonjour *${facture.client_nom}*,\n` +
      `Voici le détail de votre commande :\n\n` +
      `*Détails des articles :*\n${summaryArticles}\n\n` +
      `*Montant Total :* ${montantAffiché.toLocaleString()} FCFA\n` +
      `*Mode de paiement :* ${facture.mode_paiement}\n\n` +
      `Merci pour votre confiance ! ✂️✨\n` +
      `_Ousmane Design — Hann Maristes, Dakar_`;

    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <div>
          <Link href="/" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-1">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Ventes & Caisse Directe</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        {/* Saisie d'article */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b">Ajouter un article au panier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Désignation / Article *</label>
              <input
                type="text"
                placeholder="Ex: Diaspora, Bazin, Boubou..."
                value={itemDesignation}
                onChange={(e) => setItemDesignation(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quantité</label>
              <input
                type="number"
                min="1"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prix Unitaire (FCFA) *</label>
              <input
                type="number"
                placeholder="Ex: 50000"
                value={itemPrix}
                onChange={(e) => setItemPrix(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-[#b8860b] focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition flex justify-center items-center cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* Panier & Validation */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b">Panier & Encaissement</h2>
            
            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Nom du client"
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm"
              />
              <input
                type="text"
                placeholder="Téléphone: Ex: +221 77 646 21 02"
                value={clientTel}
                onChange={(e) => setClientTel(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm"
              />
            </div>

            <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 min-h-[120px] max-h-[180px] overflow-y-auto mb-4">
              {cart.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-8">Panier vide</div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-200">
                      <div>
                        <p className="font-semibold text-slate-800">{item.designation}</p>
                        <p className="text-xs text-slate-500">{item.quantite} x {item.prixUnitaire.toLocaleString()} FCFA</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{(item.quantite * item.prixUnitaire).toLocaleString()} FCFA</span>
                        <button onClick={() => handleRemoveFromCart(item.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mode de Paiement</label>
                <select
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Wave">Wave</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="Carte Bancaire">Carte Bancaire</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-slate-700">Total à payer</span>
              <span className="text-xl font-black text-[#b8860b]">{totalCart.toLocaleString()} FCFA</span>
            </div>

            <button
              onClick={handleEncaisser}
              disabled={loading}
              className="w-full py-3 bg-[#c2a052] hover:bg-[#b38f3f] text-white font-bold rounded-xl text-base shadow-sm transition cursor-pointer"
            >
              {loading ? 'Enregistrement...' : 'Encaisser & Valider'}
            </button>
          </div>
        </div>
      </div>

      {/* Historique des Ventes */}
      <div className="max-w-7xl mx-auto mt-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm print:hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900">Historique des Ventes</h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {ventes.length} facture(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-amber-800/20 text-[11px] font-bold text-[#b8860b] uppercase tracking-wider">
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">CLIENT</th>
                <th className="py-3 px-4">ARTICLES</th>
                <th className="py-3 px-4">MODE</th>
                <th className="py-3 px-4">MONTANT TOTAL</th>
                <th className="py-3 px-4 text-right">FACTURE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {ventes.map((v) => {
                const articleSummary = Array.isArray(v.articles)
                  ? v.articles.map((a: CartItem) => `${a.quantite}x ${a.designation}`).join(', ')
                  : '-';
                const totalAffiché = v.total || v.montant_total || 0;
                return (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 text-slate-500">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{v.client_nom || 'Client Passager'}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{articleSummary}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 border border-amber-300 text-amber-800 bg-amber-50 rounded-md font-semibold text-[11px]">
                        {v.mode_paiement || 'Espèces'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      {totalAffiché.toLocaleString()} FCFA
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedFacture(v)}
                        className="inline-flex items-center px-3 py-1.5 border border-[#b8860b] text-[#b8860b] hover:bg-amber-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Voir Facture
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Facture Client */}
      {selectedFacture && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 relative shadow-2xl border-2 border-[#b8860b] my-8 print:border-none print:shadow-none print:max-w-none print:w-full print:p-0">
            <div className="absolute top-4 right-4 flex gap-2 print:hidden">
              <button
                onClick={() => sendWhatsApp(selectedFacture)}
                className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center text-xs font-semibold cursor-pointer"
              >
                <Send className="w-4 h-4 mr-1" /> WhatsApp
              </button>
              <button
                onClick={() => window.print()}
                className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-1" /> Imprimer
              </button>
              <button
                onClick={() => setSelectedFacture(null)}
                className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-between items-start mb-6 pt-2">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-wider">OUSMANE DESIGN</h1>
                <p className="text-xs text-slate-500 font-semibold uppercase mt-0.5">Haute Couture & Sur-Mesure</p>
              </div>

              <div className="border border-[#b8860b] rounded-xl p-3 text-[11px] text-slate-700 bg-amber-50/30 space-y-0.5">
                <p>📍 Hann Maristes, Dakar, Sénégal</p>
                <p>📞 77 646 21 02 / 70 348 26 82</p>
                <p>📧 @ousmanedesign.sn</p>
              </div>
            </div>

            <div className="border border-[#b8860b] rounded-2xl p-4 mb-6 grid grid-cols-2 gap-y-2 text-xs text-slate-800">
              <div>
                <span className="font-bold">Nom du client : </span>
                <span className="font-extrabold">{selectedFacture.client_nom || 'Client Passager'}</span>
              </div>
              <div>
                <span className="font-bold">Mode de commande : </span>
                <span>{selectedFacture.mode_commande || 'Prêt-à-porter'}</span>
              </div>
              <div>
                <span className="font-bold">Téléphone : </span>
                <span>{selectedFacture.client_telephone || 'Non renseigné'}</span>
              </div>
              <div>
                <span className="font-bold">Mode de paiement : </span>
                <span>{selectedFacture.mode_paiement || 'Espèces'}</span>
              </div>
              <div>
                <span className="font-bold">Date de commande : </span>
                <span>
                  {selectedFacture.created_at
                    ? new Date(selectedFacture.created_at).toLocaleDateString('fr-FR')
                    : new Date().toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            <div className="border border-[#b8860b] rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#b8860b] text-white font-bold uppercase">
                  <tr>
                    <th className="p-3">DÉSIGNATION</th>
                    <th className="p-3 text-center">QUANTITÉ</th>
                    <th className="p-3 text-right">PRIX UNITAIRE</th>
                    <th className="p-3 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Array.isArray(selectedFacture.articles) &&
                    selectedFacture.articles.map((art: CartItem, idx: number) => (
                      <tr key={idx}>
                        <td className="p-3 font-medium text-slate-800">{art.designation}</td>
                        <td className="p-3 text-center font-semibold text-slate-700">{art.quantite}</td>
                        <td className="p-3 text-right text-slate-700">
                          {art.prixUnitaire.toLocaleString()} FCFA
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {(art.quantite * art.prixUnitaire).toLocaleString()} FCFA
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-8">
              <div className="col-span-7 border border-[#b8860b] rounded-2xl p-4 text-xs">
                <p className="font-bold text-slate-800 uppercase mb-2">OBSERVATIONS :</p>
                <p className="italic text-slate-600">
                  {selectedFacture.observations || 'Articles prêts-à-porter livrés en parfait état.'}
                </p>
              </div>

              <div className="col-span-5 border border-[#b8860b] rounded-2xl overflow-hidden text-xs font-bold">
                <div className="p-2.5 flex justify-between items-center bg-amber-50/50 border-b border-[#b8860b]">
                  <span className="text-slate-700">MONTANT TOTAL :</span>
                  <span className="text-slate-900">
                    {(selectedFacture.total || selectedFacture.montant_total || 0).toLocaleString()} FCFA
                  </span>
                </div>
                <div className="p-2.5 flex justify-between items-center border-b border-[#b8860b]">
                  <span className="text-slate-700">AVANCE VERSÉE :</span>
                  <span className="text-slate-900">
                    {(selectedFacture.avance || selectedFacture.total || selectedFacture.montant_total || 0).toLocaleString()} FCFA
                  </span>
                </div>
                <div className="p-2.5 flex justify-between items-center bg-[#b8860b] text-white">
                  <span>RESTE À PAYER :</span>
                  <span>{(selectedFacture.reste_a_payer || 0).toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-800 pt-4 mb-8">
              <div>
                <p className="mb-12">SIGNATURE DU CLIENT</p>
                <p className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></p>
              </div>
              <div>
                <p className="mb-12">OUSMANE DESIGN (SIGNATURE & CACHET)</p>
                <p className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></p>
              </div>
            </div>

            <div className="text-center text-[10px] italic text-slate-500 border-t border-slate-100 pt-4">
              Merci pour votre confiance ! — L'élégance sur mesure, pensée pour vous.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
