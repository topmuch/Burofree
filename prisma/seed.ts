import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clean existing data
  await prisma.email.deleteMany()
  await prisma.emailAccount.deleteMany()
  await prisma.reminder.deleteMany()
  await prisma.calendarEvent.deleteMany()
  await prisma.task.deleteMany()
  await prisma.user.deleteMany()

  // Create user
  const user = await prisma.user.create({
    data: {
      email: 'alex@freelance.dev',
      name: 'Alex Martin',
      avatar: null,
    },
  })

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Create tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Finaliser le design du site e-commerce',
        description: 'Terminer les maquettes pour les pages produit et le processus de paiement',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(today.getTime() + 1 * 86400000),
        category: 'Design',
        userId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Rédiger la proposition commerciale',
        description: 'Préparer la proposition pour le client Dupont avec les tarifs mis à jour',
        status: 'todo',
        priority: 'urgent',
        dueDate: today,
        category: 'Commercial',
        userId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Mettre à jour le portfolio',
        description: 'Ajouter les 3 derniers projets et mettre à jour la section compétences',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(today.getTime() + 3 * 86400000),
        category: 'Marketing',
        userId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Corriger le bug de paiement',
        description: 'Le processus de paiement échoue sur Safari mobile - investiguer et corriger',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(today.getTime() + 0.5 * 86400000),
        category: 'Développement',
        userId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Configurer le déploiement CI/CD',
        description: 'Mettre en place GitHub Actions pour le déploiement automatique sur Vercel',
        status: 'todo',
        priority: 'low',
        dueDate: new Date(today.getTime() + 7 * 86400000),
        category: 'DevOps',
        userId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Optimiser les performances du site',
        description: 'Réduire le temps de chargement de la page d\'accueil sous 2 secondes',
        status: 'done',
        priority: 'medium',
        dueDate: new Date(today.getTime() - 1 * 86400000),
        completedAt: new Date(today.getTime() - 1 * 86400000),
        category: 'Développement',
        userId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Rédiger l\'article de blog',
        description: 'Article sur les tendances du développement web en 2025',
        status: 'done',
        priority: 'low',
        dueDate: new Date(today.getTime() - 2 * 86400000),
        completedAt: new Date(today.getTime() - 2 * 86400000),
        category: 'Marketing',
        userId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Réunion de suivi avec le client Martin',
        description: 'Faire le point sur l\'avancement du projet et discuter des prochaines étapes',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(today.getTime() + 2 * 86400000),
        category: 'Commercial',
        userId: user.id,
      },
    }),
  ])

  // Create calendar events
  const events = await Promise.all([
    prisma.calendarEvent.create({
      data: {
        title: 'Réunion client - Projet Dupont',
        description: 'Présentation des maquettes et discussion des retours',
        startDate: new Date(today.getTime() + 1 * 86400000 + 10 * 3600000),
        endDate: new Date(today.getTime() + 1 * 86400000 + 11.5 * 3600000),
        color: '#10b981',
        location: 'Bureau client - Paris',
        userId: user.id,
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Atelier Design Sprint',
        description: 'Sprint de conception pour la nouvelle application mobile',
        startDate: new Date(today.getTime() + 2 * 86400000 + 9 * 3600000),
        endDate: new Date(today.getTime() + 2 * 86400000 + 17 * 3600000),
        color: '#f59e0b',
        allDay: false,
        location: 'Studio créatif',
        userId: user.id,
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Déjeuner networking',
        description: 'Rencontre avec d\'autres freelances du secteur tech',
        startDate: new Date(today.getTime() + 3 * 86400000 + 12 * 3600000),
        endDate: new Date(today.getTime() + 3 * 86400000 + 14 * 3600000),
        color: '#8b5cf6',
        location: 'Restaurant Le Comptoir',
        userId: user.id,
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Webinar React 19',
        description: 'Présentation des nouvelles fonctionnalités de React 19',
        startDate: new Date(today.getTime() + 4 * 86400000 + 14 * 3600000),
        endDate: new Date(today.getTime() + 4 * 86400000 + 16 * 3600000),
        color: '#06b6d4',
        userId: user.id,
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Deadline - Livraison projet Lambert',
        description: 'Date limite pour la livraison du site vitrine',
        startDate: new Date(today.getTime() + 5 * 86400000),
        color: '#ef4444',
        allDay: true,
        userId: user.id,
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Call hebdomadaire - Équipe Tech',
        description: 'Point hebdomadaire avec l\'équipe de développement',
        startDate: new Date(today.getTime() + 0 * 86400000 + 9 * 3600000),
        endDate: new Date(today.getTime() + 0 * 86400000 + 9.5 * 3600000),
        color: '#10b981',
        userId: user.id,
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Formation TypeScript avancé',
        description: 'Session de formation en ligne sur les patterns avancés',
        startDate: new Date(today.getTime() + 6 * 86400000 + 10 * 3600000),
        endDate: new Date(today.getTime() + 6 * 86400000 + 12 * 3600000),
        color: '#3b82f6',
        userId: user.id,
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Revue de code',
        description: 'Revue du code du module de paiement',
        startDate: new Date(today.getTime() + 1 * 86400000 + 14 * 3600000),
        endDate: new Date(today.getTime() + 1 * 86400000 + 15 * 3600000),
        color: '#f97316',
        userId: user.id,
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Rendez-vous comptable',
        description: 'Bilan trimestriel et optimisation fiscale',
        startDate: new Date(today.getTime() + 8 * 86400000 + 11 * 3600000),
        endDate: new Date(today.getTime() + 8 * 86400000 + 12 * 3600000),
        color: '#ec4899',
        location: 'Cabinet Durand - Lyon',
        userId: user.id,
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Présentation finale projet Moreau',
        description: 'Démonstration du site terminé au client',
        startDate: new Date(today.getTime() + 10 * 86400000 + 15 * 3600000),
        endDate: new Date(today.getTime() + 10 * 86400000 + 17 * 3600000),
        color: '#10b981',
        location: 'Visioconférence',
        userId: user.id,
      },
    }),
  ])

  // Create reminders
  const reminders = await Promise.all([
    prisma.reminder.create({
      data: {
        title: 'Envoyer la facture au client Dupont',
        message: 'N\'oublie pas d\'envoyer la facture F-2025-0042 avant la fin de la journée',
        remindAt: new Date(today.getTime() + 2 * 3600000),
        isSent: false,
        type: 'notification',
        userId: user.id,
      },
    }),
    prisma.reminder.create({
      data: {
        title: 'Préparer la présentation',
        message: 'Préparer les slides pour la réunion de demain avec le client Martin',
        remindAt: new Date(today.getTime() + 18 * 3600000),
        isSent: false,
        type: 'notification',
        relatedId: tasks[7].id,
        userId: user.id,
      },
    }),
    prisma.reminder.create({
      data: {
        title: 'Relancer le client Lambert',
        message: 'Le client n\'a pas répondu depuis 5 jours, il faut le relancer',
        remindAt: new Date(today.getTime() + 24 * 3600000),
        isSent: false,
        type: 'email',
        userId: user.id,
      },
    }),
    prisma.reminder.create({
      data: {
        title: 'Sauvegarder les fichiers',
        message: 'Faire une sauvegarde complète du projet avant la deadline',
        remindAt: new Date(today.getTime() - 24 * 3600000),
        isSent: true,
        type: 'notification',
        userId: user.id,
      },
    }),
    prisma.reminder.create({
      data: {
        title: 'Payer l\'abonnement Adobe',
        message: 'L\'abonnement Creative Cloud expire dans 3 jours',
        remindAt: new Date(today.getTime() - 48 * 3600000),
        isSent: true,
        type: 'email',
        userId: user.id,
      },
    }),
  ])

  // Create email account
  const emailAccount = await prisma.emailAccount.create({
    data: {
      provider: 'gmail',
      email: 'alex.martin@gmail.com',
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      isPrimary: true,
      userId: user.id,
    },
  })

  // Create emails
  const emails = await Promise.all([
    prisma.email.create({
      data: {
        fromAddress: 'sophie.dupont@dupont-design.fr',
        fromName: 'Sophie Dupont',
        toAddress: 'alex.martin@gmail.com',
        subject: 'Retours sur les maquettes - Projet E-commerce',
        body: 'Bonjour Alex,\n\nJ\'ai examiné les maquettes que vous avez envoyées hier. Dans l\'ensemble, le design est très réussi !\n\nCependant, j\'ai quelques retours :\n1. La page d\'accueil pourrait bénéficier d\'une section témoignages\n2. Les filtres de produits sont un peu trop discrets\n3. Le processus de checkout est parfait, bravo !\n\nPouvez-vous intégrer ces modifications d\'ici vendredi ?\n\nCordialement,\nSophie',
        snippet: 'J\'ai examiné les maquettes que vous avez envoyées hier. Dans l\'ensemble, le design est très réussi...',
        isRead: false,
        isStarred: true,
        receivedAt: new Date(now.getTime() - 2 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'pierre.martin@techcorp.io',
        fromName: 'Pierre Martin',
        toAddress: 'alex.martin@gmail.com',
        subject: 'Proposition de collaboration - Application mobile',
        body: 'Bonjour Alex,\n\nJe suis Pierre Martin, CTO de TechCorp. Nous cherchons un développeur freelance pour notre nouveau projet d\'application mobile.\n\nLe projet concerne :\n- Application de gestion de tâches pour équipes\n- Stack technique : React Native + Node.js\n- Durée estimée : 4 mois\n- Budget : à discuter\n\nSeriez-vous disponible pour un appel la semaine prochaine ?\n\nCordialement,\nPierre Martin\nCTO, TechCorp',
        snippet: 'Nous cherchons un développeur freelance pour notre nouveau projet d\'application mobile...',
        isRead: false,
        isStarred: false,
        receivedAt: new Date(now.getTime() - 5 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'notifications@github.com',
        fromName: 'GitHub',
        toAddress: 'alex.martin@gmail.com',
        subject: '[alexm-dev/ecommerce] Issue #42: Bug de paiement Safari',
        body: 'Un nouveau commentaire a été ajouté sur l\'issue #42.\n\n@marie-dev: J\'ai reproduit le bug sur Safari 17.2. Le problème semble venir de la gestion des sessions côté client. Je propose d\'utiliser localStorage comme fallback.',
        snippet: 'Un nouveau commentaire a été ajouté sur l\'issue #42 - Bug de paiement Safari...',
        isRead: true,
        isStarred: false,
        receivedAt: new Date(now.getTime() - 8 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'comptabilite@freelance-fr.org',
        fromName: 'Freelance France',
        toAddress: 'alex.martin@gmail.com',
        subject: 'Rappel : Déclaration URSSAF trimestrielle',
        body: 'Bonjour Alex,\n\nCeci est un rappel amical que votre déclaration URSSAF pour le trimestre en cours est due avant le 31 du mois.\n\nMontant estimé basé sur vos revenus : 2 450,00 €\n\nConnectez-vous à votre espace URSSAF pour effectuer votre déclaration.\n\nCordialement,\nL\'équipe Freelance France',
        snippet: 'Rappel : votre déclaration URSSAF pour le trimestre en cours est due avant le 31 du mois...',
        isRead: false,
        isStarred: true,
        receivedAt: new Date(now.getTime() - 12 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'jean.lambert@lambert-sa.com',
        fromName: 'Jean Lambert',
        toAddress: 'alex.martin@gmail.com',
        subject: 'Re: Avancement du projet site vitrine',
        body: 'Bonjour Alex,\n\nMerci pour le point d\'avancement. Le travail réalisé jusqu\'ici est conforme à nos attentes.\n\nPourrions-nous planifier une revue intermédiaire la semaine prochaine ? J\'aimerais impliquer notre directeur marketing.\n\nCordialement,\nJean Lambert\nDirecteur, Lambert & Associés',
        snippet: 'Merci pour le point d\'avancement. Pourrions-nous planifier une revue intermédiaire...',
        isRead: true,
        isStarred: false,
        receivedAt: new Date(now.getTime() - 24 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'no-reply@stripe.com',
        fromName: 'Stripe',
        toAddress: 'alex.martin@gmail.com',
        subject: 'Paiement reçu - Facture #INV-2025-0089',
        body: 'Bonjour,\n\nNous confirmons la réception de votre paiement de 3 500,00 € pour la facture #INV-2025-0089.\n\nLe paiement a été traité avec succès et sera disponible sur votre compte dans 2 jours ouvrés.\n\nDétails :\n- Montant : 3 500,00 €\n- Facture : #INV-2025-0089\n- Client : Dupont Design\n- Date : ' + now.toLocaleDateString('fr-FR') + '\n\nMerci d\'utiliser Stripe.',
        snippet: 'Nous confirmons la réception de votre paiement de 3 500,00 € pour la facture #INV-2025-0089...',
        isRead: true,
        isStarred: true,
        receivedAt: new Date(now.getTime() - 36 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'marie.moreau@startup-innov.fr',
        fromName: 'Marie Moreau',
        toAddress: 'alex.martin@gmail.com',
        subject: 'Invitation - Conférence Tech & Design 2025',
        body: 'Bonjour Alex,\n\nJ\'ai le plaisir de vous inviter à la Conférence Tech & Design 2025 qui se tiendra le 15 mars au Palais des Congrès de Paris.\n\nAu programme :\n- Keynote : L\'avenir du design system\n- Ateliers pratiques sur Figma et les outils no-code\n- Networking avec plus de 500 professionnels\n\nEn tant que freelance reconnu, nous serions honorés de votre présence. Une place VIP vous est réservée.\n\nCordialement,\nMarie Moreau\nOrganisatrice, Tech & Design 2025',
        snippet: 'J\'ai le plaisir de vous inviter à la Conférence Tech & Design 2025...',
        isRead: false,
        isStarred: false,
        receivedAt: new Date(now.getTime() - 48 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'alex.martin@gmail.com',
        fromName: 'Alex Martin',
        toAddress: 'sophie.dupont@dupont-design.fr',
        subject: 'Re: Retours sur les maquettes - Projet E-commerce',
        body: 'Bonjour Sophie,\n\nMerci pour vos retours constructifs ! Je vais intégrer les modifications cette semaine.\n\nPour la section témoignages, j\'ai quelques idées que je partagerai dans la prochaine itération.\n\nCordialement,\nAlex',
        snippet: 'Merci pour vos retours constructifs ! Je vais intégrer les modifications cette semaine...',
        isRead: true,
        isStarred: false,
        isSent: true,
        receivedAt: new Date(now.getTime() - 1 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'newsletter@medium.com',
        fromName: 'Medium Daily Digest',
        toAddress: 'alex.martin@gmail.com',
        subject: 'Les 10 tendances du développement web en 2025',
        body: 'Votre résumé quotidien des meilleurs articles sur Medium.\n\nAujourd\'hui :\n1. Pourquoi TypeScript domine le développement frontend\n2. Les frameworks CSS qui changent la donne\n3. React Server Components : guide complet\n4. L\'essor du edge computing\n5. Comment l\'IA transforme le développement logiciel',
        snippet: 'Votre résumé quotidien - Les 10 tendances du développement web en 2025...',
        isRead: true,
        isStarred: false,
        receivedAt: new Date(now.getTime() - 72 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'support@figma.com',
        fromName: 'Figma',
        toAddress: 'alex.martin@gmail.com',
        subject: 'Nouvelles fonctionnalités Figma - Mode Dev amélioré',
        body: 'Bonjour Alex,\n\nDécouvrez les nouvelles fonctionnalités de Figma :\n\n- Mode Dev amélioré avec inspection CSS avancée\n- Variables de design system exportables\n- Intégration GitHub améliorée\n- Composants variables avec auto-layout\n\nEssayez ces fonctionnalités dès maintenant dans vos projets.\n\nL\'équipe Figma',
        snippet: 'Découvrez les nouvelles fonctionnalités de Figma - Mode Dev amélioré...',
        isRead: false,
        isStarred: false,
        receivedAt: new Date(now.getTime() - 96 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'contact@coworking-lyon.fr',
        fromName: 'Espace Coworking Lyon',
        toAddress: 'alex.martin@gmail.com',
        subject: 'Votre réservation - Espace Privatif Semaine Prochaine',
        body: 'Bonjour Alex,\n\nNous confirmons votre réservation :\n\n- Espace : Bureau privatif #12\n- Date : Lundi 10 au Vendredi 14\n- Horaires : 8h - 19h\n- Accès : Badge + code 4521\n\nN\'hésitez pas à nous contacter pour tout besoin.\n\nL\'équipe Espace Coworking Lyon',
        snippet: 'Nous confirmons votre réservation - Bureau privatif #12 pour la semaine prochaine...',
        isRead: true,
        isStarred: false,
        receivedAt: new Date(now.getTime() - 120 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
    prisma.email.create({
      data: {
        fromAddress: 'luc.bernard@agence-digitale.fr',
        fromName: 'Luc Bernard',
        toAddress: 'alex.martin@gmail.com',
        subject: 'Partenariat potentiel - Refonte site vitrine',
        body: 'Bonjour Alex,\n\nJe suis Luc Bernard, directeur de l\'Agence Digitale. Nous avons un client qui souhaite refaire son site vitrine et nous cherchons un développeur freelance compétent.\n\nBudget : 8 000 - 12 000 €\nDélai : 6 semaines\nTechno : Next.js + Headless CMS\n\nSi cela vous intéresse, contactez-moi pour en discuter.\n\nCordialement,\nLuc Bernard',
        snippet: 'Nous avons un client qui souhaite refaire son site vitrine - Budget 8-12K€...',
        isRead: false,
        isStarred: true,
        receivedAt: new Date(now.getTime() - 144 * 3600000),
        emailAccountId: emailAccount.id,
        userId: user.id,
      },
    }),
  ])

  console.log('Seed data created successfully!')
  console.log(`- User: ${user.name} (${user.email})`)
  console.log(`- Tasks: ${tasks.length}`)
  console.log(`- Events: ${events.length}`)
  console.log(`- Reminders: ${reminders.length}`)
  console.log(`- Email Account: ${emailAccount.email}`)
  console.log(`- Emails: ${emails.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
