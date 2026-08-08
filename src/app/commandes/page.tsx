'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, Calendar, User, MessageCircle, Printer } from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  nom_complet: string;
  telephone: string;
}

interface Commande {
  id: string;
  code_suivi?: string;
  client_id: string;
  client?: Client;
  description_modele: string;
  prix_total: number;
  acompte: number;
  statut: 'Reçue' | 'En Coupe' | 'Couture' | 'Essayage' | 'Prête' | 'Livrée';
  date_livraison: string;
  created_at: string;
}

const STATUTS = [
  { label: 'Reçue', key: 'Reçue', bg: 'bg-slate-100 text-slate-800' },
  { label: 'En Coupe', key: 'En Coupe', bg: 'bg-blue-100 text-blue-800' },
  { label: 'Couture', key: 'Couture', bg: 'bg-purple-100 text-purple-800' },
  { label: 'Essayage', key: 'Essayage', bg: 'bg-amber-100 text-amber-800' },
  { label: 'Prête', key: 'Prête', bg: 'bg-emerald-100 text-emerald-800' },
  { label: 'Livrée', key: 'Livrée', bg: 'bg-[#b8860b] text-white' },
];

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [description, setDescription] = useState('');
  const [prixTotal, setPrixTotal] = useState('');
  const [acompte, setAcompte] = useState('');
  const [dateLivraison, setDateLivraison] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCommandes();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, nom_complet, telephone').order('nom_complet');
    if (data) setClients(data);
  };

  const fetchCommandes = async () => {
    const { data } = await supabase
      .from('commandes')
      .select('*, client:clients(nom_complet, telephone)')
      .order('created_at', { ascending: false });

    if (data) setCommandes(data as any);
  };

  const handleCreateCommande = async () => {
    if (!selectedClientId || !prixTotal) {
      alert("Veuillez sélectionner un client et entrer un prix total.");
      return;
    }
    setLoading(true);

    const generatedCode = 'CMD-' + Math.floor(100000 + Math.random() * 900000);

    const { error } = await supabase.from('commandes').insert([{
      client_id: selectedClientId,
      code_suivi: generatedCode,
      description_modele: description || 'Commande Sur-Mesure',
      prix_total: parseFloat(prixTotal) || 0,
      acompte: parseFloat(acompte) || 0,
      statut: 'Reçue',
      date_livraison: dateLivraison || null
    }]);

    setLoading(false);

    if (error) {
      alert("Erreur lors de la création : " + error.message);
      return;
    }

    setIsModalOpen(false);
    setSelectedClientId('');
    setDescription('');
    setPrixTotal('');
    setAcompte('');
    setDateLivraison('');
    fetchCommandes();
  };

  const printFacture = (cmd: Commande) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reste = cmd.prix_total - cmd.acompte;

    printWindow.document.write(`
      <html>
        <head>
          <title>Facture ${cmd.code_suivi || 'Commande'}</title>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #b8860b; padding-bottom: 10px; }
            .header h1 { margin: 0; color: #b8860b; font-size: 24px; }
            .details { margin: 20px 0; font-size: 14px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .table th { background-color: #f8f9fa; }
            .total-box { margin-top: 20px; text-align: right; font-size: 16px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>OUSMANE DESIGN</h1>
            <p>Haute Couture & Sur-Mesure | Dakar, Sénégal</p>
          </div>

          <div class="details">
            <p><strong>Code Commande :</strong> ${cmd.code_suivi || 'N/A'}</p>
            <p><strong>Client :</strong> ${cmd.client?.nom_complet || 'Inconnu'} (${cmd.client?.telephone || 'N/A'})</p>
            <p><strong>Date :</strong> ${new Date(cmd.created_at).toLocaleDateString('fr-FR')}</p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Prix Total</th>
                <th>Acompte Versé</th>
                <th>Reste à Payer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${cmd.description_modele}</td>
                <td>${cmd.prix_total.toLocaleString()} FCFA</td>
                <td>${cmd.acompte.toLocaleString()} FCFA</td>
                <td><strong>${reste.toLocaleString()} FCFA</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Merci pour votre confiance ! À bientôt chez Ousmane Design.</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const sendWhatsAppNotification = (cmd: Commande) => {
    if (!cmd.client?.telephone) {
      alert("Ce client n'a pas de numéro de téléphone renseigné.");
      return;
    }

    let phone = cmd.client.telephone.replace(/\s+/g, '').replace('+', '');
    if (!phone.startsWith('221') && phone.length === 9) {
      phone = '221' + phone;
    }

    const reste = cmd.prix_total - cmd.acompte;
    const message = `Bonjour ${cmd.client.nom_complet},\n\nVotre commande *${cmd.description_modele}* (Réf: ${cmd.code_suivi || 'N/A'}) est *prête* chez Ousmane Design ! ✂️✨\n\n` +
      `------------------------\n` +
      `💰 *Montant restant à payer :* ${reste.toLocaleString()} FCFA\n` +
      `------------------------\n\n` +
      `Vous pouvez passer à l'atelier pour la récupérer. Merci pour votre confiance !`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const updateStatut = async (cmd: Commande, newStatut: string) => {
    const { error } = await supabase
      .from('commandes')
      .update({ statut: newStatut })
      .eq('id', cmd.id);

    if (!error) {
      fetchCommandes();
      if (newStatut === 'Prête') {
        const confirmSend = window.confirm(`La commande est marquée comme PRÊTE !\nVoulez-vous envoyer un message WhatsApp à ${cmd.client?.nom_complet} ?`);
        if (confirmSend) {
          sendWhatsAppNotification({ ...cmd, statut: 'Prête' });
        }
      }
    } else {
      alert("Erreur mise à jour statut : " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Suivi d'Atelier & Commandes</h1>
          <p className="text-slate-500 text-sm">Ousmane Design — Pilotage de la production</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2.5 bg-[#b8860b] hover:bg-[#966d09] text-white font-medium rounded-xl shadow-sm transition"
        >
          <Plus className="w-5 h-5 mr-2" /> Nouvelle Commande
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-6">
        {STATUTS.map(st => {
          const listInStatut = commandes.filter(c => c.statut === st.key);
          return (
            <div key={st.key} className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200 min-w-[220px] flex flex-col h-full">
              <div className="flex justify-between items-center mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${st.bg}`}>
                  {st.label}
                </span>
                <span className="text-xs font-bold text-slate-400">{listInStatut.length}</span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px]">
                {listInStatut.map(cmd => (
                  <div key={cmd.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-900 text-xs flex items-center">
                        <User className="w-3.5 h-3.5 mr-1 text-[#b8860b]" /> {cmd.client?.nom_complet || 'Client inconnu'}
                      </p>
                      {cmd.code_suivi && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {cmd.code_suivi}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium line-clamp-2">{cmd.description_modele}</p>

                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                      <span>Total: <strong>{cmd.prix_total?.toLocaleString()} F</strong></span>
                      <span className="text-amber-800">Reste: <strong>{(cmd.prix_total - cmd.acompte)?.toLocaleString()} F</strong></span>
                    </div>

                    <div className="pt-2 flex items-center gap-1.5">
                      <select
                        value={cmd.statut}
                        onChange={e => updateStatut(cmd, e.target.value)}
                        className="w-full text-[11px] p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#b8860b]"
                      >
                        {STATUTS.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => printFacture(cmd)}
                        title="Imprimer le reçu"
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition shrink-0"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => sendWhatsAppNotification(cmd)}
                        title="Informer le client sur WhatsApp"
                        className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {listInStatut.length === 0 && (
                  <p className="text-center py-6 text-xs text-slate-400">Aucune commande</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Nouvelle Commande Sur-Mesure</h2>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Client *</label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
                >
                  <option value="">-- Sélectionner un client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom_complet} ({c.telephone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description du Modèle / Tissu</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Boubou Getzner 3 pièces brodé or..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prix Total (FCFA) *</label>
                  <input
                    type="number"
                    value={prixTotal}
                    onChange={e => setPrixTotal(e.target.value)}
                    placeholder="Ex: 35000"
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Acompte Versé (FCFA)</label>
                  <input
                    type="number"
                    value={acompte}
                    onChange={e => setAcompte(e.target.value)}
                    placeholder="Ex: 15000"
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date de livraison souhaitée</label>
                <input
                  type="date"
                  value={dateLivraison}
                  onChange={e => setDateLivraison(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-sm">Annuler</button>
              <button onClick={handleCreateCommande} disabled={loading} className="px-4 py-2 bg-[#b8860b] text-white rounded-lg text-sm font-semibold">
                {loading ? 'Enregistrement...' : 'Enregistrer Commande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
