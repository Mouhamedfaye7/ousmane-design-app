'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Printer, Share2, MapPin, Phone, Mail, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Vente {
  id: string;
  client_nom: string;
  client_tel: string;
  date_commande: string;
  mode_commande: string;
  mode_paiement: string;
  designation: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
  avance: number;
  reste: number;
  observations?: string;
}

export default function VentesPage() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [search, setSearch] = useState('');
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchVentes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ventes').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setVentes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVentes();
  }, []);

  const handleSharePDFWhatsApp = async () => {
    if (!selectedVente) return;
    setExporting(true);

    try {
      if (typeof window !== 'undefined') {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDFModule = await import('jspdf');
        const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;

        const invoiceElement = document.getElementById('facture-modal-content');
        if (invoiceElement) {
          const canvas = await html2canvas(invoiceElement, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          const fileName = `Facture_${selectedVente.client_nom.replace(/\s+/g, '_')}.pdf`;
          pdf.save(fileName);
        }
      }

      let cleanPhone = selectedVente.client_tel.replace(/\s+/g, '').replace(/[^0-9]/g, '');
      if (cleanPhone.length === 9) cleanPhone = '221' + cleanPhone;

      const textMsg = `Bonjour ${selectedVente.client_nom},\n\nVoici votre facture de chez *Ousmane Design* :\n` +
        `- Article : ${selectedVente.designation}\n` +
        `- Total : ${selectedVente.montant_total.toLocaleString()} FCFA\n` +
        `- Avance : ${selectedVente.avance.toLocaleString()} FCFA\n` +
        `- Reste : ${selectedVente.reste.toLocaleString()} FCFA\n\n` +
        `Le fichier PDF de votre facture a été téléchargé. Merci pour votre confiance !`;

      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`
        : `https://wa.me/?text=${encodeURIComponent(textMsg)}`;

      window.open(waUrl, '_blank');

    } catch (err) {
      console.error('Erreur génération PDF:', err);
      alert('Erreur lors de la génération du PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredVentes = ventes.filter(v =>
    v.client_nom.toLowerCase().includes(search.toLowerCase()) ||
    v.client_tel.includes(search) ||
    v.designation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Ventes & Factures</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Historique et impression</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher par client, téléphone, article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="p-3">Client</th>
                <th className="p-3">Téléphone</th>
                <th className="p-3">Désignation</th>
                <th className="p-3">Total</th>
                <th className="p-3">Avance</th>
                <th className="p-3">Reste</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400">Chargement des ventes...</td></tr>
              ) : filteredVentes.map((v) => (
                <tr key={v.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">{v.client_nom}</td>
                  <td className="p-3 text-slate-500">{v.client_tel}</td>
                  <td className="p-3 text-slate-700">{v.designation}</td>
                  <td className="p-3 font-bold text-slate-900">{v.montant_total?.toLocaleString()} FCFA</td>
                  <td className="p-3 text-emerald-600 font-semibold">{v.avance?.toLocaleString()} FCFA</td>
                  <td className="p-3 font-bold text-amber-600">{v.reste?.toLocaleString()} FCFA</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedVente(v)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-md shadow-xs transition-colors"
                    >
                      Facture
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Facture avec fermeture au clic extérieur */}
      {selectedVente && (
        <div 
          onClick={() => setSelectedVente(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200 my-8"
          >
            {/* Barre de boutons supérieure */}
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Printer size={15} /> Imprimer
                </button>
                <button
                  onClick={handleSharePDFWhatsApp}
                  disabled={exporting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Share2 size={15} /> {exporting ? 'Génération...' : 'WhatsApp (PDF)'}
                </button>
              </div>

              <button
                onClick={() => setSelectedVente(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenu imprimable de la facture */}
            <div id="facture-modal-content" className="p-6 border-2 border-amber-600/80 rounded-xl bg-white space-y-6">
              
              {/* En-tête de la facture avec ICÔNES LUCIDE */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-amber-900 tracking-wide">Ousmane Design</h2>
                  <p className="text-[10px] uppercase font-bold text-amber-700 tracking-widest mt-0.5">
                    Création & Couture Contemporaine
                  </p>
                </div>

                <div className="border border-amber-200/80 bg-amber-50/30 p-2.5 rounded-lg text-[11px] text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-amber-700 shrink-0" />
                    <span>Hann Maristes, Dakar, Sénégal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-amber-700 shrink-0" />
                    <span>77 646 21 02 / 70 348 26 82</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail size={13} className="text-amber-700 shrink-0" />
                    <span>@ousmanedesign.sn</span>
                  </div>
                </div>
              </div>

              {/* Infos Client et Commande */}
              <div className="grid grid-cols-2 gap-4 border border-amber-200 rounded-lg p-3 bg-amber-50/20 text-xs">
                <div className="space-y-1">
                  <p><strong className="text-slate-800">Nom du client :</strong> {selectedVente.client_nom}</p>
                  <p><strong className="text-slate-800">Téléphone :</strong> <span className="text-amber-700 font-medium">{selectedVente.client_tel}</span></p>
                  <p><strong className="text-slate-800">Date de commande :</strong> {selectedVente.date_commande || new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="space-y-1">
                  <p><strong className="text-slate-800">Mode de commande :</strong> {selectedVente.mode_commande || 'Sur mesure'}</p>
                  <p><strong className="text-slate-800">Mode de paiement :</strong> {selectedVente.mode_paiement || 'Espèces'}</p>
                </div>
              </div>

              {/* Tableau Désignation */}
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-amber-600 text-white font-bold uppercase tracking-wider">
                    <th className="p-2.5 rounded-tl-lg">Désignation</th>
                    <th className="p-2.5 text-center">Quantité</th>
                    <th className="p-2.5 text-right">Prix Unitaire</th>
                    <th className="p-2.5 text-right rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 border-b border-amber-200">
                  <tr>
                    <td className="p-2.5 font-medium text-slate-800">{selectedVente.designation}</td>
                    <td className="p-2.5 text-center">{selectedVente.quantite || 1}</td>
                    <td className="p-2.5 text-right">{selectedVente.prix_unitaire?.toLocaleString() || selectedVente.montant_total?.toLocaleString()} FCFA</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{selectedVente.montant_total?.toLocaleString()} FCFA</td>
                  </tr>
                </tbody>
              </table>

              {/* Observations & Récapitulatif Montants */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <p className="font-bold text-slate-700 mb-1">OBSERVATIONS :</p>
                  <p className="text-slate-500 italic">{selectedVente.observations || 'Articles livrés en parfait état.'}</p>
                </div>

                <div className="space-y-1.5 text-right">
                  <div className="flex justify-between py-1 px-2 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">MONTANT TOTAL :</span>
                    <span className="font-bold text-slate-900">{selectedVente.montant_total?.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between py-1 px-2 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">AVANCE VERSÉE :</span>
                    <span className="font-bold text-emerald-600">{selectedVente.avance?.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-2 bg-amber-600 text-white font-bold rounded-md">
                    <span>RESTE À PAYER :</span>
                    <span>{selectedVente.reste?.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-[11px] text-center font-bold text-slate-700">
                <div>
                  <p className="uppercase tracking-wider">Signature du Client</p>
                  <div className="mt-8 border-b border-dashed border-slate-300"></div>
                </div>
                <div>
                  <p className="uppercase tracking-wider">Ousmane Design (Signature & Cachet)</p>
                  <div className="mt-8 border-b border-dashed border-slate-300"></div>
                </div>
              </div>

              {/* Bas de page */}
              <p className="text-[10px] text-center text-slate-400 italic pt-2 border-t border-amber-100">
                Merci pour votre confiance ! — L'élégance sur mesure, pensée pour vous.
              </p>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
