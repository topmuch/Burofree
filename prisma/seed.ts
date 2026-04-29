import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper: get a Date relative to today
function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function hoursOnDate(baseDate: Date, hours: number): Date {
  const d = new Date(baseDate)
  d.setHours(hours, 0, 0, 0)
  return d
}

async function main() {
  // Clean all data in correct order (respecting foreign keys)
  await prisma.chatMessage.deleteMany()
  await prisma.weeklyGoal.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.snippet.deleteMany()
  await prisma.document.deleteMany()
  await prisma.timeEntry.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.email.deleteMany()
  await prisma.emailAccount.deleteMany()
  await prisma.reminder.deleteMany()
  await prisma.calendarEvent.deleteMany()
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  // ============================================================
  // 1. USERS (Superadmin + Admin + Demo User)
  // ============================================================

  // Hash passwords for test accounts
  const superadminPasswordHash = await bcrypt.hash('Superadmin2026!', 12)
  const adminPasswordHash = await bcrypt.hash('Admin2026!', 12)
  const userPasswordHash = await bcrypt.hash('User2026!', 12)

  const superadmin = await prisma.user.create({
    data: {
      email: 'superadmin@burozen.com',
      name: 'Super Admin',
      passwordHash: superadminPasswordHash,
      profession: 'Administrateur Plateforme',
      timezone: 'Europe/Paris',
      assistantName: 'Burozen AI',
      assistantTone: 'professional',
      theme: 'dark',
      focusMode: false,
      onboardingDone: true,
      role: 'superadmin',
    },
  })

  const admin = await prisma.user.create({
    data: {
      email: 'admin@burozen.com',
      name: 'Admin Burozen',
      passwordHash: adminPasswordHash,
      profession: 'Administrateur',
      timezone: 'Europe/Paris',
      assistantName: 'Burozen AI',
      assistantTone: 'friendly',
      theme: 'dark',
      focusMode: false,
      onboardingDone: true,
      role: 'admin',
    },
  })

  const user = await prisma.user.create({
    data: {
      email: 'alex@freelance.dev',
      name: 'Alex Martin',
      passwordHash: userPasswordHash,
      profession: 'Développeur Web Freelance',
      timezone: 'Europe/Paris',
      assistantName: 'Burozen AI',
      assistantTone: 'friendly',
      theme: 'dark',
      focusMode: false,
      onboardingDone: true,
      role: 'user',
    },
  })

  // ============================================================
  // 2. PROJECTS
  // ============================================================
  const projectBiovert = await prisma.project.create({
    data: {
      name: 'Site E-Commerce BioVert',
      description: 'Création du site e-commerce complet pour la boutique de produits bio et écologiques',
      clientName: 'BioVert',
      color: '#10b981',
      status: 'active',
      budget: 5000,
      deadline: daysFromNow(45),
      userId: user.id,
    },
  })

  const projectFintrack = await prisma.project.create({
    data: {
      name: 'App Mobile FinTrack',
      description: 'Application mobile iOS/Android de suivi financier pour les freelances',
      clientName: 'FinTrack SAS',
      color: '#f59e0b',
      status: 'active',
      budget: 8000,
      deadline: daysFromNow(60),
      userId: user.id,
    },
  })

  const projectKrea = await prisma.project.create({
    data: {
      name: 'Refonte Logo StudioKrea',
      description: 'Refonte complète de l\'identité visuelle et du logo de l\'agence créative',
      clientName: 'StudioKrea',
      color: '#8b5cf6',
      status: 'on_hold',
      budget: 1500,
      deadline: daysFromNow(15),
      userId: user.id,
    },
  })

  const projectPetit = await prisma.project.create({
    data: {
      name: 'Coaching Digital Mme Petit',
      description: 'Accompagnement digital et formation aux outils numériques pour Mme Petit',
      clientName: 'Mme Petit',
      color: '#ec4899',
      status: 'active',
      budget: 600,
      userId: user.id,
    },
  })

  // ============================================================
  // 3. TASKS (15)
  // ============================================================
  const tasks = [
    {
      title: 'Intégrer la page catalogue produits',
      description: 'Développer la page catalogue avec filtres par catégorie et tri dynamique',
      status: 'in_progress',
      priority: 'high',
      dueDate: daysFromNow(1),
      category: 'dev',
      estimatedTime: 240,
      actualTime: 120,
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      title: 'Corriger le bug de paiement Stripe',
      description: 'Le processus de paiement échoue sur mobile avec les cartes Visa',
      status: 'in_progress',
      priority: 'urgent',
      dueDate: daysFromNow(0),
      category: 'bug',
      estimatedTime: 60,
      actualTime: 30,
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      title: 'Configurer le système de notifications push',
      description: 'Mettre en place les notifications push via Firebase Cloud Messaging',
      status: 'todo',
      priority: 'medium',
      dueDate: daysFromNow(3),
      category: 'dev',
      estimatedTime: 300,
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      title: 'Design des écrans d\'onboarding',
      description: 'Créer les maquettes des 4 écrans d\'onboarding pour l\'application mobile',
      status: 'todo',
      priority: 'medium',
      dueDate: daysFromNow(5),
      category: 'design',
      estimatedTime: 180,
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      title: 'Intégration API OpenBanking',
      description: 'Connecter l\'API du partenaire bancaire pour la synchronisation des comptes',
      status: 'in_progress',
      priority: 'high',
      dueDate: daysFromNow(2),
      category: 'dev',
      estimatedTime: 480,
      actualTime: 200,
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      title: 'Tests unitaires module authentification',
      description: 'Écrire les tests unitaires et d\'intégration pour le module d\'authentification',
      status: 'todo',
      priority: 'low',
      dueDate: daysFromNow(7),
      category: 'test',
      estimatedTime: 180,
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      title: 'Présenter les propositions de logo v2',
      description: 'Présenter les 3 nouvelles propositions de logo au client StudioKrea',
      status: 'waiting_client',
      priority: 'medium',
      dueDate: daysFromNow(-1),
      category: 'design',
      estimatedTime: 60,
      projectId: projectKrea.id,
      userId: user.id,
    },
    {
      title: 'Rédiger le rapport d\'avancement BioVert',
      description: 'Rapport mensuel d\'avancement du projet e-commerce pour le client BioVert',
      status: 'todo',
      priority: 'medium',
      dueDate: daysFromNow(1),
      category: 'admin',
      estimatedTime: 90,
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      title: 'Optimiser les performances du site',
      description: 'Audit Lighthouse et optimisation du Core Web Vitals pour la page d\'accueil',
      status: 'todo',
      priority: 'low',
      dueDate: daysFromNow(8),
      category: 'dev',
      estimatedTime: 240,
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      title: 'Mettre à jour la documentation API',
      description: 'Documentation technique de l\'API REST avec Swagger/OpenAPI',
      status: 'todo',
      priority: 'low',
      dueDate: daysFromNow(6),
      category: 'docs',
      estimatedTime: 120,
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      title: 'Session coaching #3 - Outils collaboratifs',
      description: 'Formation de Mme Petit sur les outils collaboratifs (Slack, Notion, Drive)',
      status: 'done',
      priority: 'low',
      dueDate: daysFromNow(-3),
      category: 'meeting',
      estimatedTime: 60,
      actualTime: 75,
      projectId: projectPetit.id,
      userId: user.id,
      completedAt: daysFromNow(-3),
    },
    {
      title: 'Livrer les maquettes finales logo',
      description: 'Livrer les fichiers sources des maquettes validées au format AI et SVG',
      status: 'done',
      priority: 'medium',
      dueDate: daysFromNow(-2),
      category: 'design',
      estimatedTime: 30,
      actualTime: 25,
      projectId: projectKrea.id,
      userId: user.id,
      completedAt: daysFromNow(-2),
    },
    {
      title: 'Appel découverte nouveau prospect',
      description: 'Premier appel avec un prospect intéressé par un site vitrine',
      status: 'todo',
      priority: 'high',
      dueDate: daysFromNow(1),
      category: 'meeting',
      estimatedTime: 45,
      userId: user.id,
    },
    {
      title: 'Réviser le devis FinTrack Phase 2',
      description: 'Mettre à jour le devis avec les nouvelles fonctionnalités demandées par le client',
      status: 'todo',
      priority: 'high',
      dueDate: daysFromNow(0),
      category: 'admin',
      estimatedTime: 60,
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      title: 'Déployer la v1.2 en production',
      description: 'Déployer la version 1.2 du site BioVert avec les corrections de bugs',
      status: 'todo',
      priority: 'medium',
      dueDate: daysFromNow(5),
      category: 'devops',
      estimatedTime: 120,
      projectId: projectBiovert.id,
      userId: user.id,
    },
  ]

  for (const task of tasks) {
    await prisma.task.create({ data: task })
  }

  // ============================================================
  // 4. CALENDAR EVENTS (12)
  // ============================================================
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = daysFromNow(1)
  tomorrow.setHours(0, 0, 0, 0)
  const nextWeek = daysFromNow(7)
  nextWeek.setHours(0, 0, 0, 0)

  const events = [
    {
      title: 'Point quotidien BioVert',
      description: 'Standup quotidien avec l\'équipe projet BioVert',
      startDate: hoursOnDate(today, 9),
      endDate: hoursOnDate(today, 9.5),
      color: '#10b981',
      type: 'meeting',
      location: 'Google Meet',
      userId: user.id,
    },
    {
      title: 'Appel client FinTrack SAS',
      description: 'Revue des spécifications API OpenBanking avec l\'équipe FinTrack',
      startDate: hoursOnDate(today, 11),
      endDate: hoursOnDate(today, 12),
      color: '#f59e0b',
      type: 'meeting',
      location: 'Zoom',
      userId: user.id,
    },
    {
      title: 'Créneau Focus - Développement',
      description: 'Bloc de concentration pour le développement du catalogue BioVert',
      startDate: hoursOnDate(today, 14),
      endDate: hoursOnDate(today, 17),
      color: '#6366f1',
      type: 'block',
      userId: user.id,
    },
    {
      title: 'Deadline propositions logo',
      description: 'Date limite pour les propositions de logo StudioKrea',
      startDate: daysFromNow(-1),
      color: '#8b5cf6',
      type: 'deadline',
      allDay: true,
      userId: user.id,
    },
    {
      title: 'Revue de projet BioVert',
      description: 'Revue hebdomadaire de l\'avancement du projet e-commerce',
      startDate: hoursOnDate(tomorrow, 10),
      endDate: hoursOnDate(tomorrow, 11),
      color: '#10b981',
      type: 'meeting',
      location: 'Bureau client BioVert',
      userId: user.id,
    },
    {
      title: 'Déjeuner networking freelance',
      description: 'Rencontre mensuelle avec d\'autres freelances du numérique',
      startDate: hoursOnDate(tomorrow, 12),
      endDate: hoursOnDate(tomorrow, 13.5),
      color: '#ec4899',
      type: 'meeting',
      location: 'Le Petit Bistrot - Paris 11e',
      userId: user.id,
    },
    {
      title: 'Formation React Native',
      description: 'Workshop en ligne sur les dernières avancées React Native',
      startDate: hoursOnDate(nextWeek, 9),
      endDate: hoursOnDate(nextWeek, 12),
      color: '#f59e0b',
      type: 'meeting',
      location: 'En ligne',
      userId: user.id,
    },
    {
      title: 'Livraison sprint 4 FinTrack',
      description: 'Fin du sprint et démonstration au client',
      startDate: daysFromNow(9),
      color: '#f59e0b',
      type: 'deadline',
      allDay: true,
      userId: user.id,
    },
    {
      title: 'Créneau Focus - Design',
      description: 'Travail sur les maquettes et interfaces',
      startDate: hoursOnDate(daysFromNow(2), 9),
      endDate: hoursOnDate(daysFromNow(2), 12),
      color: '#6366f1',
      type: 'block',
      userId: user.id,
    },
    {
      title: 'Rappel facture StudioKrea',
      description: 'Relancer pour la facture de la refonte logo',
      startDate: hoursOnDate(tomorrow, 8),
      color: '#8b5cf6',
      type: 'reminder',
      userId: user.id,
    },
    {
      title: 'Session coaching Mme Petit',
      description: 'Session #4 - Formation aux outils de visioconférence',
      startDate: hoursOnDate(daysFromNow(4), 14),
      endDate: hoursOnDate(daysFromNow(4), 15.5),
      color: '#ec4899',
      type: 'meeting',
      location: 'Microsoft Teams',
      userId: user.id,
    },
    {
      title: 'Deadline rapport mensuel',
      description: 'Envoi du rapport d\'avancement à tous les clients',
      startDate: hoursOnDate(daysFromNow(1), 18),
      color: '#ef4444',
      type: 'deadline',
      userId: user.id,
    },
  ]

  for (const event of events) {
    await prisma.calendarEvent.create({ data: event })
  }

  // ============================================================
  // 5. REMINDERS (5)
  // ============================================================
  const reminders = [
    {
      title: 'Envoyer la facture BioVert',
      message: 'La facture du sprint 2 est prête à être envoyée à BioVert',
      remindAt: hoursOnDate(today, 10),
      type: 'in_app',
      relatedType: 'invoice',
      userId: user.id,
    },
    {
      title: 'Relancer FinTrack SAS',
      message: 'Pas de réponse depuis 3 jours sur les spécifications API OpenBanking',
      remindAt: hoursOnDate(tomorrow, 9),
      type: 'in_app',
      relatedType: 'task',
      userId: user.id,
    },
    {
      title: 'Préparer la démo sprint',
      message: 'Préparer la démo pour la revue de vendredi avec FinTrack SAS',
      remindAt: hoursOnDate(nextWeek, 8),
      type: 'in_app',
      relatedType: 'task',
      userId: user.id,
    },
    {
      title: 'Appeler le comptable',
      message: 'Discuter des charges sociales du 2ème trimestre 2026',
      remindAt: hoursOnDate(tomorrow, 14),
      type: 'in_app',
      userId: user.id,
    },
    {
      title: 'Mettre à jour le portfolio',
      message: 'Ajouter le projet BioVert et FinTrack au portfolio en ligne',
      remindAt: hoursOnDate(nextWeek, 10),
      type: 'in_app',
      userId: user.id,
    },
  ]

  for (const reminder of reminders) {
    await prisma.reminder.create({ data: reminder })
  }

  // ============================================================
  // 6. EMAIL ACCOUNT
  // ============================================================
  const emailAccount = await prisma.emailAccount.create({
    data: {
      provider: 'gmail',
      email: 'alex@freelance.dev',
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      isPrimary: true,
      userId: user.id,
    },
  })

  // ============================================================
  // 7. EMAILS (15)
  // ============================================================
  const emails = [
    {
      fromAddress: 'claire@biovert.fr',
      fromName: 'Claire Dubois',
      toAddress: 'alex@freelance.dev',
      subject: 'Re: Avancement sprint 3 - Site e-commerce',
      body: 'Bonjour Alex,\n\nPouvez-vous me confirmer que le bug de paiement Stripe sera résolu pour la mise en production de vendredi ?\n\nCordialement,\nClaire Dubois\nBioVert',
      snippet: 'Pouvez-vous me confirmer que le bug de paiement sera résolu...',
      isRead: false,
      category: 'client',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'thomas@fintrack-sas.com',
      fromName: 'Thomas Lefèvre',
      toAddress: 'alex@freelance.dev',
      subject: 'Spécifications API OpenBanking v2',
      body: 'Salut Alex,\n\nVoici les specs mises à jour pour l\'API bancaire. On a ajouté l\'authentification 2FA et la synchronisation multi-comptes.\n\nDis-moi si tu as des questions.\n\nA+\nThomas',
      snippet: 'Voici les specs mises à jour pour l\'API bancaire...',
      isRead: false,
      category: 'client',
      isStarred: true,
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'no-reply@urssaf.fr',
      fromName: 'URSSAF',
      toAddress: 'alex@freelance.dev',
      subject: 'Échéance cotisations T2 2026',
      body: 'Bonjour,\n\nVos cotisations du 2ème trimestre 2026 sont dues avant le 15 mai 2026.\nMontant estimé : 2 450,00 €\n\nConnectez-vous à votre espace pour régler en ligne.\n\nService URSSAF',
      snippet: 'Vos cotisations du 2ème trimestre 2026 sont dues avant le 15 mai...',
      isRead: false,
      category: 'admin',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'sophie@studiokrea.fr',
      fromName: 'Sophie Martin',
      toAddress: 'alex@freelance.dev',
      subject: 'Propositions logo - Retour',
      body: 'Bonjour Alex,\n\nOn a bien reçu les 3 propositions de logo. On privilégie la version 2 avec quelques modifications sur la typographie.\n\nPouvez-vous nous envoyer une révision d\'ici la fin de semaine ?\n\nMerci,\nSophie\nStudioKrea',
      snippet: 'On privilégie la version 2 avec quelques modifications...',
      isRead: true,
      category: 'client',
      isStarred: true,
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'newsletter@tech-france.fr',
      fromName: 'Tech France Newsletter',
      toAddress: 'alex@freelance.dev',
      subject: 'Les 10 tendances tech 2026',
      body: 'Découvrez les tendances technologiques qui façonnent 2026 : IA générative, Edge Computing, Web3...\n\nLire l\'article complet sur notre site.',
      snippet: 'Découvrez les tendances technologiques qui façonnent 2026...',
      isRead: true,
      category: 'newsletter',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'claire@biovert.fr',
      fromName: 'Claire Dubois',
      toAddress: 'alex@freelance.dev',
      subject: 'Demande de devis - Application mobile bio',
      body: 'Bonjour Alex,\n\nSuite à notre discussion, pourriez-vous nous envoyer un devis pour le développement d\'une application mobile complémentaire au site e-commerce ?\n\nCordialement,\nClaire Dubois\nBioVert',
      snippet: 'Pourriez-vous nous envoyer un devis pour l\'application mobile...',
      isRead: false,
      category: 'client',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'contact@cabinet-durand.fr',
      fromName: 'Cabinet Durand',
      toAddress: 'alex@freelance.dev',
      subject: 'Bilan comptable 2025 - Document final',
      body: 'Bonjour,\n\nVeuillez trouver ci-joint votre bilan comptable 2025. N\'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nCabinet Durand\nExpertise Comptable',
      snippet: 'Veuillez trouver ci-joint votre bilan comptable 2025...',
      isRead: true,
      category: 'admin',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'promo@aws.amazon.com',
      fromName: 'AWS',
      toAddress: 'alex@freelance.dev',
      subject: 'Offre spéciale - Crédits gratuits pour freelances',
      body: 'Découvrez nos offres de crédits gratuits pour les startups et freelances. Jusqu\'à 10 000$ de crédits AWS...',
      snippet: 'Découvrez nos offres de crédits gratuits pour freelances...',
      isRead: true,
      category: 'newsletter',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'thomas@fintrack-sas.com',
      fromName: 'Thomas Lefèvre',
      toAddress: 'alex@freelance.dev',
      subject: 'Re: Planning de la semaine - Report de réunion',
      body: 'Salut Alex,\n\nOn peut décaler notre call de mardi à mercredi 10h ? J\'ai un conflit d\'agenda.\n\nMerci d\'avance,\nThomas',
      snippet: 'On peut décaler notre call de mardi à mercredi 10h ?',
      isRead: false,
      category: 'client',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'notifications@stripe.com',
      fromName: 'Stripe',
      toAddress: 'alex@freelance.dev',
      subject: 'Paiement reçu - 3 500,00 €',
      body: 'Bonjour,\n\nNous confirmons la réception du paiement de 3 500,00 € sur votre compte Stripe.\n\nLe montant sera disponible sur votre compte bancaire sous 2-3 jours ouvrés.\n\nL\'équipe Stripe',
      snippet: 'Nous confirmons la réception du paiement de 3 500,00 €...',
      isRead: true,
      category: 'admin',
      isStarred: true,
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'marie.petit@laposte.net',
      fromName: 'Marie Petit',
      toAddress: 'alex@freelance.dev',
      subject: 'Merci pour la session d\'hier',
      body: 'Bonjour Alex,\n\nMerci beaucoup pour la session d\'hier sur les outils collaboratifs ! J\'ai réussi à créer mon espace Notion comme vous m\'avez montré.\n\nÀ jeudi pour la prochaine session !\n\nMarie Petit',
      snippet: 'Merci beaucoup pour la session d\'hier sur les outils collaboratifs !',
      isRead: false,
      category: 'client',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'newsletter@design-weekly.com',
      fromName: 'Design Weekly',
      toAddress: 'alex@freelance.dev',
      subject: 'Top outils Figma 2026 - Les indispensables',
      body: 'Les meilleurs plugins et outils Figma pour booster votre productivité en 2026. Au programme : auto-layout avancé, tokens de design, et plus encore...',
      snippet: 'Les meilleurs plugins et outils Figma pour 2026...',
      isRead: true,
      category: 'newsletter',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'claire@biovert.fr',
      fromName: 'Claire Dubois',
      toAddress: 'alex@freelance.dev',
      subject: 'Félicitations pour le sprint 2 !',
      body: 'Bonjour Alex,\n\nBravo pour le travail sur le sprint 2 ! Le catalogue est vraiment super, l\'équipe est ravie du résultat.\n\nOn est impatients de voir la suite.\n\nCordialement,\nClaire Dubois\nBioVert',
      snippet: 'Bravo pour le travail sur le sprint 2 !',
      isRead: false,
      category: 'client',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'no-reply@github.com',
      fromName: 'GitHub',
      toAddress: 'alex@freelance.dev',
      subject: 'Alerte de sécurité : vulnérabilité dans une dépendance',
      body: 'Une vulnérabilité a été détectée dans l\'une de vos dépendances (lodash < 4.17.21). Nous vous recommandons de la mettre à jour dès que possible.',
      snippet: 'Une vulnérabilité a été détectée dans une dépendance...',
      isRead: false,
      category: 'admin',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
    {
      fromAddress: 'sophie@studiokrea.fr',
      fromName: 'Sophie Martin',
      toAddress: 'alex@freelance.dev',
      subject: 'Projet en pause - Confirmation',
      body: 'Bonjour Alex,\n\nComme discuté par téléphone, nous mettons le projet de refonte du logo en pause pour le moment. Nous vous recontacterons dès que nous serons prêts à reprendre.\n\nMerci pour votre compréhension.\n\nSophie Martin\nStudioKrea',
      snippet: 'Nous mettons le projet de refonte du logo en pause...',
      isRead: true,
      category: 'client',
      userId: user.id,
      emailAccountId: emailAccount.id,
    },
  ]

  for (const email of emails) {
    await prisma.email.create({ data: email })
  }

  // ============================================================
  // 8. INVOICES (4)
  // ============================================================
  const invoices = [
    {
      number: 'D-2026-004',
      type: 'quote',
      clientName: 'FinTrack SAS',
      clientEmail: 'thomas@fintrack-sas.com',
      clientAddress: '25 Avenue des Champs-Élysées, 75008 Paris',
      items: JSON.stringify([
        { description: 'Développement application mobile - Phase 2', quantity: 60, unitPrice: 85 },
        { description: 'Intégration API bancaire avancée', quantity: 30, unitPrice: 95 },
        { description: 'Tests et assurance qualité', quantity: 15, unitPrice: 70 },
      ]),
      subtotal: 8350,
      taxRate: 20.0,
      taxAmount: 1670,
      total: 10020,
      currency: 'EUR',
      status: 'draft',
      dueDate: daysFromNow(60),
      notes: 'Devis en cours de révision suite aux nouvelles demandes du client',
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      number: 'F-2026-002',
      type: 'invoice',
      clientName: 'FinTrack SAS',
      clientEmail: 'compta@fintrack-sas.com',
      clientAddress: '25 Avenue des Champs-Élysées, 75008 Paris',
      items: JSON.stringify([
        { description: 'Conception architecture technique', quantity: 20, unitPrice: 90 },
        { description: 'Développement API v1', quantity: 35, unitPrice: 85 },
      ]),
      subtotal: 4875,
      taxRate: 20.0,
      taxAmount: 975,
      total: 5850,
      currency: 'EUR',
      status: 'sent',
      dueDate: daysFromNow(15),
      notes: 'Paiement à 30 jours',
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      number: 'F-2026-001',
      type: 'invoice',
      clientName: 'BioVert',
      clientEmail: 'compta@biovert.fr',
      clientAddress: '8 Rue des Jardins, 69001 Lyon',
      items: JSON.stringify([
        { description: 'Développement front-end Sprint 1-2', quantity: 50, unitPrice: 75 },
        { description: 'Développement back-end Sprint 1-2', quantity: 30, unitPrice: 85 },
      ]),
      subtotal: 6300,
      taxRate: 20.0,
      taxAmount: 1260,
      total: 7560,
      currency: 'EUR',
      status: 'paid',
      dueDate: daysFromNow(-30),
      paidAt: daysFromNow(-25),
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      number: 'F-2026-003',
      type: 'invoice',
      clientName: 'StudioKrea',
      clientEmail: 'sophie@studiokrea.fr',
      clientAddress: '15 Rue de la Créativité, 33000 Bordeaux',
      items: JSON.stringify([
        { description: 'Création logo - Propositions initiales', quantity: 8, unitPrice: 80 },
        { description: 'Déclinaisons charte graphique', quantity: 5, unitPrice: 70 },
        { description: 'Livraison fichiers sources', quantity: 2, unitPrice: 60 },
      ]),
      subtotal: 1090,
      taxRate: 20.0,
      taxAmount: 218,
      total: 1308,
      currency: 'EUR',
      status: 'overdue',
      dueDate: daysFromNow(-10),
      notes: 'Relance envoyée le ' + new Date().toLocaleDateString('fr-FR'),
      projectId: projectKrea.id,
      userId: user.id,
    },
  ]

  for (const invoice of invoices) {
    await prisma.invoice.create({ data: invoice })
  }

  // ============================================================
  // 9. TIME ENTRIES (10)
  // ============================================================
  const timeEntries = [
    {
      startTime: hoursOnDate(today, 9),
      endTime: hoursOnDate(today, 12),
      duration: 10800,
      description: 'Correction bug paiement Stripe',
      isBillable: true,
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      startTime: hoursOnDate(today, 14),
      endTime: hoursOnDate(today, 17),
      duration: 10800,
      description: 'Développement page catalogue produits',
      isBillable: true,
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      startTime: hoursOnDate(daysFromNow(-1), 9),
      endTime: hoursOnDate(daysFromNow(-1), 12.5),
      duration: 12600,
      description: 'Intégration API OpenBanking',
      isBillable: true,
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      startTime: hoursOnDate(daysFromNow(-1), 14),
      endTime: hoursOnDate(daysFromNow(-1), 16),
      duration: 7200,
      description: 'Revue de code et documentation API',
      isBillable: false,
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      startTime: hoursOnDate(daysFromNow(-3), 9),
      endTime: hoursOnDate(daysFromNow(-3), 12),
      duration: 10800,
      description: 'Design écrans onboarding FinTrack',
      isBillable: true,
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      startTime: hoursOnDate(daysFromNow(-3), 14),
      endTime: hoursOnDate(daysFromNow(-3), 17),
      duration: 10800,
      description: 'Front-end site e-commerce BioVert',
      isBillable: true,
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      startTime: hoursOnDate(daysFromNow(-4), 9),
      endTime: hoursOnDate(daysFromNow(-4), 13),
      duration: 14400,
      description: 'Sprint 2 - Fonctionnalités catalogue',
      isBillable: true,
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      startTime: hoursOnDate(daysFromNow(-5), 10),
      endTime: hoursOnDate(daysFromNow(-5), 12),
      duration: 7200,
      description: 'Session coaching Mme Petit - Outils collaboratifs',
      isBillable: true,
      projectId: projectPetit.id,
      userId: user.id,
    },
    {
      startTime: hoursOnDate(daysFromNow(-6), 9),
      endTime: hoursOnDate(daysFromNow(-6), 11),
      duration: 7200,
      description: 'Propositions logo StudioKrea',
      isBillable: true,
      projectId: projectKrea.id,
      userId: user.id,
    },
    {
      startTime: hoursOnDate(daysFromNow(-6), 14),
      endTime: hoursOnDate(daysFromNow(-6), 17),
      duration: 10800,
      description: 'Développement API FinTrack',
      isBillable: true,
      projectId: projectFintrack.id,
      userId: user.id,
    },
  ]

  for (const entry of timeEntries) {
    await prisma.timeEntry.create({ data: entry })
  }

  // ============================================================
  // 10. DOCUMENTS (5)
  // ============================================================
  const documents = [
    {
      name: 'Contrat de prestation BioVert',
      type: 'contract',
      content: 'Contrat de prestation de services entre Alex Martin et BioVert pour la création du site e-commerce...',
      mimeType: 'application/pdf',
      size: 245000,
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      name: 'Cahier des charges FinTrack SAS',
      type: 'other',
      content: 'Spécifications fonctionnelles et techniques de l\'application mobile FinTrack...',
      mimeType: 'application/pdf',
      size: 890000,
      projectId: projectFintrack.id,
      userId: user.id,
    },
    {
      name: 'Devis refonte logo StudioKrea',
      type: 'quote',
      content: 'Devis pour la création du logo et de l\'identité visuelle de StudioKrea...',
      mimeType: 'application/pdf',
      size: 156000,
      projectId: projectKrea.id,
      userId: user.id,
    },
    {
      name: 'Retour client Sprint 2 - BioVert',
      type: 'feedback',
      content: 'Retour très positif sur le sprint 2. Quelques ajustements mineurs demandés sur les filtres du catalogue...',
      mimeType: 'text/plain',
      size: 12000,
      projectId: projectBiovert.id,
      userId: user.id,
    },
    {
      name: 'Livrable Phase 1 - Coaching Mme Petit',
      type: 'deliverable',
      content: 'Synthèse des 3 premières sessions de coaching digital avec Mme Petit. Compétences acquises et points à approfondir...',
      mimeType: 'application/pdf',
      size: 340000,
      projectId: projectPetit.id,
      userId: user.id,
    },
  ]

  for (const doc of documents) {
    await prisma.document.create({ data: doc })
  }

  // ============================================================
  // 11. SNIPPETS (5)
  // ============================================================
  const snippets = [
    {
      title: 'Relance facture standard',
      content: 'Bonjour,\n\nJe me permets de vous relancer concernant la facture {{numero}} d\'un montant de {{montant}}€, dont l\'échéance était le {{date}}.\n\nMerci d\'avance pour votre retour.\n\nCordialement,\nAlex Martin',
      category: 'email_reply',
      userId: user.id,
    },
    {
      title: 'Clause de propriété intellectuelle',
      content: 'Le Prestataire conserve la pleine et entière propriété intellectuelle de tous les éléments préexistants mis à disposition du Client dans le cadre de la Prestation. Le Client obtient un droit d\'utilisation non exclusif pour les livrables finaux.',
      category: 'contract_clause',
      userId: user.id,
    },
    {
      title: 'Structure devis type',
      content: '1. Contexte et objectifs\n2. Périmètre de la prestation\n3. Livrables\n4. Planning prévisionnel\n5. Conditions financières\n6. Conditions générales de vente',
      category: 'quote_structure',
      userId: user.id,
    },
    {
      title: 'Réponse devis accepté',
      content: 'Bonjour,\n\nMerci pour votre retour positif ! Je vous confirme que nous pouvons démarrer la prestation à la date convenue.\n\nJe vous enverrai le contrat signé sous 48h.\n\nCordialement,\nAlex Martin',
      category: 'email_reply',
      userId: user.id,
    },
    {
      title: 'Suivi de projet hebdomadaire',
      content: 'Bonjour,\n\nVoici le point d\'avancement de cette semaine :\n\n✅ Réalisé :\n- {{réalisé}}\n\n🔄 En cours :\n- {{en_cours}}\n\n📋 À venir :\n- {{a_venir}}\n\nCordialement,\nAlex Martin',
      category: 'email_reply',
      userId: user.id,
    },
  ]

  for (const snippet of snippets) {
    await prisma.snippet.create({ data: snippet })
  }

  // ============================================================
  // 12. NOTIFICATIONS (8)
  // ============================================================
  const notifications = [
    {
      title: 'Facture en retard',
      message: 'La facture F-2026-003 pour StudioKrea est en retard de paiement depuis 10 jours',
      type: 'urgent',
      channel: 'in_app',
      actionUrl: '#invoices',
      userId: user.id,
    },
    {
      title: 'Nouvel email client',
      message: 'Claire Dubois (BioVert) vous a envoyé un message',
      type: 'info',
      channel: 'in_app',
      actionUrl: '#emails',
      userId: user.id,
    },
    {
      title: 'Tâche urgente',
      message: 'Le bug de paiement Stripe est marqué comme urgent et doit être résolu aujourd\'hui',
      type: 'warning',
      channel: 'in_app',
      actionUrl: '#tasks',
      userId: user.id,
    },
    {
      title: 'Paiement reçu',
      message: 'Le paiement de 7 560 € de BioVert a été confirmé',
      type: 'success',
      channel: 'in_app',
      isRead: true,
      actionUrl: '#invoices',
      userId: user.id,
    },
    {
      title: 'Rappel facture',
      message: 'Envoyer la facture du sprint 2 à BioVert aujourd\'hui',
      type: 'info',
      channel: 'in_app',
      userId: user.id,
    },
    {
      title: 'Deadline approche',
      message: 'La deadline du projet StudioKrea est dans 2 jours',
      type: 'warning',
      channel: 'in_app',
      isRead: true,
      userId: user.id,
    },
    {
      title: 'Nouveau devis en brouillon',
      message: 'Le devis D-2026-004 pour FinTrack SAS est en cours de rédaction',
      type: 'info',
      channel: 'in_app',
      isRead: true,
      userId: user.id,
    },
    {
      title: 'Emails en attente de réponse',
      message: '3 emails clients sont en attente de réponse depuis plus de 24h',
      type: 'warning',
      channel: 'in_app',
      userId: user.id,
    },
  ]

  for (const notification of notifications) {
    await prisma.notification.create({ data: notification })
  }

  // ============================================================
  // 13. WEEKLY GOALS (3)
  // ============================================================
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Lundi
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6) // Dimanche

  const goals = [
    {
      title: 'Tâches complétées',
      target: 10,
      current: 3,
      unit: 'tasks',
      weekStart,
      weekEnd,
      userId: user.id,
    },
    {
      title: 'Heures facturées',
      target: 30,
      current: 18,
      unit: 'hours',
      weekStart,
      weekEnd,
      userId: user.id,
    },
    {
      title: 'Chiffre d\'affaires hebdomadaire',
      target: 2500,
      current: 0,
      unit: 'revenue',
      weekStart,
      weekEnd,
      userId: user.id,
    },
  ]

  for (const goal of goals) {
    await prisma.weeklyGoal.create({ data: goal })
  }

  // ============================================================
  // 14. CHAT MESSAGES (4 - 2 user, 2 assistant)
  // ============================================================
  const chatMessages = [
    {
      role: 'user',
      content: 'Bonjour Burozen AI, que dois-je faire aujourd\'hui ?',
      userId: user.id,
    },
    {
      role: 'assistant',
      content: 'Bonjour Alex ! Voici vos priorités pour aujourd\'hui :\n\n🔴 **Urgent** : Corriger le bug de paiement Stripe (BioVert)\n🟡 **Important** : Finaliser la page catalogue produits\n🟡 **À faire** : Réviser le devis FinTrack Phase 2\n\nVous avez aussi 5 emails non lus dont 3 de clients. Bonne journée !',
      userId: user.id,
    },
    {
      role: 'user',
      content: 'Peux-tu m\'aider à rédiger une relance pour la facture de StudioKrea ?',
      userId: user.id,
    },
    {
      role: 'assistant',
      content: 'Bien sûr ! Voici une proposition de relance :\n\n---\nBonjour Sophie,\n\nJe me permets de vous relancer concernant la facture F-2026-003 d\'un montant de 1 308,00 € TTC, dont l\'échéance était le ' + daysFromNow(-10).toLocaleDateString('fr-FR') + '.\n\nN\'hésitez pas à me contacter si vous avez des questions.\n\nCordialement,\nAlex Martin\n---\n\nVoulez-vous que je l\'envoie directement ou préférez-vous la modifier ?',
      userId: user.id,
    },
  ]

  for (const msg of chatMessages) {
    await prisma.chatMessage.create({ data: msg })
  }

  console.log('✅ Données de démonstration créées avec succès !')
  console.log('')
  console.log('🔑 COMPTES DE TEST :')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Superadmin : superadmin@burozen.com / Superadmin2026!')
  console.log('  Admin      : admin@burozen.com / Admin2026!')
  console.log('  Utilisateur: alex@freelance.dev / User2026!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log(`- Utilisateur démo : ${user.name} (${user.email})`)
  console.log(`- Projets : 4`)
  console.log(`- Tâches : 15`)
  console.log(`- Événements : 12`)
  console.log(`- Rappels : 5`)
  console.log(`- Compte email : 1`)
  console.log(`- Emails : 15`)
  console.log(`- Factures : 4`)
  console.log(`- Entrées de temps : 10`)
  console.log(`- Documents : 5`)
  console.log(`- Extraits : 5`)
  console.log(`- Notifications : 8`)
  console.log(`- Objectifs : 3`)
  console.log(`- Messages chat : 4`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
