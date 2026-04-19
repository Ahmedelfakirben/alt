# Plan de Correction Paiements et Optimisation des Bons de Retour (BR)

Ce plan vise à résoudre l'erreur 400 des paiements et à aligner la logique des Bons de Retour avec les exigences métier.

## User Review Required

> [!IMPORTANT]
> **Logique de Stock & Finance** :
> - **BR Vente (Retour Client)** : Stock **(+)** / Finance **(-)**. L'argent sort (remboursement) et la marchandise rentre.
> - **BR Achat (Retour Fournisseur)** : Stock **(-)** / Finance **(+)**. L'argent rentre (remboursement fournisseur) et la marchandise sort.
>
> **Filtrage des Articles** : Les BR de vente doivent se baser sur les ventes passées (BL), et les BR d'achat sur les achats passés (BA).

## Proposed Changes

### 1. Correction Bug Paiement (Erreur 400)
- **Hooks de Création** : Modifier `useCreateBonLivraison`, `useCreateBonAchat`, `useCreateBonRetour`, `useCreateBonRetourAchat`.
- **Cleanup** : Convertir les chaînes vides `""` en `null` pour `date_echeance`, `note` et `reference_paiement` avant l'insertion dans Supabase.

### 2. Logique Financière (État Général)
- **[MODIFY] [use-operations.ts](file:///c:/Users/elfakir/Desktop/ISH/src/hooks/use-operations.ts)**
    - Garantir que `Retour Client` (BR) est une sortie (négatif).
    - Garantir que `Retour Fournisseur` (BRA) est une entrée (positif).

### 3. Amélioration Formulaires BR (UI)
- **[MODIFY] [bon-retour-form.tsx](file:///c:/Users/elfakir/Desktop/ISH/src/components/documents/bon-retour-form.tsx)**
    - Ajouter un sélecteur de document (BL) pour pré-remplir les articles.
- **[MODIFY] [bon-retour-achat-form.tsx](file:///c:/Users/elfakir/Desktop/ISH/src/components/documents/bon-retour-achat-form.tsx)**
    - Ajouter un sélecteur de document (BA) pour pré-remplir les articles.

## Verification Plan

### Manual Verification
- Créer un BR Vente : Vérifier plus de stock et moins de solde.
- Créer un BR Achat : Vérifier moins de stock et plus de solde.
- Vérifier la fin des erreurs 400.
