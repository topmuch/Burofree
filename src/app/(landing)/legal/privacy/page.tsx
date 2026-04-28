/**
 * Politique de Confidentialité — Burozen
 *
 * Legal page for Burozen privacy policy.
 * Includes proper SEO metadata and BreadcrumbList structured data.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getBreadcrumbLD } from '@/features/landing/utils/json-ld'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://burozen.com'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité',
  description:
    'Politique de confidentialité de Burozen — découvrez comment nous collectons, utilisons et protégeons vos données personnelles conformément au RGPD.',
  alternates: {
    canonical: '/legal/privacy',
  },
  openGraph: {
    title: 'Politique de Confidentialité | Burozen',
    description:
      'Politique de confidentialité de Burozen — collecte, utilisation et protection de vos données personnelles.',
    url: `${SITE_URL}/legal/privacy`,
    type: 'website',
  },
}

export default function PrivacyPage() {
  const breadcrumbLD = getBreadcrumbLD([
    { name: 'Accueil', url: '/' },
    { name: 'Légal', url: '/legal' },
    { name: 'Confidentialité', url: '/legal/privacy' },
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
                <li className="text-foreground font-medium">Confidentialité</li>
              </ol>
            </nav>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Politique de Confidentialité
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
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Burozen s&apos;engage à protéger la vie privée de ses Utilisateurs. La présente
                Politique de Confidentialité décrit les types de données personnelles que nous
                collectons, les finalités de cette collecte, les modalités de traitement et les
                droits dont vous disposez. Ce document est conforme au Règlement Général sur la
                Protection des Données (RGPD – Règlement UE 2016/679).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Responsable du traitement</h2>
              <p className="text-muted-foreground leading-relaxed">
                Le responsable du traitement des données personnelles est Burozen, dont le siège
                social est situé en France. Pour toute question relative au traitement de vos
                données, vous pouvez contacter notre Délégué à la Protection des Données (DPO) à
                l&apos;adresse :{' '}
                <a
                  href="mailto:dpo@burozen.com"
                  className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
                >
                  dpo@burozen.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Données collectées</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Nous collectons les données suivantes :
              </p>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <h3 className="font-medium text-foreground text-sm">Données d&apos;identification</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Nom, prénom, adresse email, numéro de téléphone (optionnel), photo de profil
                    (optionnel).
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <h3 className="font-medium text-foreground text-sm">Données professionnelles</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Nom d&apos;entreprise, SIRET, adresse professionnelle, informations de facturation.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <h3 className="font-medium text-foreground text-sm">Données d&apos;utilisation</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Historique des tâches, événements de calendrier, emails synchronisés, factures,
                    suivi du temps, interactions avec l&apos;assistant IA.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <h3 className="font-medium text-foreground text-sm">Données techniques</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Adresse IP, type de navigateur, système d&apos;exploitation, logs de connexion,
                    cookies et technologies similaires.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Finalités du traitement</h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                Vos données personnelles sont traitées pour les finalités suivantes :
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Fourniture et amélioration des services Burozen</li>
                <li>Personnalisation de l&apos;expérience utilisateur</li>
                <li>Fonctionnement de l&apos;assistant IA (suggestions, automatisation)</li>
                <li>Facturation et gestion des abonnements</li>
                <li>Communications relatives au service (notifications, mises à jour)</li>
                <li>Marketing direct (avec votre consentement préalable)</li>
                <li>Conformité aux obligations légales</li>
                <li>Sécurité et prévention de la fraude</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Base légale</h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                Le traitement de vos données repose sur les bases légales suivantes :
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>
                  <strong className="text-foreground">Exécution du contrat :</strong> données
                  nécessaires à la fourniture du service
                </li>
                <li>
                  <strong className="text-foreground">Consentement :</strong> données collectées
                  avec votre accord explicite (cookies marketing, newsletter)
                </li>
                <li>
                  <strong className="text-foreground">Intérêt légitime :</strong> amélioration du
                  service, sécurité, analyses statistiques anonymisées
                </li>
                <li>
                  <strong className="text-foreground">Obligation légale :</strong> conservation des
                  données de facturation, conformité fiscale
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Durée de conservation</h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                Les données sont conservées pour la durée nécessaire aux finalités pour lesquelles
                elles ont été collectées :
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Données de compte : durée de l&apos;abonnement + 3 ans</li>
                <li>Données de facturation : 10 ans (obligation légale)</li>
                <li>Données d&apos;utilisation : durée de l&apos;abonnement + 1 an</li>
                <li>Logs de connexion : 1 an</li>
                <li>Cookies : 13 mois maximum à compter du dépôt</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Sécurité des données</h2>
              <p className="text-muted-foreground leading-relaxed">
                Burozen met en œuvre des mesures techniques et organisationnelles appropriées pour
                protéger vos données : chiffrement AES-256 au repos, TLS 1.3 en transit, accès
                restreint sur le principe du moindre privilège, audits de sécurité réguliers,
                hébergement en Europe (data centers certifiés ISO 27001). En cas de violation de
                données susceptible d&apos;affecter vos droits, nous vous informerons dans les 72
                heures conformément à l&apos;article 33 du RGPD.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Partage des données</h2>
              <p className="text-muted-foreground leading-relaxed">
                Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec :
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>Nos sous-traitants techniques (hébergement, paiement) liés par contrat</li>
                <li>Les autorités compétentes sur requête légale</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Vos droits</h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {[
                  'Droit d\'accès',
                  'Droit de rectification',
                  'Droit à l\'effacement',
                  'Droit à la limitation',
                  'Droit à la portabilité',
                  'Droit d\'opposition',
                ].map((right) => (
                  <div
                    key={right}
                    className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
                  >
                    <svg
                      className="h-4 w-4 text-emerald-500 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span className="text-sm text-foreground">{right}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Pour exercer vos droits, contactez-nous à{' '}
                <a
                  href="mailto:dpo@burozen.com"
                  className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
                >
                  dpo@burozen.com
                </a>
                . Vous pouvez également introduire une réclamation auprès de la CNIL{' '}
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
                >
                  (www.cnil.fr)
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Burozen utilise des cookies pour assurer le fonctionnement du service, mesurer
                l&apos;audience et, avec votre consentement, proposer des contenus publicitaires
                personnalisés. Vous pouvez gérer vos préférences de cookies à tout moment via la
                bannière de consentement ou vos paramètres de navigateur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Transferts hors UE</h2>
              <p className="text-muted-foreground leading-relaxed">
                L&apos;ensemble de nos données sont hébergées et traitées au sein de l&apos;Union
                européenne. Dans l&apos;éventualité d&apos;un transfert hors UE, celui-ci serait
                encadré par des clauses contractuelles types approuvées par la Commission européenne.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">12. Modifications</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nous nous réservons le droit de modifier la présente politique. Toute modification
                substantielle sera notifiée par email ou via la plateforme au moins 30 jours avant
                son entrée en vigueur.
              </p>
            </section>
          </div>

          {/* Navigation */}
          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/legal/cgv"
              className="text-sm text-emerald-500 hover:text-emerald-600 transition-colors"
            >
              ← Conditions Générales de Vente
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
