/**
 * CGV — Conditions Générales de Vente
 *
 * Legal page for Burozen terms and conditions.
 * Includes proper SEO metadata and BreadcrumbList structured data.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getBreadcrumbLD } from '@/features/landing/utils/json-ld'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://burozen.com'

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente',
  description:
    'Conditions Générales de Vente de Burozen — découvrez les termes et conditions d\'utilisation de nos services d\'assistant intelligent pour freelances.',
  alternates: {
    canonical: '/legal/cgv',
  },
  openGraph: {
    title: 'Conditions Générales de Vente | Burozen',
    description:
      'Conditions Générales de Vente de Burozen — termes et conditions d\'utilisation de nos services.',
    url: `${SITE_URL}/legal/cgv`,
    type: 'website',
  },
}

export default function CGVPage() {
  const breadcrumbLD = getBreadcrumbLD([
    { name: 'Accueil', url: '/' },
    { name: 'Légal', url: '/legal' },
    { name: 'CGV', url: '/legal/cgv' },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLD) }}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Breadcrumb */}
            <nav aria-label="Fil d'Ariane" className="mb-4">
              <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-foreground transition-colors">
                    Accueil
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/legal/mentions" className="hover:text-foreground transition-colors">
                    Légal
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-foreground font-medium">CGV</li>
              </ol>
            </nav>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Conditions Générales de Vente
            </h1>
            <p className="mt-2 text-muted-foreground">
              Dernière mise à jour : 1er janvier 2025
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Objet</h2>
              <p className="text-muted-foreground leading-relaxed">
                Les présentes Conditions Générales de Vente (ci-après &quot;CGV&quot;) régissent les
                relations contractuelles entre Burozen (ci-après &quot;l&apos;Éditeur&quot;) et toute
                personne physique ou morale utilisant les services de la plateforme Burozen
                (ci-après &quot;l&apos;Utilisateur&quot; ou &quot;le Client&quot;). L&apos;utilisation de la
                plateforme implique l&apos;acceptation pleine et entière des présentes CGV.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Description des services</h2>
              <p className="text-muted-foreground leading-relaxed">
                Burozen est une plateforme SaaS d&apos;assistance intelligente destinée aux travailleurs
                indépendants et freelances. Les services incluent notamment :
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>Gestion des tâches et projets</li>
                <li>Synchronisation de calendrier</li>
                <li>Gestion et tri intelligent des emails</li>
                <li>Création et suivi de factures</li>
                <li>Suivi du temps et mode Focus</li>
                <li>Assistant IA pour la productivité</li>
                <li>Portail client partagé</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Offres et tarification</h2>
              <p className="text-muted-foreground leading-relaxed">
                Burozen propose différentes offres d&apos;abonnement, dont les caractéristiques et
                tarifs sont détaillés sur la page{' '}
                <Link href="/#pricing" className="text-emerald-500 hover:text-emerald-600 underline">
                  Tarifs
                </Link>{' '}
                du site. Les prix sont indiqués en euros hors taxes. L&apos;Éditeur se réserve le
                droit de modifier ses tarifs à tout moment, avec un préavis de 30 jours.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Inscription et compte</h2>
              <p className="text-muted-foreground leading-relaxed">
                L&apos;inscription à Burozen est ouverte à toute personne majeure disposant d&apos;une
                adresse email valide. L&apos;Utilisateur s&apos;engage à fournir des informations
                exactes et à les maintenir à jour. Le compte est personnel et non transmissible.
                L&apos;Utilisateur est responsable de la confidentialité de ses identifiants.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Paiement</h2>
              <p className="text-muted-foreground leading-relaxed">
                Les abonnements sont payables d&apos;avance par carte bancaire via notre prestataire
                de paiement sécurisé (Stripe). Le prélèvement est effectué automatiquement en début
                de période de facturation. En cas d&apos;échec de paiement, l&apos;Éditeur se réserve
                le droit de suspendre l&apos;accès aux services payants après une relance de 7 jours.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Rétractation et remboursement</h2>
              <p className="text-muted-foreground leading-relaxed">
                Conformément à l&apos;article L221-18 du Code de la consommation, l&apos;Utilisateur
                dispose d&apos;un délai de 14 jours à compter de la souscription pour exercer son
                droit de rétractation, sans avoir à justifier de motif. Au-delà de ce délai, les
                remboursements sont effectués au prorata de la période restante sur demande écrite
                adressée à support@burozen.com.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Résiliation</h2>
              <p className="text-muted-foreground leading-relaxed">
                L&apos;Utilisateur peut résilier son abonnement à tout moment depuis ses paramètres
                de compte ou par email à support@burozen.com. La résiliation prend effet en fin de
                période de facturation en cours. Aucun frais de résiliation n&apos;est appliqué.
                L&apos;Éditeur se réserve le droit de résilier l&apos;accès en cas de non-respect
                des présentes CGV.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Propriété intellectuelle</h2>
              <p className="text-muted-foreground leading-relaxed">
                L&apos;ensemble des éléments constitutifs de la plateforme (textes, images, logos,
                design, logiciels, bases de données) sont la propriété exclusive de l&apos;Éditeur
                ou de ses partenaires et sont protégés par les lois relatives à la propriété
                intellectuelle. Toute reproduction, représentation ou diffusion, même partielle,
                est interdite sans autorisation préalable écrite.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Responsabilité</h2>
              <p className="text-muted-foreground leading-relaxed">
                L&apos;Éditeur s&apos;efforce d&apos;assurer la disponibilité de la plateforme 24h/24,
                7j/7, sans garantie de continuité. L&apos;Éditeur ne saurait être tenu responsable
                des interruptions liées à des opérations de maintenance, des cas de force majeure
                ou des défaillances de réseaux tiers. La responsabilité de l&apos;Éditeur est limitée
                au montant des sommes versées par l&apos;Utilisateur au cours des 12 derniers mois.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Données personnelles</h2>
              <p className="text-muted-foreground leading-relaxed">
                Le traitement des données personnelles est régi par notre{' '}
                <Link href="/legal/privacy" className="text-emerald-500 hover:text-emerald-600 underline">
                  Politique de confidentialité
                </Link>{' '}
                et conforme au Règlement Général sur la Protection des Données (RGPD).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Droit applicable et juridiction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Les présentes CGV sont soumises au droit français. En cas de litige, les parties
                s&apos;efforceront de trouver une solution amiable. À défaut, le Tribunal de Commerce
                de Paris sera compétent pour statuer.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">12. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                Pour toute question relative aux présentes CGV, vous pouvez nous contacter à
                l&apos;adresse suivante :{' '}
                <a
                  href="mailto:support@burozen.com"
                  className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
                >
                  support@burozen.com
                </a>
              </p>
            </section>
          </div>

          {/* Navigation */}
          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/legal/privacy"
              className="text-sm text-emerald-500 hover:text-emerald-600 transition-colors"
            >
              ← Politique de confidentialité
            </Link>
            <Link
              href="/legal/mentions"
              className="text-sm text-emerald-500 hover:text-emerald-600 transition-colors"
            >
              Mentions légales →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
