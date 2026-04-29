import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_TEMPLATES = [
  {
    name: 'Contrat de service',
    description: 'Modèle de contrat de prestation de services pour freelance',
    type: 'contract',
    content: `CONTRAT DE PRESTATION DE SERVICES

Entre les soussignés :

Le prestataire, ci-après dénommé « le Prestataire »,
Et le client, {client_name}, ci-après dénommé « le Client »,

Il a été convenu ce qui suit :

Article 1 — Objet du contrat

Le Prestataire s'engage à réaliser pour le Client la prestation suivante : {project_name}. Les modalités, délais et livrables sont détaillés dans le cahier des charges annexé au présent contrat.

Article 2 — Durée

Le présent contrat est conclu pour une durée de {duration} à compter de la date de signature. Il pourra être renouvelé par avenant expressément signé par les deux parties.

Article 3 — Rémunération

En contrepartie des prestations effectuées, le Client s'engage à verser au Prestataire un montant total de {amount} euros hors taxes. Les conditions de paiement sont les suivantes : un acompte de 30% à la signature du présent contrat, le solde à la livraison des prestations.

Article 4 — Modalités de paiement

Les factures seront payables à réception. En cas de retard de paiement, une pénalité de retard égale à trois fois le taux d'intérêt légal sera appliquée automatiquement, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 euros.

Article 5 — Obligations du Prestataire

Le Prestataire s'engage à fournir les prestations avec diligence et selon les règles de l'art. Il s'engage à respecter les délais convenus et à informer le Client de tout événement susceptible de retarder l'exécution du contrat.

Article 6 — Obligations du Client

Le Client s'engage à fournir au Prestataire toutes les informations et documents nécessaires à la bonne exécution de la prestation dans les délais convenus. Le Client s'engage également à respecter le calendrier de paiement défini à l'article 3.

Fait à _______________, le {date}

Le Prestataire                          Le Client
_______________                         _______________`,
    variables: JSON.stringify(['client_name', 'project_name', 'date', 'amount', 'duration']),
    category: 'contrat',
    icon: 'FileText',
    isDefault: true,
  },
  {
    name: 'Devis type',
    description: 'Modèle de devis standard pour vos propositions commerciales',
    type: 'quote',
    content: `DEVIS N° _________

Date : {date}
Validité : 30 jours

Émetteur :
Votre entreprise freelance

Destinataire :
{client_name}

Objet : {project_name}

—

Détail des prestations :

{items}

—

Total HT : {total} €
TVA (20%) : À déterminer selon votre statut
Total TTC : À déterminer selon votre statut

Conditions :
- Acompte de 30% à la commande
- Solde à la livraison
- Ce devis est valable 30 jours à compter de la date d'émission
- Toute modification du périmètre fera l'objet d'un avenant au présent devis

Mentions légales :
Conformément à l'article L.441-6 du Code de commerce, le délai de paiement est de 30 jours suivant la date d'émission de la facture. En cas de retard de paiement, des pénalités au taux de trois fois le taux d'intérêt légal seront appliquées, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 euros.

Signature du client (bon pour accord) :

Date : _______________
Signature : _______________`,
    variables: JSON.stringify(['client_name', 'project_name', 'date', 'items', 'total']),
    category: 'devis',
    icon: 'Calculator',
    isDefault: true,
  },
  {
    name: 'Email de relance facture',
    description: "Modèle d'email pour relancer un client suite à une facture impayée",
    type: 'email',
    content: `Objet : Rappel — Facture n°{invoice_number} en attente de paiement

Bonjour {client_name},

Je me permets de vous contacter concernant la facture n°{invoice_number} d'un montant de {amount} €, dont l'échéance était fixée au {due_date}.

À ce jour, je n'ai pas encore reçu le règlement de cette facture. Je vous invite à procéder au paiement dans les meilleurs délais afin de régulariser la situation.

Si le paiement a déjà été effectué, je vous remercie de bien vouloir ignorer ce rappel et de me transmettre la preuve de virement afin que je puisse mettre à jour mes comptes.

En cas de difficulté ou de question concernant cette facture, n'hésitez pas à me contacter directement par retour d'email ou par téléphone. Je reste à votre disposition pour trouver une solution adaptée.

Vous trouverez ci-joint une copie de la facture pour référence.

Je vous remercie par avance pour votre diligence et vous souhaite une excellente journée.

Cordialement,

Votre nom
Votre entreprise`,
    variables: JSON.stringify(['client_name', 'invoice_number', 'amount', 'due_date']),
    category: 'relance',
    icon: 'Mail',
    isDefault: true,
  },
  {
    name: 'Email de proposition commerciale',
    description: "Modèle d'email pour envoyer une proposition commerciale à un prospect",
    type: 'email',
    content: `Objet : Proposition commerciale — {project_name}

Bonjour {client_name},

Suite à notre récent échange concernant vos besoins en matière de {project_name}, je vous adresse ma proposition commerciale détaillée ci-dessous.

En tant que professionnel spécialisé dans ce domaine, je suis convaincu de pouvoir vous accompagner efficacement dans la réalisation de ce projet. Mon approche repose sur une compréhension approfondie de vos objectifs et une méthodologie éprouvée garantissant des résultats concrets.

Le montant proposé pour la réalisation complète de cette prestation s'élève à {amount} € HT. Ce tarif inclut l'ensemble des phases du projet, de la conception à la livraison finale, ainsi que les éventuelles révisions nécessaires.

Vous trouverez en pièce jointe le devis détaillé décrivant précisément le périmètre des prestations, les livrables attendus et le calendrier prévisionnel.

Cette proposition est valable pendant 30 jours. Je me tiens à votre entière disposition pour en discuter et l'adapter si nécessaire à vos contraintes spécifiques.

Dans l'attente de votre retour, je vous prie d'agréer, {client_name}, l'expression de mes salutations distinguées.

Cordialement,

Votre nom
Votre entreprise`,
    variables: JSON.stringify(['client_name', 'project_name', 'amount']),
    category: 'commercial',
    icon: 'Send',
    isDefault: true,
  },
  {
    name: 'Email de suivi client',
    description: "Modèle d'email pour faire un point de suivi avec un client",
    type: 'client_response',
    content: `Objet : Suivi de notre collaboration

Bonjour {client_name},

Je vous contacte afin de faire un point sur l'avancement de notre collaboration depuis notre dernier échange du {last_contact_date}.

Je souhaitais m'assurer que tout se déroule conformément à vos attentes et vérifier que les livrables fournis jusqu'à présent vous donnent entière satisfaction. Votre feedback est essentiel pour moi afin de garantir la qualité du travail accompli.

Par ailleurs, je souhaitais également évoquer avec vous les prochaines étapes prévues dans le cadre de notre projet. Plusieurs points mériteraient d'être discutés pour assurer la bonne continuité des travaux.

Seriez-vous disponible dans les prochains jours pour un court échange téléphonique ou une réunion en visio ? Je peux m'adapter à vos disponibilités.

Je reste à votre écoute et vous remercie pour votre confiance renouvelée.

Bien cordialement,

Votre nom
Votre entreprise`,
    variables: JSON.stringify(['client_name', 'last_contact_date']),
    category: 'suivi',
    icon: 'MessageSquare',
    isDefault: true,
  },
  {
    name: 'Structure de projet web',
    description: 'Modèle de structure et de planification pour un projet de site web',
    type: 'project_structure',
    content: `STRUCTURE DE PROJET WEB

Projet : {project_name}
Client : {client_name}
Date limite : {deadline}

—

1. Phase de découverte (Semaine 1)
- Analyse des besoins et des objectifs du client
- Étude de la concurrence et benchmark
- Définition de l'arborescence du site
- Rédaction du cahier des charges fonctionnel

2. Phase de conception (Semaine 2-3)
- Création des maquettes wireframes
- Design des interfaces principales (accueil, pages clés)
- Validation des maquettes par le client
- Définition de la charte graphique et de l'identité visuelle

3. Phase de développement (Semaine 4-7)
- Intégration HTML/CSS responsive
- Développement des fonctionnalités front-end
- Développement du back-end et de la base de données
- Intégration du CMS si nécessaire
- Tests de compatibilité navigateurs et appareils

4. Phase de contenu (Semaine 6-7)
- Intégration des contenus textuels fournis par le client
- Optimisation des images et médias
- Intégration du référencement SEO on-page

5. Phase de test et livraison (Semaine 8)
- Tests fonctionnels complets
- Corrections et ajustements
- Formation du client à l'utilisation du site
- Mise en ligne et vérifications finales
- Remise de la documentation technique

Livrables attendus :
- Site web fonctionnel et responsive
- Documentation technique et guide d'utilisation
- Accès aux codes sources et hébergement
- Garantie de 3 mois pour les corrections de bugs`,
    variables: JSON.stringify(['project_name', 'client_name', 'deadline']),
    category: 'projet',
    icon: 'Layout',
    isDefault: true,
  },
  {
    name: 'Contrat de confidentialité',
    description: "Modèle d'accord de non-divulgation (NDA) pour protéger vos informations",
    type: 'contract',
    content: `ACCORD DE CONFIDENTIALITÉ

Entre les soussignés :

La partie divulguatrice, ci-après dénommée « la Partie Divulguatrice »,
Et la partie réceptrice, {client_name}, ci-après dénommée « la Partie Réceptrice »,

Il a été convenu ce qui suit :

Article 1 — Objet

Le présent accord a pour objet de définir les conditions dans lesquelles la Partie Réceptrice s'engage à préserver la confidentialité des informations qui lui seront communiquées par la Partie Divulguatrice dans le cadre de leur collaboration.

Article 2 — Définition des informations confidentielles

Sont considérées comme informations confidentielles toutes les données, documents, savoir-faire, stratégies commerciales, informations financières, listes de clients, secrets industriels, code source, algorithmes et toute autre information communiquée par la Partie Divulguatrice, que cette communication soit écrite, orale ou visuelle.

Article 3 — Obligations de la Partie Réceptrice

La Partie Réceptrice s'engage à :
- Maintenir les informations confidentielles dans la plus stricte confidentialité
- Ne pas divulguer, communiquer ou reproduire les informations confidentielles à des tiers sans autorisation préalable écrite
- Utiliser les informations confidentielles uniquement dans le cadre de la collaboration convenue
- Mettre en œuvre toutes les mesures nécessaires pour protéger ces informations

Article 4 — Durée

Le présent accord est conclu pour une durée de {duration} à compter de la date du {date}. L'obligation de confidentialité survivra à l'expiration du présent accord pour une période de cinq ans.

Article 5 — Exceptions

Ne sont pas considérées comme confidentielles les informations que la Partie Réceptrice pourrait démontrer comme étant : déjà connues du public, légitimement obtenues auprès d'un tiers, développées indépendamment, ou déjà en sa possession avant la divulgation.

Fait à _______________, le {date}

La Partie Divulguatrice               La Partie Réceptrice
_______________                        _______________`,
    variables: JSON.stringify(['client_name', 'date', 'duration']),
    category: 'contrat',
    icon: 'Shield',
    isDefault: true,
  },
  {
    name: 'Email de bienvenue client',
    description: "Modèle d'email de bienvenue pour un nouveau client",
    type: 'client_response',
    content: `Objet : Bienvenue ! Début de notre collaboration sur {project_name}

Bonjour {client_name},

Je suis ravi de vous accueillir parmi mes clients et de débuter notre collaboration sur le projet {project_name}.

Ce premier email a pour objectif de vous présenter le déroulement de notre travail ensemble et de vous fournir toutes les informations nécessaires pour démarrer dans les meilleures conditions.

Tout au long du projet, je m'engage à vous tenir informé de l'avancement des travaux de manière régulière. Vous recevrez des mises à jour à chaque étape clé, et je resterai disponible pour répondre à toutes vos questions.

Pour que notre collaboration soit la plus efficace possible, je vous invite à me communiquer dès à présent tous les documents et éléments nécessaires au démarrage du projet. Un espace partagé pourra être mis en place pour faciliter nos échanges de fichiers.

N'hésitez pas à me contacter par email ou par téléphone à tout moment. Mon objectif est de vous offrir un accompagnement de qualité et des résultats qui dépassent vos attentes.

Encore merci pour votre confiance, {client_name}. Je suis impatient de commencer à travailler ensemble !

Bien cordialement,

Votre nom
Votre entreprise`,
    variables: JSON.stringify(['client_name', 'project_name']),
    category: 'onboarding',
    icon: 'UserPlus',
    isDefault: true,
  },
]

export async function POST(req: NextRequest) {
  try {
    const user = await db.user.findFirst()
    if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

    // Check if default templates already exist for this user
    const existingDefaults = await db.template.findMany({
      where: { userId: user.id, isDefault: true },
    })

    // Track which templates already exist by name
    const existingNames = new Set(existingDefaults.map((t) => t.name))

    // Only create templates that don't already exist
    const templatesToCreate = DEFAULT_TEMPLATES.filter(
      (t) => !existingNames.has(t.name)
    ).map((t) => ({
      ...t,
      usageCount: 0,
      userId: user.id,
    }))

    if (templatesToCreate.length === 0) {
      return NextResponse.json({
        message: 'All default templates already exist',
        created: 0,
        existing: existingDefaults.length,
        templates: existingDefaults,
      })
    }

    const created = await db.template.createMany({
      data: templatesToCreate,
    })

    // Return all default templates for the user
    const allDefaults = await db.template.findMany({
      where: { userId: user.id, isDefault: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      message: `${created.count} default templates created`,
      created: created.count,
      existing: existingDefaults.length,
      templates: allDefaults,
    })
  } catch (error) {
    console.error('Templates seed error:', error)
    return NextResponse.json({ error: 'Failed to seed templates' }, { status: 500 })
  }
}
