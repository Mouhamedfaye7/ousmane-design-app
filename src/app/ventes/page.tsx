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
    return (Number(val) || 0).toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
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

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        const mTotal = selectedVente.montant_total || 0;
        const mAvance = selectedVente.avance || 0;
        const mReste = selectedVente.reste !== undefined ? selectedVente.reste : (mTotal - mAvance);
        const formattedDate = selectedVente.created_at 
          ? new Date(selectedVente.created_at).toLocaleDateString('fr-FR')
          : new Date().toLocaleDateString('fr-FR');

        // 1. Cadre extérieur ambre
        doc.setLineWidth(0.8);
        doc.setDrawColor(217, 119, 6);
        doc.roundedRect(10, 10, 190, 277, 3, 3, 'S');

        // 2. En-tête : Titre & Sous-titre
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(120, 53, 15);
        doc.text('Ousmane Design', 16, 25);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(217, 119, 6);
        doc.text('CREATION & COUTURE CONTEMPORAINE', 16, 30);

        // 3. Bloc Coordonnées (En haut à droite avec icônes visuelles)
        doc.setDrawColor(254, 215, 170);
        doc.setFillColor(255, 251, 235);
        doc.roundedRect(118, 15, 77, 24, 2, 2, 'FD');

        // Dessin des icônes de contact
        // Icône Adresse (Pin/Cercle)
        doc.setFillColor(217, 119, 6);
        doc.circle(123, 21, 1.8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text('Hann Maristes, Dakar, Senegal', 127, 22);

        // Icône Téléphone
        doc.setFillColor(217, 119, 6);
        doc.circle(123, 27, 1.8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Tel: 77 646 21 02 / 70 348 26 82', 127, 28);

        // Icône Email
        doc.setFillColor(217, 119, 6);
        doc.circle(123, 33, 1.8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Email: @ousmanedesign.sn', 127, 34);

        // 4. Bloc Infos Client (Fond ultra clair, haute lisibilité)
        doc.setDrawColor(254, 215, 170);
        doc.setFillColor(255, 251, 235);
        doc.roundedRect(16, 45, 179, 25, 2, 2, 'FD');

        // Ligne 1 : Client & Mode de commande
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text('Nom du client :', 20, 52);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${selectedVente.client_nom || ''}`, 50, 52);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Mode de commande :', 112, 52);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${selectedVente.mode_commande || 'Pret-a-porter'}`, 150, 52);

        // Ligne 2 : Téléphone & Mode de paiement
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Telephone :', 20, 58);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6);
        doc.text(`${selectedVente.client_tel || '-'}`, 50, 58);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Mode de paiement :', 112, 58);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${selectedVente.mode_paiement || 'Especes'}`, 150, 58);

        // Ligne 3 : Date
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Date :', 20, 64);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${formattedDate}`, 50, 64);

        // 5. Tableau des articles
        autoTable(doc, {
          startY: 76,
          margin: { left: 16, right: 15 },
          head: [['DESIGNATION', 'QUANTITE', 'PRIX UNITAIRE', 'TOTAL']],
          body: [
            [
              getItemName(selectedVente),
              selectedVente.quantite || 1,
              `${formatAmount(selectedVente.prix_unitaire || mTotal)} FCFA`,
              `${formatAmount(mTotal)} FCFA`
            ]
          ],
          headStyles: { 
            fillColor: [217, 119, 6], 
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left'
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 30 },
            2: { halign: 'right', cellWidth: 45 },
            3: { halign: 'right', cellWidth: 45, fontStyle: 'bold' }
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [30, 41, 59],
            fontStyle: 'bold'
          },
          theme: 'plain',
        });

        // @ts-ignore
        const finalY = (doc as any).lastAutoTable?.finalY || 105;

        // 6. Bloc Observations
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(16, finalY + 8, 85, 32, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text('OBSERVATIONS :', 20, finalY + 15);
        
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        const obsText = selectedVente.observations || 'Articles livres en parfait etat.';
        doc.text(doc.splitTextToSize(obsText, 77), 20, finalY + 22);

        // 7. Totaux Financiers (Texte en gras)
        const totalX = 110;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        // Montant Total
        doc.setTextColor(51, 65, 85);
        doc.text('MONTANT TOTAL :', totalX, finalY + 14);
        doc.setTextColor(15, 23, 42);
        doc.text(`${formatAmount(mTotal)} FCFA`, 190, finalY + 14, { align: 'right' });

        doc.setDrawColor(241, 245, 249);
        doc.line(totalX, finalY + 17, 190, finalY + 17);

        // Avance Versée
        doc.setTextColor(51, 65, 85);
        doc.text('AVANCE VERSEE :', totalX, finalY + 23);
        doc.setTextColor(16, 185, 129);
        doc.text(`${formatAmount(mAvance)} FCFA`, 190, finalY + 23, { align: 'right' });

        doc.line(totalX, finalY + 26, 190, finalY + 26);

        // Encadré Reste à Payer (Orange vif)
        doc.setFillColor(217, 119, 6);
        doc.roundedRect(totalX - 2, finalY + 29, 83, 10, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('RESTE A PAYER :', totalX + 2, finalY + 35.5);
        doc.text(`${formatAmount(mReste)} FCFA`, 188, finalY + 35.5, { align: 'right' });

        // 8. Signatures en bas
        const sigY = finalY + 65;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text('SIGNATURE DU CLIENT', 35, sigY, { align: 'center' });
        doc.text('OUSMANE DESIGN (SIGNATURE & CACHET)', 145, sigY, { align: 'center' });

        doc.setLineWidth(0.3);
        doc.setDrawColor(203, 213, 225);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(16, sigY + 12, 85, sigY + 12);
        doc.line(110, sigY + 12, 185, sigY + 12);

        const safeName = (selectedVente.client_nom || 'Client').replace(/\s+/g, '_');
        doc.save(`Facture_${safeName}.pdf`);
      }

      // Redirection WhatsApp avec message pré-rempli
      let cleanPhone = (selectedVente.client_tel || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
      if (cleanPhone.length === 9) cleanPhone = '221' + cleanPhone;

      const mTotal = selectedVente.montant_total || 0;
      const mAvance = selectedVente.avance || 0;
      const mReste = selectedVente.reste !== undefined ? selectedVente.reste : (mTotal - mAvance);

      const textMsg = `Bonjour ${selectedVente.client_nom},\n\nVoici votre facture de chez *Ousmane Design* :\n` +
        `- Article : ${getItemName(selectedVente)}\n` +
        `- Total : ${formatAmount(mTotal)} FCFA\n` +
        `- Avance versée : ${formatAmount(mAvance)} FCFA\n` +
        `- Reste à payer : ${formatAmount(mReste)} FCFA\n\n` +
        `Le fichier PDF de votre facture a été téléchargé. Merci pour votre confiance !`;

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

      {/* MODAL FACTURE VISUELLE */}
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

                <div className="border border-amber-200 bg-amber-50/50 p-3 rounded-lg text-xs text-slate-800 space-y-1.5 font-medium shadow-2xs">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-amber-600 shrink-0" />
                    <span>Hann Maristes, Dakar, Sénégal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-amber-600 shrink-0" />
                    <span>77 646 21 02 / 70 348 26 82</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-amber-600 shrink-0" />
                    <span>@ousmanedesign.sn</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border border-amber-200 rounded-lg p-3 bg-amber-50/30 text-xs">
                <div className="space-y-1.5">
                  <p><strong className="text-slate-900">Nom du client :</strong> <span className="font-bold text-slate-900">{selectedVente.client_nom}</span></p>
                  <p><strong className="text-slate-900">Téléphone :</strong> <span className="text-amber-700 font-bold">{selectedVente.client_tel || '-'}</span></p>
                  <p><strong className="text-slate-900">Date :</strong> <span className="font-bold text-slate-800">{selectedVente.created_at ? new Date(selectedVente.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</span></p>
                </div>
                <div className="space-y-1.5">
                  <p><strong className="text-slate-900">Mode de commande :</strong> <span className="font-bold text-slate-800">{selectedVente.mode_commande || 'Prêt-à-porter'}</span></p>
                  <p><strong className="text-slate-900">Mode de paiement :</strong> <span className="font-bold text-slate-800">{selectedVente.mode_paiement || 'Espèces'}</span></p>
                </div>
              </div>

              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-amber-600 text-white font-bold uppercase">
                    <th className="p-2.5 rounded-tl-lg">DÉSIGNATION</th>
                    <th className="p-2.5 text-center">QUANTITÉ</th>
                    <th className="p-2.5 text-right">PRIX UNITAIRE</th>
                    <th className="p-2.5 text-right rounded-tr-lg">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 border-b border-amber-200">
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900">{getItemName(selectedVente)}</td>
                    <td className="p-2.5 text-center font-bold">{selectedVente.quantite || 1}</td>
                    <td className="p-2.5 text-right font-bold">{formatAmount(selectedVente.prix_unitaire || selectedVente.montant_total)} FCFA</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{formatAmount(selectedVente.montant_total)} FCFA</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <p className="font-bold text-slate-800 mb-1">OBSERVATIONS :</p>
                  <p className="text-slate-600 italic font-medium">{selectedVente.observations || 'Articles livrés en parfait état.'}</p>
                </div>

                <div className="space-y-1.5 text-right">
                  <div className="flex justify-between py-1 px-2 border-b border-slate-100">
                    <span className="text-slate-700 font-bold">MONTANT TOTAL :</span>
                    <span className="font-bold text-slate-900">{formatAmount(selectedVente.montant_total)} FCFA</span>
                  </div>
                  <div className="flex justify-between py-1 px-2 border-b border-slate-100">
                    <span className="text-slate-700 font-bold">AVANCE VERSÉE :</span>
                    <span className="font-bold text-emerald-600">{formatAmount(selectedVente.avance)} FCFA</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-2 bg-amber-600 text-white font-bold rounded-md">
                    <span>RESTE À PAYER :</span>
                    <span>{formatAmount(selectedVente.reste !== undefined ? selectedVente.reste : ((selectedVente.montant_total || 0) - (selectedVente.avance || 0)))} FCFA</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-8 text-[11px] text-center font-bold text-slate-800">
                <div>
                  <p className="uppercase tracking-wider">SIGNATURE DU CLIENT</p>
                  <div className="mt-8 border-b border-dashed border-slate-300"></div>
                </div>
                <div>
                  <p className="uppercase tracking-wider">OUSMANE DESIGN (SIGNATURE & CACHET)</p>
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
