'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Plus, Save, Trash2, Send, Ruler } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Client {
  id?: string;
  nom: string;
  telephone: string;
  adresse: string;
  cou?: number;
  epaule?: number;
  poitrine?: number;
  longueur_bras?: number;
  tour_bras?: number;
  poignet?: number;
  longueur_haut?: number;
  ceinture?: number;
  longueur_pantalon?: number;
  tour_cuisse?: number;
  tour_cheville?: number;
  notes?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setClients(data);
      setSelectedClient(data[0]);
    } else {
      setClients([]);
      setSelectedClient(null);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedClient || !selectedClient.nom) return alert('Veuillez remplir le nom');

    if (selectedClient.id) {
      await supabase.from('clients').update(selectedClient).eq('id', selectedClient.id);
    } else {
      const { data } = await supabase.from('clients').insert([selectedClient]).select();
      if (data && data[0]) setSelectedClient(data[0]);
    }
    alert('Client enregistré avec succès !');
    fetchClients();
  };

  const handleDeleteClient = async () => {
    if (!selectedClient || !selectedClient.id) return;
    if (confirm(`Voulez-vous vraiment supprimer le client ${selectedClient.nom} ?`)) {
      await supabase.from('clients').delete().eq('id', selectedClient.id);
      alert('Client supprimé.');
      fetchClients();
    }
  };

  const handleNewClient = () => {
    const newC: Client = {
      nom: '',
      telephone: '',
      adresse: '',
      notes: ''
    };
    setSelectedClient(newC);
  };

  const filteredClients = clients.filter(c => 
    c.nom.toLowerCase().includes(search.toLowerCase()) || 
    c.telephone?.includes(search)
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Clients & Carnet de Mesures</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Gestion des profils clients</p>
        </div>
        <button 
          onClick={handleNewClient}
          className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs"
        >
          <Plus size={18} /> Nouveau Client
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LISTE CLIENTS */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher nom, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-sm outline-none"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredClients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c)}
                className={`p-4 rounded-xl border cursor-pointer transition-all bg-white ${
                  selectedClient?.id === c.id 
                    ? 'border-amber-500 ring-2 ring-amber-500/20' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{c.nom || 'Sans nom'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{c.telephone || 'Sans téléphone'}</p>
                  </div>
                  <Ruler size={16} className="text-amber-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FORMULAIRE & MESURES */}
        {selectedClient ? (
          <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <input
                  type="text"
                  value={selectedClient.nom}
                  onChange={(e) => setSelectedClient({...selectedClient, nom: e.target.value})}
                  placeholder="Nom complet du client"
                  className="text-2xl font-bold text-slate-900 border-b border-dashed border-slate-300 focus:border-amber-500 outline-none pb-1"
                />
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="text"
                    value={selectedClient.telephone}
                    onChange={(e) => setSelectedClient({...selectedClient, telephone: e.target.value})}
                    placeholder="Numéro Téléphone"
                    className="text-xs text-slate-500 border-b border-slate-200 outline-none"
                  />
                  <input
                    type="text"
                    value={selectedClient.adresse}
                    onChange={(e) => setSelectedClient({...selectedClient, adresse: e.target.value})}
                    placeholder="Adresse / Quartier"
                    className="text-xs text-slate-500 border-b border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedClient.id && (
                  <button
                    onClick={handleDeleteClient}
                    className="bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-lg flex items-center justify-center transition-colors"
                    title="Supprimer ce client"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-xs"
                >
                  <Save size={16} /> Enregistrer
                </button>
              </div>
            </div>

            {/* GRILLE DES MESURES */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Cou (cm)', key: 'cou' },
                { label: 'Épaule (cm)', key: 'epaule' },
                { label: 'Poitrine (cm)', key: 'poitrine' },
                { label: 'Longueur Bras (cm)', key: 'longueur_bras' },
                { label: 'Tour de Bras (cm)', key: 'tour_bras' },
                { label: 'Poignet (cm)', key: 'poignet' },
                { label: 'Longueur Boubou/Haut (cm)', key: 'longueur_haut' },
                { label: 'Ceinture/Taille (cm)', key: 'ceinture' },
                { label: 'Longueur Pantalon (cm)', key: 'longueur_pantalon' },
                { label: 'Tour Cuisse (cm)', key: 'tour_cuisse' },
                { label: 'Tour Cheville (cm)', key: 'tour_cheville' },
              ].map((m) => (
                <div key={m.key}>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">{m.label}</label>
                  <input
                    type="number"
                    value={(selectedClient as any)[m.key] || ''}
                    onChange={(e) => setSelectedClient({...selectedClient, [m.key]: e.target.value ? Number(e.target.value) : ''})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:bg-white focus:border-amber-500"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Notes & Particularités</label>
              <textarea
                value={selectedClient.notes || ''}
                onChange={(e) => setSelectedClient({...selectedClient, notes: e.target.value})}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:bg-white focus:border-amber-500"
              />
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
            Sélectionnez un client ou cliquez sur "Nouveau Client".
          </div>
        )}
      </div>
    </div>
  );
}
