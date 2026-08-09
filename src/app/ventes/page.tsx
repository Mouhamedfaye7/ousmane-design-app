'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, MessageCircle, X } from 'lucide-react';

export default function VentesPage() {
  const [showFacture, setShowFacture] = useState(true);

  // Exemple de données de vente
  const vente = {
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
  };

  const handleWhatsAppShare = () => {
    const rawPhone = vente.telephone.match(/\d+/g)?.join('') || '';
    let phone = rawPhone.length === 9 ? `221${rawPhone}` : rawPhone;

    const message = encodeURIComponent(
      `*OUSMANE DESIGN*\n_Création & Couture Contemporaine_\n\n` +
      `Bonjour *${vente.client}*,\nVoici le récapitulatif de votre facture :\n` +
      `- Article : ${vente.designation}\n` +
      `- Total : ${vente.total.toLocaleString()} FCFA\n` +
      `- Reste à payer : ${vente.reste.toLocaleString()} FCFA\n\n` +
      `Merci pour votre confiance ! — L'élégance sur mesure, pensée pour vous.`
    );

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-900/40 p-6 flex justify-center items-center">
      {/* Modal Reçu / Facture Original Restauré */}
      {showFacture && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 relative shadow-2xl my-8 border border-amber-200">
            
            {/* Boutons d'action en haut à droite (Imprimer, WhatsApp, Fermer) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 print:hidden">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                title="Imprimer"
              >
                <Printer size={15} /> Imprimer
              </button>
              <button 
                onClick={handleWhatsAppShare}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm"
                title="Partager sur WhatsApp"
              >
                <MessageCircle size={15} /> WhatsApp
              </button>
              <button 
                onClick={() => setShowFacture(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Facture à imprimer (Cadre Doré Chic) */}
            <div className="border-2 border-amber-600/80 p-6 rounded-lg bg-amber-50/10">
              
              {/* En-tête : Marque & Adresse */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-amber-900 tracking-wide">
                    Ousmane Design
                  </h1>
                  <p className="text-xs font-serif italic text-amber-800 tracking-widest uppercase mt-0.5">
                    Création & Couture Contemporaine
                  </p>
                </div>

                <div className="border border-amber-500/60 rounded-xl p-3 text-[11px] text-amber-900 space-y-1 bg-white/80 shadow-xs">
                  <p className="flex items-center gap-1">📍 Hann Maristes, Dakar, Sénégal</p>
                  <p className="flex items-center gap-1">📞 77 646 21 02 / 70 348 26 82</p>
                  <p className="flex items-center gap-1">📧 @ousmanedesign.sn</p>
                </div>
              </div>

              {/* Bloc Info Client */}
              <div className="border border-amber-600/70 rounded-xl p-4 grid grid-cols-2 gap-y-2 text-xs text-amber-950 mb-6 bg-white/60">
                <div><strong>Nom du client :</strong> {vente.client}</div>
                <div><strong>Mode de commande :</strong> {vente.modeCommande}</div>
                <div><strong>Téléphone :</strong> <span className="text-amber-800">{vente.telephone}</span></div>
                <div><strong>Mode de paiement :</strong> {vente.modePaiement}</div>
                <div><strong>Date de commande :</strong> {vente.date}</div>
              </div>

              {/* Tableau Articles */}
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
                      <td className="p-3 font-semibold text-amber-950">{vente.designation}</td>
                      <td className="p-3 text-center text-amber-900">{vente.quantite}</td>
                      <td className="p-3 text-right text-amber-900">{vente.prixUnitaire.toLocaleString()} FCFA</td>
                      <td className="p-3 text-right font-bold text-amber-950">{vente.total.toLocaleString()} FCFA</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Observations & Totaux */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="border border-amber-600/70 rounded-xl p-3 bg-white/60">
                  <span className="text-[11px] font-bold text-amber-900 block mb-1 uppercase tracking-wider">Observations :</span>
                  <p className="text-xs italic text-amber-800">{vente.observations}</p>
                </div>

                <div className="border border-amber-600/70 rounded-xl overflow-hidden bg-white">
                  <div className="p-2 text-xs flex justify-between border-b border-amber-100 text-amber-900">
                    <span>MONTANT TOTAL :</span>
                    <strong className="text-amber-950">{vente.total.toLocaleString()} FCFA</strong>
                  </div>
                  <div className="p-2 text-xs flex justify-between border-b border-amber-100 text-amber-900">
                    <span>AVANCE VERSÉE :</span>
                    <strong className="text-amber-950">{vente.avance.toLocaleString()} FCFA</strong>
                  </div>
                  <div className="p-2.5 bg-amber-600 text-white text-xs flex justify-between font-bold">
                    <span>RESTE À PAYER :</span>
                    <span>{vente.reste.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
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

              {/* Pied de page */}
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
