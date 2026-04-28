import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, getRateLimitIdentifier, DEFAULT_API_OPTIONS } from '@/lib/rate-limit'

/**
 * POST /api/marketplace/seed — Seed marketplace modules
 */
export async function POST(req: NextRequest) {
  try {
    // Auth
    const { user, response } = await requireAuth(req)
    if (!user) return response!

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req, user.id)
    const rateLimit = checkRateLimit(rateLimitId, DEFAULT_API_OPTIONS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429 }
      )
    }

    const modules = [
      {
        slug: 'focus-mode',
        name: 'Mode Focus',
        description: 'Bloquez les distractions et concentrez-vous sur l\'essentiel avec le mode Pomodoro intégré et les sons ambiants.',
        icon: 'Eye',
        category: 'productivity',
        price: 0,
        features: JSON.stringify([
          'Mode Pomodoro (25/5 min)',
          'Mode Deep Work personnalisable',
          'Sons ambiants (pluie, forêt, café)',
          'Statistiques de concentration',
          'Rappels de pause automatiques',
        ]),
        isActive: true,
        sortOrder: 1,
      },
      {
        slug: 'client-portal',
        name: 'Portail Client',
        description: 'Offrez à vos clients un accès sécurisé en lecture seule pour suivre l\'avancement de leurs projets.',
        icon: 'Globe',
        category: 'collaboration',
        price: 9.90,
        features: JSON.stringify([
          'Vue projet en lecture seule',
          'Timeline des jalons',
          'Approbation et commentaires',
          'Liens sécurisés avec expiration',
          'Notifications automatiques',
        ]),
        isActive: true,
        sortOrder: 2,
      },
      {
        slug: 'slack-integration',
        name: 'Intégration Slack',
        description: 'Recevez vos notifications Maellis directement dans Slack et interagissez avec vos tâches sans changer d\'outil.',
        icon: 'MessageSquare',
        category: 'integration',
        price: 4.90,
        features: JSON.stringify([
          'Notifications en temps réel',
          'Commandes slash Slack',
          'Canaux dédiés par projet',
          'Partage de fichiers bidirectionnel',
        ]),
        isActive: true,
        sortOrder: 3,
      },
      {
        slug: 'zoom-integration',
        name: 'Intégration Zoom',
        description: 'Créez et rejoignez des réunions Zoom directement depuis Maellis. Synchronisation automatique du calendrier.',
        icon: 'Video',
        category: 'integration',
        price: 4.90,
        features: JSON.stringify([
          'Création rapide de réunions',
          'Liens Zoom dans les événements',
          'Enregistrements automatiques',
          'Synchronisation calendrier',
        ]),
        isActive: true,
        sortOrder: 4,
      },
      {
        slug: 'google-drive-integration',
        name: 'Google Drive',
        description: 'Accédez à vos fichiers Google Drive et partagez-les directement avec vos clients et projets.',
        icon: 'HardDrive',
        category: 'integration',
        price: 4.90,
        features: JSON.stringify([
          'Navigation dans vos dossiers',
          'Partage direct dans les projets',
          'Synchronisation bidirectionnelle',
          'Prévisualisation de documents',
        ]),
        isActive: true,
        sortOrder: 5,
      },
      {
        slug: 'github-integration',
        name: 'GitHub',
        description: 'Liez vos dépôts GitHub à vos projets pour un suivi automatique des commits, PR et issues.',
        icon: 'Github',
        category: 'integration',
        price: 4.90,
        features: JSON.stringify([
          'Suivi des commits par projet',
          'Notifications Pull Request',
          'Lien issues ↔ tâches',
          'Badges de statut CI/CD',
        ]),
        isActive: true,
        sortOrder: 6,
      },
      {
        slug: 'notion-integration',
        name: 'Notion',
        description: 'Synchronisez vos pages Notion avec Maellis pour une documentation de projet unifiée.',
        icon: 'BookOpen',
        category: 'integration',
        price: 4.90,
        features: JSON.stringify([
          'Import de pages Notion',
          'Synchronisation bidirectionnelle',
          'Templates Notion intégrés',
          'Recherche cross-plateforme',
        ]),
        isActive: true,
        sortOrder: 7,
      },
      {
        slug: 'voice-commands',
        name: 'Commandes Vocales',
        description: 'Contrôlez Maellis à la voix : créez des tâches, lancez le mode focus, et plus encore.',
        icon: 'Mic',
        category: 'productivity',
        price: 0,
        features: JSON.stringify([
          'Création de tâches vocale',
          'Navigation par la voix',
          'Reconnaissance en français',
          'Historique des commandes',
        ]),
        isActive: true,
        sortOrder: 8,
      },
      {
        slug: 'marketplace',
        name: 'Marketplace',
        description: 'Découvrez et activez de nouvelles extensions pour personnaliser votre expérience Maellis.',
        icon: 'Store',
        category: 'productivity',
        price: 0,
        features: JSON.stringify([
          'Catalogue d\'extensions',
          'Essais gratuits 7 jours',
          'Activation en un clic',
          'Gestion des abonnements',
        ]),
        isActive: true,
        sortOrder: 0,
      },
    ]

    // Upsert modules
    let created = 0
    let updated = 0

    for (const mod of modules) {
      const existing = await db.module.findUnique({ where: { slug: mod.slug } })
      if (existing) {
        await db.module.update({
          where: { slug: mod.slug },
          data: mod,
        })
        updated++
      } else {
        await db.module.create({ data: mod })
        created++
      }
    }

    return NextResponse.json({
      message: 'Modules marketplace initialisés',
      created,
      updated,
      total: modules.length,
    })
  } catch (error) {
    console.error('Marketplace seed POST error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'initialisation des modules' },
      { status: 500 }
    )
  }
}
