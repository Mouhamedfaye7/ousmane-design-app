'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Printer, Share2, MapPin, Phone, Mail, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Vente {
  id?: string;
  client_nom: string;
  client_tel: string;
  created_at?: string;
  mode_commande?: string;
  mode_paiement?: string;
  designation?: string;
  article?: string;
  description?: string;
  modele?: string;
  quantite?: number;
  prix_unitaire?: number;
  montant_total?: number;
  avance?: number;
  reste?: number;
  observations?: string;
}

export default function VentesPage() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [search, setSearch] = useState('');
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Valeurs initiales avec des chaînes vides
  const [formData, setFormData] = useState({
    client_nom: '',
    client_tel: '',
    mode_commande: 'Prêt-à-porter',
    mode_paiement: 'Espèces',
    designation: '',
    quantite: '1',
    prix_unitaire: '',
    avance: '',
    observations: ''
  });

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

  // Calculs dynamiques pour l'affichage
  const qtyNum = Number(formData.quantite) || 0;
  const puNum = Number(formData.prix_unitaire) || 0;
  const montantTotalCalcul = qtyNum * puNum;
  const avanceNum = Number(formData.avance) || 0;
  const resteCalcul = montantTotalCalcul - avanceNum;

  const handleCreateVente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_nom || !formData.designation) {
      alert('Veuillez remplir le nom du client et la désignation.');
      return;
    }

    const payload = {
      client_nom: formData.client_nom,
      client_tel: formData.client_tel,
      mode_commande: formData.mode_commande,
      mode_paiement: formData.mode_paiement,
      designation: formData.designation,
      quantite: qtyNum || 1,
      prix_unitaire: puNum,
      montant_total: montantTotalCalcul,
      avance: avanceNum,
      reste: resteCalcul,
      observations: formData.observations
    };

    const { error } = await supabase.from('ventes').insert([payload]);

    if (error) {
      console.error('Erreur Supabase:', error);
      // Fallback si des colonnes manquent dans la base
      const fallbackPayload = {
        client_nom: formData.client_nom,
        client_tel: formData.client_tel,
        montant_total: montantTotalCalcul,
        avance: avanceNum,
        observations: `[${formData.designation}] Qté: ${qtyNum} x ${puNum} FCFA - Reste: ${resteCalcul} FCFA | ${formData.observations}`.trim()
      };
      
      const { error: fallbackError } = await supabase.from('ventes').insert([fallbackPayload]);
      if (fallbackError) {
        alert('Erreur enregistrement : ' + fallbackError.message);
        return;
      }
    }

    setShowAddModal(false);
    setFormData({
      client_nom: '',
      client_tel: '',
      mode_commande: 'Prêt-à-porter',
      mode_paiement: 'Espèces',
      designation: '',
      quantite: '1',
      prix_unitaire: '',
      avance: '',
      observations: ''
    });
    fetchVentes();
  };

  const formatAmount = (val: number | undefined | null) => {
    return (Number(val) || 0).toLocaleString('fr-FR');
  };

  const getItemName = (v: Vente) => {
    return v.designation || v.article || v.description || v.modele || 'Article sur mesure';
  };

  const handleSharePDFWhatsApp = async () => {
    if (!selectedVente) return;
    setExporting(true);

    try {
      if (typeof window !== 'undefined') {
        const jsPDFModule = await import('jspdf');
        const autoTableModule = await import('jspdf-autotable');
        const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
        const autoTable = autoTableModule.default || autoTableModule;

        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.setTextColor(180, 83, 9);
        doc.text('Ousmane Design', 14, 20);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text('CREATION & COUTURE CONTEMPORAINE', 14, 25);

        doc.setFontSize(9);
        doc.setTextColor(50);
        doc.text('Hann Maristes, Dakar, Senegal', 130, 18);
        doc.text('Tel: 77 646 21 02 / 70 348 26 82', 130, 23);
        doc.text('Email: @ousmanedesign.sn', 130, 28);

        doc.setLineWidth(0.5);
        doc.setDrawColor(217, 119, 6);
        doc.line(14, 33, 196, 33);

        const formattedDate = selectedVente.created_at 
          ? new Date(selectedVente.created_at).toLocaleDateString('fr-FR')
          : new Date().toLocaleDateString('fr-FR');

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`Client : ${selectedVente.client_nom || 'Client'}`, 14, 43);
        doc.text(`Telephone : ${selectedVente.client_tel || 'N/A'}`, 14, 49);
        doc.text(`Date : ${formattedDate}`, 14, 55);

        doc.text(`Mode de commande : ${selectedVente.mode_commande || 'Pret-a-porter'}`, 120, 43);
        doc.text(`Mode de paiement : ${selectedVente.mode_paiement || 'Especes'}`, 120, 49);

        const mTotal = selectedVente.montant_total || 0;
        const mAvance = selectedVente.avance || 0;
        const mReste = selectedVente.reste !== undefined ? selectedVente.reste : (mTotal - mAvance);

        autoTable(doc, {
          startY: 63,
          head: [['Designation', 'Quantite', 'Prix Unitaire', 'Total']],
          body: [
            [
              getItemName(selectedVente),
              selectedVente.quantite || 1,
              `${formatAmount(selectedVente.prix_unitaire || mTotal)} FCFA`,
              `${formatAmount(mTotal)} FCFA`
            ]
          ],
          headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' },
          theme: 'striped',
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 100;

        doc.setFontSize(10);
        doc.text(`Montant Total : ${formatAmount(mTotal)} FCFA`, 120, finalY + 10);
        doc.text(`Avance Versee : ${formatAmount(mAvance)} FCFA`, 120, finalY + 16);
        doc.setFontSize(11);
        doc.setTextColor(217, 119, 6);
        doc.text(`Reste a payer : ${formatAmount(mReste)} FCFA`, 120, finalY + 23);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Observations : ${selectedVente.observations || 'Articles livres en parfait etat.'}`, 14, finalY + 10);

        doc.setTextColor(0);
        doc.setFontSize(9);
        doc.text('Signature Client :', 25, finalY + 45);
        doc.text('Ousmane Design (Signature & Cachet) :', 110, finalY + 45);

        const safeName = (selectedVente.client_nom || 'Client').replace(/\s+/g, '_');
        doc.save(`Facture_${safeName}.pdf`);
      }

      let cleanPhone = (selectedVente.client_tel || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
      if (cleanPhone.length === 9) cleanPhone = '221' + cleanPhone;

      const mTotal = selectedVente.montant_total || 0;
      const mAvance = selectedVente.avance || 0;
      const mReste = selectedVente.reste !== undefined ? selectedVente.reste : (mTotal - mAvance);

      const textMsg = `Bonjour ${selectedVente.client_nom},\n\nVoici votre facture de chez *Ousmane Design* :\n` +
        `- Article : ${getItemName(selectedVente)}\n` +
        `- Total : ${formatAmount(mTotal)} FCFA\n` +
        `- Avance : ${formatAmount(mAvance)} FCFA\n` +
        `- Reste : ${formatAmount(mReste)} FCFA\n\n` +
        `Le fichier PDF a ete telecharge. Merci pour votre confiance !`;

      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`
        : `https://wa.me/?text=${encodeURIComponent(textMsg)}`;

      window.open(waUrl, '_blank');

    } catch (err: any) {
      console.error('Erreur génération PDF:', err);
      alert('Erreur génération PDF : ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const filteredVentes = ventes.filter(v =>
    (v.client_nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.client_tel || '').includes(search) ||
    getItemName(v).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Ventes & Factures</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Enregistrement et suivi</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-colors self-start md:self-auto cursor-pointer"
        >
          <Plus size={18} /> Enregistrer une vente
        </button>
      </div>

      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
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
                <tr><td colSpan={7} className="text-center py-6 text-slate-400">Chargement...</td></tr>
              ) : filteredVentes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400">Aucune vente enregistrée.</td></tr>
              ) : filteredVentes.map((v) => {
                const total = v.montant_total || 0;
                const avance = v.avance || 0;
                const reste = v.reste !== undefined ? v.reste : (total - avance);
                return (
                  <tr key={v.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{v.client_nom}</td>
                    <td className="p-3 text-slate-500">{v.client_tel || '-'}</td>
                    <td className="p-3 text-slate-700">{getItemName(v)}</td>
                    <td className="p-3 font-bold text-slate-900">{formatAmount(total)} FCFA</td>
                    <td className="p-3 text-emerald-600 font-semibold">{formatAmount(avance)} FCFA</td>
                    <td className="p-3 font-bold text-amber-600">{formatAmount(reste)} FCFA</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedVente(v)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-md shadow-xs transition-colors cursor-pointer"
                      >
                        Facture
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AJOUT */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200"
          >
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Nouvelle Vente</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVente} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Nom du client *</label>
                  <input
                    type="text"
                    required
                    value={formData.client_nom}
                    onChange={(e) => setFormData({ ...formData, client_nom: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={formData.client_tel}
                    onChange={(e) => setFormData({ ...formData, client_tel: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Désignation / Article *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tissu Bazin, Boubou VIP..."
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Prix Unitaire (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 25000"
                    value={formData.prix_unitaire}
                    onChange={(e) => setFormData({ ...formData, prix_unitaire: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Montant Total</label>
                  <input
                    type="text"
                    readOnly
                    value={`${formatAmount(montantTotalCalcul)} FCFA`}
                    className="w-full p-2 border border-slate-200 rounded-md bg-slate-100 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Avance versée (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 10000"
                    value={formData.avance}
                    onChange={(e) => setFormData({ ...formData, avance: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-emerald-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Reste à payer</label>
                  <input
                    type="text"
                    readOnly
                    value={`${formatAmount(resteCalcul)} FCFA`}
                    className="w-full p-2 border border-slate-200 rounded-md bg-amber-50 text-amber-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Observations</label>
                <textarea
                  rows={2}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Notes..."
                  className="w-full p-2 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FACTURE */}
      {selectedVente && (
        <div 
          onClick={() => setSelectedVente(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200 my-8"
          >
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer size={15} /> Imprimer
                </button>
                <button
                  onClick={handleSharePDFWhatsApp}
                  disabled={exporting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Share2 size={15} /> {exporting ? 'Génération...' : 'WhatsApp (PDF)'}
                </button>
              </div>

              <button
                onClick={() => setSelectedVente(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 border-2 border-amber-600/80 rounded-xl bg-white space-y-6">
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

              <div className="grid grid-cols-2 gap-4 border border-amber-200 rounded-lg p-3 bg-amber-50/20 text-xs">
                <div className="space-y-1">
                  <p><strong className="text-slate-800">Nom du client :</strong> {selectedVente.client_nom}</p>
                  <p><strong className="text-slate-800">Téléphone :</strong> <span className="text-amber-700 font-medium">{selectedVente.client_tel || '-'}</span></p>
                  <p><strong className="text-slate-800">Date :</strong> {selectedVente.created_at ? new Date(selectedVente.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="space-y-1">
                  <p><strong className="text-slate-800">Mode de commande :</strong> {selectedVente.mode_commande || 'Prêt-à-porter'}</p>
                  <p><strong className="text-slate-800">Mode de paiement :</strong> {selectedVente.mode_paiement || 'Espèces'}</p>
                </div>
              </div>

              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-amber-600 text-white font-bold uppercase">
                    <th className="p-2.5 rounded-tl-lg">Désignation</th>
                    <th className="p-2.5 text-center">Quantité</th>
                    <th className="p-2.5 text-right">Prix Unitaire</th>
                    <th className="p-2.5 text-right rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 border-b border-amber-200">
                  <tr>
                    <td className="p-2.5 font-medium text-slate-800">{getItemName(selectedVente)}</td>
                    <td className="p-2.5 text-center">{selectedVente.quantite || 1}</td>
                    <td className="p-2.5 text-right">{formatAmount(selectedVente.prix_unitaire || selectedVente.montant_total)} FCFA</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{formatAmount(selectedVente.montant_total)} FCFA</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <p className="font-bold text-slate-700 mb-1">OBSERVATIONS :</p>
                  <p className="text-slate-500 italic">{selectedVente.observations || 'Articles livrés en parfait état.'}</p>
                </div>

                <div className="space-y-1.5 text-right">
                  <div className="flex justify-between py-1 px-2 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">MONTANT TOTAL :</span>
                    <span className="font-bold text-slate-900">{formatAmount(selectedVente.montant_total)} FCFA</span>
                  </div>
                  <div className="flex justify-between py-1 px-2 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">AVANCE VERSÉE :</span>
                    <span className="font-bold text-emerald-600">{formatAmount(selectedVente.avance)} FCFA</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-2 bg-amber-600 text-white font-bold rounded-md">
                    <span>RESTE À PAYER :</span>
                    <span>{formatAmount(selectedVente.reste !== undefined ? selectedVente.reste : ((selectedVente.montant_total || 0) - (selectedVente.avance || 0)))} FCFA</span>
                  </div>
                </div>
              </div>

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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
