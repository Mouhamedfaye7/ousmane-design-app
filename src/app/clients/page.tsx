'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
autoTable from 'jspdf-autotable';

interface Client {
  id: string;
  nom: string;
  telephone: string;
  adresse: string;
  mesures: {
    cou: string;
    epaule: string;
    poitrine: string;
    longueurBras: string;
    tourBras: string;
    poignet: string;
    longueurHaut: string;
    ceinture: string;
    longueurPantalon: string;
    tourCuisse: string;
    tourCheville: string;
  };
  notes: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      nom: 'Omar Diome',
      telephone: '772028031',
      adresse: 'Dalifort',
      mesures: {
        cou: '41',
        epaule: '47',
        poitrine: '102',
        longueurBras: '65',
        tourBras: '38',
        poignet: '20',
        longueurHaut: '75',
        ceinture: '102',
        longueurPantalon: '98',
        tourCuisse: '51',
        tourCheville: '33',
      },
      notes: 'longueur bobou 145',
    },
  ]);

  const [selectedClient, setSelectedClient] = useState<Client>(clients[0]);

  const generatePDF = () => {
    if (!selectedClient) return;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(180, 83, 9);
    doc.text('Ousmane Design', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Fiche de Mesures Client', 14, 26);

    doc.setDrawColor(229, 231, 235);
    doc.line(14, 30, 196, 30);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Nom : ${selectedClient.nom}`, 14, 40);
    doc.text(`Téléphone : ${selectedClient.telephone || 'N/A'}`, 14, 47);
    doc.text(`Adresse : ${selectedClient.adresse || 'N/A'}`, 14, 54);

    const tableData = [
      ['Cou', `${selectedClient.mesures.cou || '-'} cm`, 'Épaule', `${selectedClient.mesures.epaule || '-'} cm`],
      ['Poitrine', `${selectedClient.mesures.poitrine || '-'} cm`, 'Lg. Bras', `${selectedClient.mesures.longueurBras || '-'} cm`],
      ['Tour Bras', `${selectedClient.mesures.tourBras || '-'} cm`, 'Poignet', `${selectedClient.mesures.poignet || '-'} cm`],
      ['Lg. Haut/Boubou', `${selectedClient.mesures.longueurHaut || '-'} cm`, 'Ceinture / Taille', `${selectedClient.mesures.ceinture || '-'} cm`],
      ['Lg. Pantalon', `${selectedClient.mesures.longueurPantalon || '-'} cm`, 'Tour Cuisse', `${selectedClient.mesures.tourCuisse || '-'} cm`],
      ['Tour Cheville', `${selectedClient.mesures.tourCheville || '-'} cm`, '', ''],
    ];

    (doc as any).autoTable({
      startY: 62,
      head: [['Mesure', 'Valeur', 'Mesure', 'Valeur']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [180, 83, 9] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 130;
    doc.setFontSize(11);
    doc.text('Notes & Particularités :', 14, finalY + 12);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(selectedClient.notes || 'Aucune note spécifique', 14, finalY + 19);

    doc.save(`Fiche_Mesures_${selectedClient.nom.replace(/\s+/g, '_')}.pdf`);
  };

  const shareWhatsApp = () => {
    if (!selectedClient) return;

    const phone = selectedClient.telephone ? `221${selectedClient.telephone.replace(/\s+/g, '')}` : '';

    const message = `*Ousmane Design - Fiche de Mesures*%0A%0A` +
      `*Client :* ${selectedClient.nom}%0A` +
      `----------------------------------%0A` +
      `• *Cou :* ${selectedClient.mesures.cou} cm%0A` +
      `• *Épaule :* ${selectedClient.mesures.epaule} cm%0A` +
      `• *Poitrine :* ${selectedClient.mesures.poitrine} cm%0A` +
      `• *Lg. Bras :* ${selectedClient.mesures.longueurBras} cm%0A` +
      `• *Tour Bras :* ${selectedClient.mesures.tourBras} cm%0A` +
      `• *Poignet :* ${selectedClient.mesures.poignet} cm%0A` +
      `• *Lg. Haut/Boubou :* ${selectedClient.mesures.longueurHaut} cm%0A` +
      `• *Ceinture/Taille :* ${selectedClient.mesures.ceinture} cm%0A` +
      `• *Lg. Pantalon :* ${selectedClient.mesures.longueurPantalon} cm%0A` +
      `• *Tour Cuisse :* ${selectedClient.mesures.tourCuisse} cm%0A` +
      `• *Tour Cheville :* ${selectedClient.mesures.tourCheville} cm%0A` +
      `----------------------------------%0A` +
      `*Notes :* ${selectedClient.notes || 'N/A'}`;

    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${message}`
      : `https://api.whatsapp.com/send?text=${message}`;

    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <Link href="/" className="text-sm text-slate-600 hover:underline">
          ← Retour au tableau de bord
        </Link>

        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Clients & Carnet de Mesures</h1>
            <p className="text-sm text-slate-500">Ousmane Design — Gestion des profils clients</p>
          </div>
          <button className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg font-medium shadow-sm">
            + Nouveau Client
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-2">
            {clients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${
                  selectedClient.id === c.id
                    ? 'border-amber-500 bg-amber-50/50'
                    : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-slate-800">{c.nom}</div>
                <div className="text-xs text-slate-500">{c.telephone}</div>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{selectedClient.nom}</h2>
                <div className="flex gap-4 text-sm text-slate-500 mt-1">
                  <span>{selectedClient.telephone}</span>
                  <span>{selectedClient.adresse}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={generatePDF}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 shadow-sm transition-colors"
                >
                  📄 PDF
                </button>

                <button
                  onClick={shareWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 shadow-sm transition-colors"
                >
                  Partager WhatsApp
                </button>

                <button className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Cou (cm)</label>
                <input
                  type="text"
                  value={selectedClient.mesures.cou}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      mesures: { ...selectedClient.mesures, cou: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Épaule (cm)</label>
                <input
                  type="text"
                  value={selectedClient.mesures.epaule}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      mesures: { ...selectedClient.mesures, epaule: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Poitrine (cm)</label>
                <input
                  type="text"
                  value={selectedClient.mesures.poitrine}
                  onChange={(e) =>
                    setSelectedClient({
                      ...selectedClient,
                      mesures: { ...selectedClient.mesures, poitrine: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Notes & Particularités du Modèle
              </label>
              <textarea
                value={selectedClient.notes}
                onChange={(e) => setSelectedClient({ ...selectedClient, notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm h-24"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
