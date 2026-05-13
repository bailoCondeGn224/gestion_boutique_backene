import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFinancialFieldsToInventaire1778500000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter les champs financiers à la table inventaire
    await queryRunner.addColumns('inventaire', [
      // Période de l'inventaire
      new TableColumn({
        name: 'dateDebut',
        type: 'timestamp',
        isNullable: true,
        comment: 'Date de début de la période (date du dernier inventaire ou création organisation)',
      }),
      new TableColumn({
        name: 'dateFin',
        type: 'timestamp',
        isNullable: true,
        comment: 'Date de fin de la période (date de cet inventaire)',
      }),
      new TableColumn({
        name: 'dureeJours',
        type: 'int',
        isNullable: true,
        comment: 'Durée de la période en jours',
      }),

      // Revenus
      new TableColumn({
        name: 'chiffreAffaires',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Chiffre d\'affaires total de la période',
      }),
      new TableColumn({
        name: 'nombreVentes',
        type: 'int',
        default: 0,
        comment: 'Nombre de ventes réalisées durant la période',
      }),
      new TableColumn({
        name: 'panierMoyen',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Panier moyen (CA / nombre ventes)',
      }),

      // Coûts
      new TableColumn({
        name: 'coutMarchandises',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Coût des marchandises vendues (CMV)',
      }),

      // Bénéfice brut
      new TableColumn({
        name: 'beneficeBrut',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Bénéfice brut (CA - CMV)',
      }),
      new TableColumn({
        name: 'tauxMarge',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0,
        comment: 'Taux de marge brute en % (bénéfice brut / CA * 100)',
      }),

      // Dépenses
      new TableColumn({
        name: 'depensesFixes',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Total des dépenses fixes (loyer, salaires, etc.)',
      }),
      new TableColumn({
        name: 'depensesVariables',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Total des dépenses variables (transport, emballage, etc.)',
      }),
      new TableColumn({
        name: 'depensesExceptionnelles',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Total des dépenses exceptionnelles (réparations, etc.)',
      }),
      new TableColumn({
        name: 'totalDepenses',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Total de toutes les dépenses',
      }),

      // Pertes
      new TableColumn({
        name: 'valeurArticlesManquants',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Valeur des articles manquants (écarts négatifs)',
      }),
      new TableColumn({
        name: 'valeurArticlesAbimes',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Valeur des articles abîmés ou dégradés',
      }),
      new TableColumn({
        name: 'totalPertes',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Total des pertes',
      }),

      // Résultat final
      new TableColumn({
        name: 'beneficeNet',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        comment: 'Bénéfice net (bénéfice brut - dépenses - pertes)',
      }),
      new TableColumn({
        name: 'tauxRentabilite',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0,
        comment: 'Taux de rentabilité en % (bénéfice net / CA * 100)',
      }),

      // Statut financier
      new TableColumn({
        name: 'estBeneficiaire',
        type: 'boolean',
        default: false,
        comment: 'Indique si la période est bénéficiaire (bénéfice net > 0)',
      }),
      new TableColumn({
        name: 'financesCalcules',
        type: 'boolean',
        default: false,
        comment: 'Indique si les calculs financiers ont été effectués',
      }),
      new TableColumn({
        name: 'financesCalculesLe',
        type: 'timestamp',
        isNullable: true,
        comment: 'Date du dernier calcul financier',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer tous les champs ajoutés
    await queryRunner.dropColumn('inventaire', 'financesCalculesLe');
    await queryRunner.dropColumn('inventaire', 'financesCalcules');
    await queryRunner.dropColumn('inventaire', 'estBeneficiaire');
    await queryRunner.dropColumn('inventaire', 'tauxRentabilite');
    await queryRunner.dropColumn('inventaire', 'beneficeNet');
    await queryRunner.dropColumn('inventaire', 'totalPertes');
    await queryRunner.dropColumn('inventaire', 'valeurArticlesAbimes');
    await queryRunner.dropColumn('inventaire', 'valeurArticlesManquants');
    await queryRunner.dropColumn('inventaire', 'totalDepenses');
    await queryRunner.dropColumn('inventaire', 'depensesExceptionnelles');
    await queryRunner.dropColumn('inventaire', 'depensesVariables');
    await queryRunner.dropColumn('inventaire', 'depensesFixes');
    await queryRunner.dropColumn('inventaire', 'tauxMarge');
    await queryRunner.dropColumn('inventaire', 'beneficeBrut');
    await queryRunner.dropColumn('inventaire', 'coutMarchandises');
    await queryRunner.dropColumn('inventaire', 'panierMoyen');
    await queryRunner.dropColumn('inventaire', 'nombreVentes');
    await queryRunner.dropColumn('inventaire', 'chiffreAffaires');
    await queryRunner.dropColumn('inventaire', 'dureeJours');
    await queryRunner.dropColumn('inventaire', 'dateFin');
    await queryRunner.dropColumn('inventaire', 'dateDebut');
  }
}
