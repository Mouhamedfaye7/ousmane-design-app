// ============================================================================
// SOURCE UNIQUE DE VÉRITÉ — calculs financiers de toute l'application
// Accueil, Statistiques, Commandes et Dépenses utilisent TOUS ces fonctions.
// Pour changer une règle de calcul, on la change ICI, une seule fois.
// ============================================================================

export interface CommandeLike {
  montant_total?: number | null;
  avance?: number | null;
  acompte?: number | null;
  reste?: number | null;
  statut?: string | null;
}

export interface VenteLike {
  mode_commande?: string | null;
  montant_total?: number | null;
  avance?: number | null;
  reste?: number | null;
}

// Montants stockés en "milliers" par d'anciennes versions (ex: 25 -> 25 000)
export const normalizeAmount = (val: number | null | undefined): number => {
  let num = Number(val) || 0;
  if (num > 0 && num < 1000) num = num * 1000;
  return num;
};

// Une vente "Sur Mesure" est le solde d'une commande : la commande la compte déjà.
// Il ne faut JAMAIS l'additionner en plus (double comptage).
export const isVenteBoutique = (v: VenteLike): boolean =>
  !(v.mode_commande || '').startsWith('Sur Mesure');

// Règle commandes : Livrée / Soldée = entièrement réglée. Sinon le reste est
// TOUJOURS calculé (total - avance), jamais lu tel quel depuis la colonne "reste".
export const getCommandeFinancials = (c: CommandeLike) => {
  const tot = Number(c.montant_total) || 0;
  const storedReste =
    c.reste === undefined || c.reste === null ? null : Number(c.reste);
  const estSoldee =
    c.statut === 'Livrée' ||
    c.statut === 'Soldée' ||
    (storedReste === 0 && tot > 0);

  const av = estSoldee ? tot : Number(c.avance ?? c.acompte) || 0;
  const reste = estSoldee ? 0 : Math.max(0, tot - av);
  return { tot, av, reste };
};

// Règle ventes boutique : le reste est toujours calculé (total - avance).
export const getVenteFinancials = (v: VenteLike) => {
  const tot = normalizeAmount(v.montant_total);
  const av = normalizeAmount(v.avance);
  const reste = Math.max(0, tot - av);
  return { tot, av, reste };
};

// Totaux globaux : commandes sur-mesure + ventes boutique (hors soldes de commandes)
export function computeFinanceTotals(
  commandes: CommandeLike[],
  ventes: VenteLike[]
) {
  const ventesBoutique = ventes.filter(isVenteBoutique);

  let caCommandes = 0, avanceCommandes = 0, resteCommandes = 0;
  for (const c of commandes) {
    const f = getCommandeFinancials(c);
    caCommandes += f.tot;
    avanceCommandes += f.av;
    resteCommandes += f.reste;
  }

  let caBoutique = 0, avanceBoutique = 0, resteBoutique = 0;
  for (const v of ventesBoutique) {
    const f = getVenteFinancials(v);
    caBoutique += f.tot;
    avanceBoutique += f.av;
    resteBoutique += f.reste;
  }

  return {
    caCommandes,
    caBoutique,
    caTotal: caCommandes + caBoutique,
    avanceCommandes,
    avanceBoutique,
    totalAvances: avanceCommandes + avanceBoutique,
    resteCommandes,
    resteBoutique,
    totalReste: resteCommandes + resteBoutique,
  };
}
