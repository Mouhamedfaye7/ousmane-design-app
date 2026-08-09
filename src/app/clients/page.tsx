'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Search, Save, Share2, Ruler } from 'lucide-react';
import jsPDF from 'jspdf';

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
    notes: string;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      nom: 'Mouhamed Faye',
      telephone: '785112139',
      adresse: 'Keur massar',
      mesures: {
        cou: '41',
        epaule: '51',
        poitrine: '102',
        longueurBras: '64',
        tourBras: '36',
        poignet: '22',
        longueurHaut: '95',
        ceinture: '88',
        longueurPantalon: '105',
        tourCuisse: '58',
        tourCheville: '38',
        notes: 'Préfère les cols officiers, manches un peu plus larges.'
      }
    },
    {
      id: '2',
      nom: 'Ousmane Faye',
      telephone: '77 646 21 02',
      adresse: 'Dakar',
      mesures: {
        cou: '42', epaule: '52', poitrine: '', longueurBras: '',
        tourBras: '', poignet: '', longueurHaut: '', ceinture: '',
        longueurPantalon: '', tourCuisse: '', tourCheville: '', notes: ''
      }
    }
  ]);

  const [selectedClient, setSelectedClient] = useState<Client>(clients[0]);
  const [search, setSearch] = useState('');
  const [tailleurPhone, setTailleurPhone] = useState('');

  // Fonction de génération et partage du PDF
  const generateAndSharePDF = () => {
    const doc = new jsPDF();
    const c = selectedClient;
    const m = c.mesures;

    // En-tête du document
    doc.setFillColor(180, 83, 9); // Couleur Amber/Chocolat Ousmane Design
    doc.rect(0, 0, 210, 28, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("OUSMANE DESIGN", 14, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Fiche de Mesures - Atelier de Couture", 130, 18);

    // Infos Client
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Client : ${c.nom}`, 14, 40);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Téléphone : ${c.telephone}  |  Adresse : ${c.adresse || 'N/A'}`, 14, 47);

    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 52, 196, 52);

    // Tableau des Mesures
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("TABLEAU DES MESURES (en cm)", 14, 62);

    const data = [
      ["Cou", m.cou || '-', "Longueur Bras", m.longueurBras || '-'],
      ["Épaule", m.epaule || '-', "Tour de Bras", m.tourBras || '-'],
      ["Poitrine", m.poitrine || '-', "Poignet", m.poignet || '-'],
      ["Longueur Haut / Boubou", m.longueurHaut || '-', "Ceinture / Taille", m.ceinture || '-'],
      ["Longueur Pantalon", m.longueurPantalon || '-', "Tour Cuisse", m.tourCuisse || '-'],
      ["Tour Cheville", m.tourCheville || '-', "-", "-"]
    ];

    let y = 72;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    data.forEach((row, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 5, 182, 9, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${row[0]} :`, 18, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${row[1]} cm`, 65, y);

      if (row[2] !== '-') {
        doc.setFont('helvetica', 'bold');
        doc.text(`${row[2]} :`, 110, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${row[3]} cm`, 160, y);
      }
      y += 10;
    });

    // Remarques / Instructions
    if (m.notes) {
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text("Notes & Particularités :", 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(m.notes, 14, y);
    }

    // Téléchargement automatique du fichier PDF
    const fileName = `Mesures_${c.nom.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);

    // Préparation du lien WhatsApp
    const rawTailleur = tailleurPhone.match(/\d+/g)?.join('') || '';
    let phone = rawTailleur.length === 9 ? `221${rawTailleur}` : rawTailleur;

    const message = encodeURIComponent(
      `Bonjour,\n\nVoici la fiche de mesures de *${c.nom}* (${c.telephone}) pour la confection chez *Ousmane Design*.\n` +
      `Le fichier PDF *${fileName}* a été généré et téléchargé, vous pouvez le joindre ici.`
    );

    const waUrl = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const handleInputChange = (field: string, value: string) => {
    setSelectedClient({
      ...selectedClient,
      mesures: { ...selectedClient.mesures, [field]: value }
    });
  };

  const filteredClients = clients.filter(c => 
    c.nom.toLowerCase().includes(search.toLowerCase()) || 
    c.telephone.includes(search)
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Clients & Carnet de Mesures</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Gestion des profils clients</p>
        </div>
        <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
          <UserPlus size={18} /> Nouveau Client
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colonne Gauche : Liste des clients */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher nom, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            {filteredClients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                  selectedClient.id === c.id
                    ? 'bg-amber-50/80 border-amber-400 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.nom}</h3>
                  <p className="text-xs text-slate-500">📞 {c.telephone}</p>
                </div>
                <Ruler size={16} className={selectedClient.id === c.id ? 'text-amber-600' : 'text-slate-300'} />
              </div>
            ))}
          </div>
        </div>

        {/* Colonne Droite : Formulaire des Mesures & Partage */}
        <div className="md:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedClient.nom}</h2>
              <p className="text-xs text-slate-500">📞 {selectedClient.telephone}  |  📍 {selectedClient.adresse || 'Keur Massar'}</p>
            </div>
            
            <div className="flex gap-2">
              <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm">
                <Save size={16} /> Enregistrer
              </button>
            </div>
          </div>

          {/* Formulaire des mesures */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Cou (cm)', key: 'cou' },
              { label: 'Épaule (cm)', key: 'epaule' },
              { label: 'Poitrine (cm)', key: 'poitrine' },
              { label: 'Longueur Bras (cm)', key: 'longueurBras' },
              { label: 'Tour de Bras (cm)', key: 'tourBras' },
              { label: 'Poignet (cm)', key: 'poignet' },
              { label: 'Longueur Boubou/Haut (cm)', key: 'longueurHaut' },
              { label: 'Ceinture/Taille (cm)', key: 'ceinture' },
              { label: 'Longueur Pantalon (cm)', key: 'longueurPantalon' },
              { label: 'Tour Cuisse (cm)', key: 'tourCuisse' },
              { label: 'Tour Cheville (cm)', key: 'tourCheville' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
                <input
                  type="text"
                  value={(selectedClient.mesures as any)[field.key] || ''}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Particularités du Modèle</label>
            <textarea
              rows={2}
              value={selectedClient.mesures.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Ex: Préfère les col officier, manches un peu plus larges..."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Zone de Partage Tailleur / WhatsApp */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 pt-4">
            <div className="w-full md:w-1/2">
              <label className="block text-xs font-bold text-emerald-900 mb-1">Numéro du Tailleur (optionnel)</label>
              <input
                type="text"
                placeholder="Ex: 771234567"
                value={tailleurPhone}
                onChange={(e) => setTailleurPhone(e.target.value)}
                className="w-full border border-emerald-300 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <button
              onClick={generateAndSharePDF}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Share2 size={18} /> Télécharger & Partager PDF par WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
