**Cahier des charges pour l'écosystème SAMATRANSPORT**

**Plan de Projet : Écosystème SAMATRANSPORT pour le Transport Routier**

**1. Introduction**

*   **Société :** DigitalBridge (Basée en Côte d'Ivoire, Afrique de l'Ouest)
*   **Mission Initiale :** Conception de logiciels pour les entreprises et gouvernements (Transport, Santé, Agriculture, Élevage, Éducation).
*   **Orientation Actuelle :** Développement d'un écosystème intégré d'applications web et mobiles destiné à moderniser les opérations des compagnies de transport routier de passagers et de marchandises en Afrique de l'Ouest.
*   **Objectif Principal :** Fournir une solution digitale complète visant à optimiser la gestion, améliorer l'efficacité opérationnelle, sécuriser les revenus, renforcer la maintenance de la flotte et offrir une expérience client de qualité supérieure.
*   **Principes Fondamentaux :**
    *   **Intégration Poussée :** Partage fluide des données pertinentes entre toutes les applications de l'écosystème.
    *   **Données en Temps Réel :** Accès à des informations actualisées pour faciliter la prise de décision et optimiser les opérations.
    *   **Expérience Utilisateur Optimale :** Interfaces intuitives et faciles d'utilisation pour tous les profils utilisateurs (clients, agents, administrateurs).
    *   **Sécurité Avancée :** Protection rigoureuse des données, gestion fine des droits d'accès et traçabilité complète des actions.
    *   **Adaptation au Contexte Local :** Prise en charge multilingue (Français, Anglais initialement), gestion multi-devises (XOF, GNF, LRD, SLL, EUR, USD avec taux de change centralisés), et fonctionnalités adaptées aux contraintes de connectivité (modes hors-ligne).

**2. Architecture de l'Écosystème SAMATRANSPORT**

SAMATRANSPORT est une suite d'applications modulaires. Chaque application remplit un rôle spécifique tout en communiquant activement avec les autres via des API internes robustes. Un système centralisé, principalement géré par l'Application "Control", assure la gestion :

*   **Des Données Maîtres :** Itinéraires, horaires, flotte, tarifs (passagers, bagages, colis), agences, utilisateurs, politiques (annulation, remboursement, fidélité), devises et taux de change.
*   **De l'Authentification et des Permissions :** Un système unique pour l'identification des agents et le contrôle de leurs accès aux différentes fonctionnalités de l'écosystème.
*   **De la Synchronisation :** Garantie de la cohérence des données critiques (ex: disponibilité des sièges) entre les diverses interfaces (web, guichet).

**2.1 Structure du Monorepo et Organisation du Code**

Pour gérer la complexité inhérente à un écosystème d'applications interconnectées et pour favoriser la réutilisation du code, une meilleure gestion des dépendances, et une intégration continue (CI/CD) rationalisée, l'Écosystème SAMATRANSPORT sera développé au sein d'une architecture de type **monorepo** gérée avec `pnpm workspaces`. Cette approche permettra de maintenir une base de code unifiée tout en assurant une séparation logique claire entre les différents modules et services.

Voici la structure de dossiers proposée pour le monorepo :

```
SAMATRANSPORT_ECOSYSTEM/
├── .github/                          # Configuration GitHub
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/                    # CI/CD GitHub Actions
│       ├── lint_format_check.yml
│       ├── tests.yml
│       ├── deploy_staging.yml
│       └── deploy_production.yml
│
├── .husky/                           # Git hooks
│   ├── _/
│   │   └── husky.sh
│   ├── commit-msg
│   └── pre-commit
│
├── .vscode/                          # Paramètres VSCode
│   ├── extensions.json
│   └── settings.json
│
├── apps/                             # Applications individuelles (Frontends Next.js)
│   ├── control-app/                  # Application "Control" (Admin)
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   ├── .env.local.example
│   │   ├── .eslintrc.js
│   │   ├── next.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── guichet-app/                  # Application "Guichet"
│   │   └── # ... structure similaire
│   │
│   ├── site-web-client-app/          # Application "Site Web & Espace Client"
│   │   └── # ... structure similaire
│   │
│   ├── courrier-app/                 # Application "Courrier" (Future)
│   │   └── # ... structure similaire
│   │
│   └── finance-app/                  # Application "Finance" (Future)
│       └── # ... structure similaire
│
├── docs/                             # Documentation du projet (PRD, architecture, conventions, etc.)
│   ├── 00_PROJECT_CHARTER/
│   │   ├── idea_document.md
│   │   ├── market_research.md
│   │   └── core_concept.md
│   ├── 01_PRODUCT_DEFINITION/
│   │   └── project_prd.md
│   ├── 02_ARCHITECTURE_CONVENTIONS/
│   │   ├── architecture.md
│   │   ├── coding_conventions.md
│   │   ├── design_conventions.md
│   │   └── deployment_guide.md
│   ├── 03_FUNCTIONAL_SPECS/
│   │   ├── index.md
│   │   ├── features/
│   │   │   └── feature_spec_FEAT-XXX.md
│   │   └── data/
│   │       └── data_model.md
│   ├── 04_AI_AGENT_GUIDES/
│   ├── 05_TASK_MANAGEMENT/
│   └── ADR/
│
├── packages/                         # Paquets partagés (bibliothèques, configs)
│   ├── ui/                           # SAMATRANSPORT Design System (Composants React)
│   │   ├── src/
│   │   ├── .storybook/
│   │   ├── stories/
│   │   ├── tailwind.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── lib-core/                     # Utilitaires et logique métier partagée
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── i18n/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── eslint-config-custom/
│   ├── prettier-config-custom/
│   ├── tsconfig/
│   └── mcp-clients/
│
├── supabase/                         # Configuration et code Backend Supabase
│   ├── functions/                    # Edge Functions
│   │   ├── shared/
│   │   ├── create-booking/
│   │   └── ...
│   ├── migrations/
│   ├── seed.sql
│   ├── config.toml
│   ├── .env.example
│   └── tests/
│
├── tasks/                            # Gestion des tâches pour Roo Orchestrator
│   └── tasks.json
│
├── .commitlintrc.js
├── .editorconfig
├── .env.example
├── .eslintignore
├── .eslintrc.js
├── .gitignore
├── .lintstagedrc.js
├── .npmrc
├── .prettierignore
├── .prettierrc.js
├── LICENSE
├── package.json                      # Dépendances racine et workspaces pnpm
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
└── tsconfig.json                     # Configuration TypeScript racine
```

**Explication des Répertoires Clés de la Structure Monorepo :**

*   **`apps/`**: Contient les applications front-end distinctes de l'écosystème SAMATRANSPORT (ex: `control-app`, `guichet-app`, `site-web-client-app`). Chaque application est un projet Next.js indépendant mais peut consommer des packages partagés.
*   **`packages/`**: Héberge le code partagé entre les différentes applications.
    *   `ui/`: Le Design System SAMATRANSPORT, comprenant les composants React réutilisables, les styles (Tailwind CSS), et la documentation Storybook. Ce package est crucial pour assurer une **Expérience Utilisateur Optimale** et cohérente.
    *   `lib-core/`: Bibliothèque de fonctionnalités de base, de types TypeScript, d'utilitaires, et de logique métier partagée (ex: gestion de l'internationalisation, wrappers pour l'API Supabase), favorisant l'**Intégration Poussée**.
    *   `eslint-config-custom/`, `prettier-config-custom/`, `tsconfig/`: Configurations partagées pour assurer la cohérence du code à travers tout le monorepo.
*   **`supabase/`**: Centralise toute la configuration et le code backend spécifique à Supabase, y compris les Edge Functions (logique métier), les migrations de base de données, les scripts de seeding, et les tests backend. Cela permet une gestion claire de la couche **Données en Temps Réel** et **Sécurité Avancée**.
*   **`docs/`**: Répertoire dédié à toute la documentation du projet, incluant ce Cahier des Charges, les spécifications fonctionnelles détaillées, les documents d'architecture et les conventions.
*   **Fichiers de configuration à la racine**: Assurent la gestion du monorepo (`pnpm-workspace.yaml`, `package.json` racine), la qualité du code (`.eslintrc.js`, `.prettierrc.js`), et les hooks Git (`.husky/`).

Cette structure monorepo permettra une collaboration efficace, une meilleure maintenabilité, et une scalabilité future de l'Écosystème SAMATRANSPORT, tout en soutenant ses principes fondamentaux.

**3. Composants de l'Écosystème SAMATRANSPORT**

L'écosystème se compose des applications suivantes (qui seront développées comme des projets distincts dans le répertoire `apps/` du monorepo, ou dont la logique backend sera dans `supabase/functions/` et les composants UI dans `packages/ui/`) :

**I. Application "Control" (Centre de Commande et d'Administration)**

*   **Rôle Principal :** Plateforme centrale pour la configuration, l'administration globale, la supervision des opérations, la gestion des données maîtres et de la flotte.
*   **Utilisateurs Clés :** Administrateurs système, gestionnaires de la compagnie, superviseurs des opérations.
*   **Fonctionnalités Détaillées :**
    *   **Gestion des Données Maîtres :**
        *   Création et gestion des agences (détails, devise opérationnelle), itinéraires (arrêts, distances, temps), horaires, types de véhicules (Standard/VIP, capacités), et de la flotte (informations véhicule, assignation agence).
        *   Gestion centralisée des devises et des taux de change (avec source et fréquence de mise à jour définies).
    *   **Gestion des Utilisateurs et Permissions :**
        *   Création et gestion des comptes agents (tous rôles).
        *   Configuration détaillée des rôles et permissions pour chaque application et fonctionnalité.
    *   **Configuration des Règles Métier :**
        *   Définition des politiques tarifaires (passagers, bagages, colis) et promotionnelles.
        *   Configuration des règles d'annulation, de modification et de remboursement.
        *   Paramétrage du programme de fidélité (seuils, récompenses).
    *   **Planification et Opérations :**
        *   Assignation des véhicules et des chauffeurs/équipages aux départs planifiés.
        *   Planification intelligente des équipages (gestion des contraintes).
        *   Visualisation centralisée du suivi GPS de la flotte (si capteurs disponibles).
    *   **Gestion de la Maintenance (FMS) :**
        *   Carnet d'entretien numérique par véhicule (vidanges, révisions, contrôles techniques).
        *   Planification et alertes de maintenance préventive (basée sur le kilométrage ou le temps).
        *   Gestion des ordres de réparation (suivi des pannes, pièces utilisées, coûts).
        *   Gestion du stock de pièces détachées (avec alertes de stock bas).
        *   Historique des interventions et des coûts par véhicule.
    *   **Supervision et Sécurité :**
        *   Tableau de bord opérationnel : Vue d'ensemble (taux de remplissage, ponctualité, incidents).
        *   Gestion des incidents signalés (terrain/clients).
        *   Gestion des remboursements et compensations (selon les règles établies).
        *   **Journal d'Audit Immuable :** Traçabilité de toutes les modifications de données sensibles (qui, quoi, quand). La suppression physique des transactions critiques (billets, colis) sera évitée au profit d'une invalidation/annulation tracée.
        *   Gestion des fournisseurs (pièces, services).
    *   **Gestion RH de Base :** Informations sur les chauffeurs et le personnel nécessaires à la planification (pouvant alimenter un module RH plus complet ou l'application Finance pour les salaires).
*   **Avantages Spécifiques :** Cohérence des données, contrôle centralisé, optimisation de la flotte et de la maintenance, sécurité accrue, meilleure planification, vue d'ensemble des opérations.
*   **Intégrations Clés :** Fournit les données maîtres, la configuration, les règles et les permissions à TOUTES les autres applications. Reçoit les statuts, rapports d'incidents, et données de maintenance pour consolidation et supervision.

**II. Application "Site Web & Espace Client" (Portail Public et Client)**

*   **Rôle Principal :** Vitrine numérique de la compagnie, canal de vente en ligne autonome, et espace personnalisé pour les clients.
*   **Utilisateurs Clés :** Clients (passagers et expéditeurs), grand public.
*   **Fonctionnalités Détaillées :**
    *   **Site Public :** Accueil dynamique (carrousel, moteur de recherche), présentation des destinations (carte interactive), services, flotte (détails, visite virtuelle 360°), actualités/promotions, section "À Propos" (contact, FAQ). Disponible en plusieurs langues (FR/EN).
    *   **Espace Client Sécurisé :**
        *   Création et gestion de compte client.
        *   **Réservation et Achat de Billets :**
            *   Sélection du trajet, des dates, et du nombre de passagers (Standard/VIP).
            *   **Visualisation interactive et sélection des sièges disponibles en TEMPS RÉEL** (synchronisée avec l'App "Guichet").
            *   Paiement en ligne via des passerelles de paiement intégrées (Orange Money, MTN, Moov, Wave, etc.).
            *   Affichage multi-devises avec conversion indicative (basée sur les taux de l'App "Control").
        *   **Billets Électroniques :** Génération de billets avec QR code unique, envoyés par email et consultables en ligne.
        *   Historique des voyages et des réservations.
        *   Suivi du programme de fidélité (voyages/points, avantages).
        *   Gestion des annulations et modifications en ligne (selon les règles définies dans "Control").
        *   Consultation des horaires et tarifs.
        *   Module simple de feedback et de réclamation.
        *   Notifications (confirmation, rappel, alerte retard/annulation via Email/SMS si configuré).
        *   Suivi simplifié des colis expédiés (via l'App "Courrier").
*   **Avantages Spécifiques :** Visibilité 24/7, autonomie des clients, réduction de la charge de travail aux guichets, expérience client modernisée, fidélisation, collecte de données marketing, diminution de la fraude liée aux billets papier.
*   **Intégrations Clés :** Lit les données (horaires, tarifs, flotte, etc.) de "Control". Lit et écrit la disponibilité des sièges en synchronisation avec "Guichet". Écrit les réservations et les données clients. Envoie les données de revenus à "Finance". Lit les statuts des colis de "Courrier".

**III. Application "Guichet" (Point de Vente Physique et Opérations en Agence)**

*   **Rôle Principal :** Outil principal des agents en agence pour la vente de billets, l'enregistrement (passagers, bagages), la gestion des départs et l'interaction client directe.
*   **Utilisateurs Clés :** Agents de guichet, chefs d'agence.
*   **Fonctionnalités Détaillées :**
    *   **Vente de Billets :**
        *   Interface optimisée pour la rapidité des transactions.
        *   Accès aux horaires, itinéraires, et tarifs (depuis "Control").
        *   **Visualisation et sélection des sièges disponibles en TEMPS RÉEL** (synchronisée avec l'App "Site Web").
        *   Gestion des tarifs (normal, enfant, promotionnel, VIP), et des réservations de groupe (sièges contigus).
        *   Encaissement multi-paiements (espèces, Mobile Money via TPE/Interface).
        *   Impression optionnelle de billets et reçus physiques.
    *   **Gestion des Passagers et Manifestes :** Création de manifestes, check-in (simple ou par lots), réaffectation facile de siège ou de départ (idéalement par glisser-déposer).
    *   **Enregistrement des Bagages :** Saisie des informations (valeur, destination), calcul et encaissement des frais (selon les règles de "Control"), génération d'étiquettes et de reçus.
    *   **Gestion de Caisse :** Ouverture et fermeture de session, suivi des espèces et autres paiements, rapprochement en fin de journée.
    *   **Opérations de Départ :** Saisie des dépenses liées au départ (carburant, frais de route), consultation des alertes véhicule (panne signalée via "Control"). Système de réaffectation rapide des passagers si nécessaire.
*   **Spécificités Techniques Notables :**
    *   **Mode Hors-Ligne Robuste :** Capacité d'enregistrer les ventes et les bagages essentiels sans connexion, avec une file d'attente de synchronisation automatique dès le retour du réseau.
    *   **Synchronisation Multi-Terminaux :** Assure la cohérence des données (sièges, ventes) entre plusieurs postes de guichet au sein d'une même agence.
*   **Avantages Spécifiques :** Efficacité accrue des agents, réduction des erreurs, sécurisation des revenus, traçabilité locale, synchronisation des ventes physiques et en ligne, continuité de service (grâce au mode hors-ligne).
*   **Intégrations Clés :** Lit les données de "Control". Lit et écrit la disponibilité des sièges en synchronisation avec "Site Web". Écrit les ventes, les enregistrements de bagages, et les dépenses de départ. Envoie les données financières à "Finance". Envoie les manifestes à "Control" et "Mobile Agent".

**IV. Application "Courrier" (Gestion de l'Expédition de Colis)**

*   **Rôle Principal :** Gérer l'intégralité du cycle de vie des colis, de leur enregistrement à leur suivi et livraison.
*   **Utilisateurs Clés :** Agents de service courrier, personnel de logistique, clients (pour le suivi).
*   **Fonctionnalités Détaillées :**
    *   **Enregistrement des Colis :** Saisie des informations de l'expéditeur et du destinataire, destination, nature du colis, valeur déclarée, dimensions/poids (si la tarification y est liée). Calcul automatique des frais (selon les règles de "Control").
    *   **Génération de Documents :** Reçus pour l'expéditeur, étiquettes pour les colis (avec QR code/ID unique), bordereaux d'expédition.
    *   **Suivi du Statut des Colis :** Mises à jour du statut (Enregistré, En transit, Arrivé, Livré, Incident) via des scans depuis l'App "Mobile Agent" ou manuellement.
    *   **Notifications Automatiques :** Envoi de SMS/WhatsApp/Email aux clients aux étapes clés du processus (configurable).
    *   **Preuve de Livraison Électronique :** Capture de signature ou de photo via l'App "Mobile Agent".
    *   **Gestion des Réclamations et Incidents liés aux Colis.**
    *   **Historique complet des mouvements des colis.**
    *   **Option d'Assurance Colis** (si proposée par la compagnie).
    *   **Programme de Fidélité pour les Expéditeurs.**
*   **Avantages Spécifiques :** Réduction des pertes et des vols, transparence pour le client, efficacité logistique améliorée, diminution des litiges, satisfaction client accrue.
*   **Intégrations Clés :** Lit les données (destinations, tarifs colis) de "Control". Écrit les données des colis et leurs statuts. Envoie les données financières à "Finance". Interagit fortement avec "Mobile Agent" pour les scans et la preuve de livraison. Fournit les statuts pour consultation sur le "Site Web".

**V. Application "Gestion Financière & Analyse" (Pilotage Économique)**

*   **Rôle Principal :** Consolider les données financières, analyser la performance et la rentabilité, et supporter la prise de décision stratégique.
*   **Utilisateurs Clés :** Analystes financiers, direction de la compagnie, comptables.
*   **Fonctionnalités Détaillées :**
    *   **Tableau de Bord Analytique Centralisé :** Vue d'ensemble des revenus, dépenses, et bénéfices (par période, agence, ligne, véhicule). Indicateurs clés de performance (KPIs) tels que le coût/km, revenu/siège, etc.
    *   **Intégration Automatique des Données :**
        *   Revenus : Billetterie ("Site Web", "Guichet"), Bagages ("Guichet"), Colis ("Courrier").
        *   Dépenses : Maintenance/Carburant ("Control"), Dépenses de Départ ("Guichet"), Salaires (saisie/import), Autres (péages, assurances, etc.).
    *   **Analyse de Rentabilité Détaillée.**
    *   **Reporting Financier :** Compte de résultat (par ligne/véhicule), suivi de trésorerie, rapports de ventes détaillés.
    *   **Gestion Budgétaire :** Définition des budgets, comparaison entre le budget et le réel, alertes en cas de dépassement.
    *   **Suivi de Conformité :** Tableau de bord et alertes pour les expirations (licences, assurances, contrôles techniques - via "Control").
    *   **Exports Comptables :** Formats standards (CSV, Excel) ou API vers des logiciels tiers.
    *   **Alertes sur les Anomalies Financières.**
*   **Avantages Spécifiques :** Vision financière claire, décisions basées sur les données, optimisation des coûts, amélioration de la rentabilité, contrôle financier renforcé.
*   **Intégrations Clés :** Collecte et consolide les données financières provenant de "Site Web", "Guichet", "Courrier", et "Control". Fournit des rapports et des analyses agrégés.

**VI. Application "Mobile Agent" (Application mobile Android)**

*   **Note :** Cette application sera développée ultérieurement.
*   **Rôle Principal :** Équiper le personnel mobile (contrôleurs, chauffeurs, livreurs) pour améliorer l'efficacité, la communication et la collecte de données en temps réel sur le terrain.
*   **Utilisateurs Clés :** Contrôleurs, chauffeurs, agents de livraison.
*   **Fonctionnalités Clés (Modulables par rôle) :**
    *   **Pour Tous :** Authentification sécurisée, communication simple avec "Control".
    *   **Contrôleur :** Scan de QR codes (billets, étiquettes de bagages, colis), consultation du manifeste, validation de l'embarquement/chargement, signalement d'incidents ou d'anomalies.
    *   **Chauffeur :** Consultation de la feuille de route, signalement des étapes du trajet (départ, pauses, arrivée), saisie simplifiée des dépenses (carburant, péages), signalement d'incidents ou de pannes du véhicule.
    *   **Agent de Livraison (Courrier) :** Scan des colis (chargement, livraison), capture de la preuve de livraison (signature/photo), mise à jour du statut des colis.
*   **Spécificités Techniques Notables :** Mode hors-ligne pour les fonctions essentielles, avec synchronisation des données dès le retour de la connexion.
*   **Avantages Spécifiques :** Accélération des processus sur le terrain, réduction des erreurs liées au papier, disponibilité des données en temps réel pour la supervision, meilleure communication interne, traçabilité améliorée.
*   **Intégrations Clés :** Lit les données (manifestes, feuilles de route) de "Control", "Guichet", et "Courrier". Écrit les statuts (embarquement, livraison, trajet), les rapports d'incidents, les dépenses des chauffeurs, et les preuves de livraison vers les applications concernées ("Control", "Guichet", "Courrier", "Finance").

**4. Principes et Fonctionnalités Transversaux de l'Écosystème**

*   **Support Multilingue (FR/EN) :** Interfaces utilisateur, documents générés, et communications avec les clients.
*   **Gestion Multi-devises :** Administration centralisée ("Control") des devises opérationnelles (par agence) et des taux de change pour les conversions et le reporting.
*   **Sécurité Globale :** Authentification centralisée, gestion fine des rôles et permissions, protection contre les menaces (OWASP), cryptage des données, et journaux d'audit.
*   **Reporting Intégré :** Capacités de reporting de base dans chaque module, avec consolidation et analyse avancée dans l'application "Finance".
*   **Architecture Orientée API :** Facilite l'intégration interne fluide entre les modules et permet des évolutions futures aisées.
*   **Stratégie Hors-Ligne :** Conception spécifique pour les modules critiques ("Guichet", "Mobile Agent") afin d'assurer la continuité des opérations essentielles même en cas de connectivité limitée ou intermittente.

**5. Relations entre les Applications, Flux de Données et Mécanismes d'Intégration**

**5.1 Relations avec l'Application Control**

L'Application Control est au cœur de l'écosystème et entretient des relations avec toutes les autres applications :

**5.1.1 Control → Site Web & Espace Client**
*   **Flux de données** : Fournit les données maîtres (itinéraires, horaires, tarifs, flotte)
*   **Mécanisme** : API REST via l'API Gateway
*   **Dépendances** : Le Site Web dépend des données de Control pour afficher les informations correctes

**5.1.2 Control → Application Guichet**
*   **Flux de données** : Fournit les données maîtres, les règles métier, les permissions utilisateurs
*   **Mécanisme** : API REST via l'API Gateway
*   **Dépendances** : L'Application Guichet dépend fortement de Control pour ses opérations

**5.1.3 Control → Application Courrier**
*   **Flux de données** : Fournit les données des agences, des itinéraires, des tarifs colis
*   **Mécanisme** : API REST via l'API Gateway
*   **Dépendances** : L'Application Courrier utilise les règles tarifaires définies dans Control

**5.1.4 Control → Application Gestion Financière & Analyse**
*   **Flux de données** : Fournit les données de maintenance, de flotte, de fournisseurs
*   **Mécanisme** : API REST et Bus d'Événements
*   **Dépendances** : L'Application Financière utilise ces données pour l'analyse des coûts

**5.1.5 Control → Application Mobile Agent (future)**
*   **Flux de données** : Fournira les manifestes, feuilles de route, informations véhicules
*   **Mécanisme** : API REST avec support hors-ligne
*   **Dépendances** : L'Application Mobile dépendra de Control pour ses données opérationnelles

**5.2 Relations Bidirectionnelles Critiques**

Certaines relations bidirectionnelles sont particulièrement critiques pour le fonctionnement de l'écosystème :

**5.2.1 Site Web ↔ Application Guichet**
*   **Flux de données** : Partage en temps réel des disponibilités de sièges
*   **Mécanisme** : WebSockets via le Service de Synchronisation en Temps Réel
*   **Criticité** : Élevée (évite la double réservation des sièges)

**5.2.2 Courrier ↔ Application Mobile Agent (future)**
*   **Flux de données** : Échange bidirectionnel pour le suivi et la mise à jour des statuts colis
*   **Mécanisme** : API REST avec support hors-ligne
*   **Criticité** : Élevée (traçabilité des colis)

**5.3 Relations avec l'Application Gestion Financière & Analyse**

L'Application Gestion Financière & Analyse reçoit des données de toutes les autres applications :

*   **Depuis Site Web** : Données de ventes en ligne
*   **Depuis Guichet** : Données financières (ventes, encaissements, dépenses)
*   **Depuis Courrier** : Données financières liées aux colis
*   **Depuis Control** : Données de maintenance et flotte
*   **Mécanisme principal** : Bus d'Événements

**5.4 Flux de Données et Communications**

**5.4.1 Types de Flux de Données**

Dans l'écosystème DigitalBridge, on distingue plusieurs types de flux de données selon leur nature et leur criticité :

**5.4.1.1 Flux de Données Maîtres**
*   **Description** : Données de référence essentielles au fonctionnement de l'écosystème
*   **Exemples** : Itinéraires, horaires, tarifs, configuration des agences, règles métier
*   **Origine principale** : Application Control
*   **Mécanisme principal** : API REST via l'API Gateway

**5.4.1.2 Flux de Données Transactionnelles**
*   **Description** : Données liées aux opérations quotidiennes et aux transactions commerciales
*   **Exemples** : Réservations, ventes de billets, enregistrements de bagages, expéditions de colis
*   **Origine** : Applications opérationnelles (Site Web, Guichet, Courrier)
*   **Mécanismes principaux** : API REST et Bus d'Événements

**5.4.1.3 Flux de Données en Temps Réel**
*   **Description** : Données nécessitant une synchronisation immédiate entre applications
*   **Exemples** : Disponibilité des sièges, statuts des départs, alertes opérationnelles
*   **Mécanisme principal** : WebSockets via le Service de Synchronisation

**5.4.1.4 Flux de Données Analytiques**
*   **Description** : Données consolidées pour l'analyse et le reporting
*   **Exemples** : Statistiques de vente, KPIs opérationnels, analyses financières
*   **Mécanisme principal** : Bus d'Événements

**5.4.2 Mécanismes de Communication Détaillés**

**5.4.2.1 API REST via l'API Gateway**
*   **Description** : Communication synchrone basée sur des requêtes HTTP/HTTPS
*   **Cas d'utilisation** : Récupération des données maîtres, opérations CRUD, requêtes ponctuelles
*   **Caractéristiques techniques** : JSON, JWT, validation Zod, codes HTTP standards

**5.4.2.2 WebSockets via le Service de Synchronisation**
*   **Description** : Communication bidirectionnelle en temps réel
*   **Cas d'utilisation** : Synchronisation des disponibilités de sièges, notifications en temps réel
*   **Caractéristiques techniques** : Socket.io, Redis Pub/Sub, reconnexion automatique

**5.4.2.3 Bus d'Événements**
*   **Description** : Communication asynchrone basée sur des événements
*   **Cas d'utilisation** : Propagation des événements métier, consolidation des données financières
*   **Caractéristiques techniques** : Redis Streams ou AWS EventBridge, pattern Publish/Subscribe

**5.4.2.4 Mode Hors-Ligne avec Synchronisation Différée**
*   **Description** : Mécanisme permettant le fonctionnement en cas de connectivité limitée
*   **Cas d'utilisation** : Application Guichet en cas de coupure internet, Application Mobile Agent
*   **Caractéristiques techniques** : IndexedDB ou SQLite, file d'attente, résolution de conflits

**5.4.3 Flux de Données par Application**

Pour chaque application, des flux de données entrants et sortants spécifiques ont été identifiés et documentés en détail, avec leurs mécanismes de communication et leurs caractéristiques.

**5.5 Mécanismes d'Intégration**

**5.5.1 API Gateway Centralisée**

L'API Gateway Centralisée joue un rôle crucial dans l'architecture de l'écosystème DigitalBridge :

*   **Rôle** : Point d'entrée unique pour toutes les communications entre applications
*   **Fonctionnalités** :
    *   Gestion unifiée des API pour toutes les applications
    *   Authentification et autorisation centralisées
    *   Monitoring et throttling des requêtes
    *   Routage intelligent vers les services appropriés
*   **Technologies** : Kong ou AWS API Gateway

**5.5.2 Service de Synchronisation en Temps Réel**

Le Service de Synchronisation en Temps Réel assure la cohérence des données critiques en temps réel :

*   **Rôle** : Assurer la cohérence des données en temps réel entre les applications
*   **Fonctionnalités** :
    *   WebSockets pour les mises à jour instantanées
    *   Redis Pub/Sub pour la communication entre services
    *   Synchronisation des disponibilités de sièges entre Site Web et Guichet
*   **Technologies** : WebSockets (Socket.io) avec Redis Pub/Sub

**5.5.3 Service d'Authentification Centralisé**

Le Service d'Authentification Centralisé gère l'authentification et les autorisations pour tout l'écosystème :

*   **Rôle** : Gérer l'authentification et les autorisations pour tout l'écosystème
*   **Fonctionnalités** :
    *   Gestion des utilisateurs et des rôles commune à toutes les applications
    *   Single Sign-On (SSO) pour une expérience utilisateur fluide
    *   Gestion fine des permissions basée sur les rôles
*   **Technologies** : NextAuth.js / Auth.js

**5.5.4 Bus d'Événements**

Le Bus d'Événements facilite la communication asynchrone entre les services :

*   **Rôle** : Faciliter la communication asynchrone entre les services
*   **Fonctionnalités** :
    *   Architecture événementielle pour découpler les services
    *   Garantie de cohérence des données entre applications
    *   Traçabilité des événements métier importants
*   **Technologies** : Redis Streams ou AWS EventBridge

**6. Validation de la Cohérence Architecturale**

**6.1 Alignement avec les Principes Directeurs**

L'architecture de l'écosystème DigitalBridge est alignée avec les principes directeurs définis :

*   **Intégration Forte** : ✅ Cohérent
*   **Données en Temps Réel** : ✅ Cohérent
*   **Expérience Utilisateur Intuitive** : ✅ Cohérent
*   **Sécurité Renforcée** : ✅ Cohérent
*   **Adaptabilité Locale** : ✅ Cohérent

**6.2 Points Forts de l'Architecture**

L'analyse a identifié plusieurs points forts dans l'architecture :

1.  **Centralisation Stratégique** : Équilibre entre cohérence globale et flexibilité
2.  **Mécanismes d'Intégration Diversifiés** : Adaptation des solutions techniques aux exigences fonctionnelles
3.  **Résilience et Continuité de Service** : Prise en compte du mode hors-ligne et synchronisation différée
4.  **Cohérence Technologique** : Stack technique moderne et cohérente
5.  **Sécurité Intégrée** : Sécurité à tous les niveaux de l'architecture

**6.3 Points d'Amélioration Potentiels**

Quelques points d'amélioration potentiels ont été identifiés :

1.  **Complexité de la Synchronisation en Temps Réel** : Risques de conflits de réservation
2.  **Dépendance à l'Application Control** : Point unique de défaillance potentiel
3.  **Complexité du Mode Hors-ligne** : Risques de conflits lors de la synchronisation
4.  **Monitoring Distribué** : Complexité du monitoring global
5.  **Évolution de l'Application Mobile Agent** : Anticipation des contraintes techniques

**7. Recommandations**

Sur la base de l'analyse des relations entre les applications et de la validation de la cohérence architecturale, les recommandations suivantes sont formulées :

**7.1 Optimisation de la Synchronisation en Temps Réel**

*   Implémenter un système de verrouillage temporaire des sièges pendant le processus de réservation
*   Définir des stratégies claires de résolution de conflits avec priorités
*   Mettre en place des tests de charge spécifiques pour ce scénario

**7.2 Renforcement de la Résilience**

*   Renforcer la haute disponibilité de l'Application Control
*   Mettre en place un cache distribué pour les données maîtres les plus consultées
*   Considérer une stratégie de déploiement multi-régions pour les données critiques

**7.3 Amélioration du Mode Hors-ligne**

*   Développer des tests automatisés spécifiques pour les scénarios de synchronisation après mode hors-ligne
*   Documenter précisément les limites du mode hors-ligne pour les utilisateurs
*   Mettre en place des mécanismes de réconciliation de données avec journalisation des conflits

**7.4 Mise en Place d'un Monitoring Centralisé**

*   Mettre en place une solution de monitoring centralisée avec corrélation des événements
*   Implémenter des traces distribuées (distributed tracing) pour suivre les requêtes à travers les services
*   Créer des dashboards de santé globale de l'écosystème

**7.5 Approche Progressive pour l'Application Mobile Agent**

*   Prévoir une phase de prototype avant le développement complet
*   Valider les mécanismes de synchronisation hors-ligne sur des cas d'usage réels
*   Considérer une approche progressive pour le déploiement des fonctionnalités
