'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Printer, Share2, MapPin, Phone, Mail, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Commande {
  id?: string;
  code_commande?: string;
  client_nom: string;
  client_tel: string;
  statut?: string;
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
  created_at?: string;
}

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCommandes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('commandes').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setCommandes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCommandes();
  }, []);

  const formatAmount = (val: number | undefined | null) => {
    return (Number(val) || 0).toLocaleString('fr-FR').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  };

  const getItemName = (c: Commande) => {
    return c.designation || c.article || c.description || c.modele || 'Commande sur mesure';
  };

  const handleShareWhatsApp = (c: Commande) => {
    // Nettoyage strict du numéro : suppression de tout ce qui n'est pas un chiffre
    let cleanPhone = (c.client_tel || '').trim().replace(/[^0-9]/g, '');
    
    if (cleanPhone.length === 9) {
      cleanPhone = '221' + cleanPhone;
    }

    const total = c.montant_total || 0;
    const avance = c.avance || 0;
    const reste = c.reste !== undefined ? c.reste : (total - avance);

    const textMsg = `Bonjour ${c.client_nom.trim()},\n\nVoici le récapitulatif de votre commande *${c.code_commande || ''}* chez *Ousmane Design* :\n` +
      `- Article : ${getItemName(c)}\n` +
      `- Statut : ${c.statut || 'Reçue'}\n` +
      `- Total : ${formatAmount(total)} FCFA\n` +
      `- Avance : ${formatAmount(avance)} FCFA\n` +
      `- Reste à payer : ${formatAmount(reste)} FCFA\n\n` +
      `Merci pour votre confiance !`;

    const encodedText = encodeURIComponent(textMsg);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
  };

  const filteredCommandes = commandes.filter(c =>
    (c.client_nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.client_tel || '').includes(search) ||
    (c.code_commande || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { title: 'Reçue', key: 'Reçue' },
    { title: 'En Coupe', key: 'En Coupe' },
    { title: 'Prête', key: 'Prête' },
    { title: 'Livrée', key: 'Livrée' }
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Suivi d'Atelier & Commandes</h1>
          <p className="text-sm text-slate-500">Ousmane Design — Pilotage de la production</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(col => {
          const items = filteredCommandes.filter(c => (c.statut || 'Reçue') === col.key);
          return (
            <div key={col.key} className="bg-slate-200/60 p-4 rounded-xl border border-slate-300/60">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-slate-800 text-sm">{col.title}</h2>
                <span className="bg-slate-300 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>

              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">Aucune commande</p>
                ) : (
                  items.map(c => (
                    <div key={c.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{c.client_nom}</h3>
                          <p className="text-xs text-slate-500">({c.client_tel || '-'})</p>
                        </div>
                        {c.code_commande && (
                          <span className="text-[10px] bg-slate-100 border border-slate-300 font-mono font-semibold px-1.5 py-0.5 rounded text-slate-600">
                            {c.code_commande}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 font-medium">{getItemName(c)}</p>

                      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                        <span className="text-slate-500">Total: <strong className="text-slate-800">{formatAmount(c.montant_total)} F</strong></span>
                        <span className="text-amber-600 font-bold">Reste: {formatAmount(c.reste !== undefined ? c.reste : ((c.montant_total || 0) - (c.avance || 0)))} F</span>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => handleShareWhatsApp(c)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          title="Partager sur WhatsApp"
                        >
                          <Share2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
