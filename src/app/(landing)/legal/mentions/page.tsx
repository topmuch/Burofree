/**
 * Mentions Légales — Maellis
 *
 * Legal page for Maellis legal notices.
 * Includes proper SEO metadata and BreadcrumbList structured data.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getBreadcrumbLD } from '@/features/landing/utils/json-ld'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://maellis.com'

export const metadata: Metadata = {
  title: 'Mentions Légales',
  description:
    'Mentions légales du site Maellis — informations sur l\'éditeur, l\'hébergeur, la propriété intellectuelle et les conditions d\'utilisation.',
  alternates: {
    canonical: '/legal/mentions',
  },
  openGraph: {
    title: 'Mentions Légales | Maellis',
    description:
      'Mentions légales du site Maellis — informations sur l\'éditeur, l\'hébergeur et la propriété intellectuelle.',
    url: `${SITE_URL}/legal/mentions`,
    type: 'website',
  },
}

export default function MentionsPage() {
  const breadcrumbLD = getBreadcrumbLD([
    { name: 'Accueil', url: '/' },
    { name: 'Légal', url: '/legal' },
    { name: 'Mentions légales', url: '/legal/mentions' },
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
                <li className="text-foreground font-medium">Mentions légales</li>
              </ol>
            </nav>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Mentions Légales
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
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Éditeur du site</h2>
              <div className="p-5 rounded-xl bg-muted/50 border border-border space-y-2">
                <p className="text-foreground font-medium">Maellis</p>
                <p className="text-muted-foreground text-sm">
                  SAS au capital de 10 000 euros
                </p>
                <p className="text-muted-foreground text-sm">
                  Siège social : 123 rue de l&apos;Innovation, 75001 Paris, France
                </p>
                <p className="text-muted-foreground text-sm">
                  Email :{' '}
                  <a
                    href="mailto:contact@maellis.com"
                    className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
                  >
                    contact@maellis.com
                  </a>
                </p>
                <p className="text-muted-foreground text-sm">
                  Téléphone : +33 (0)1 23 45 67 89
                </p>
                <p className="text-muted-foreground text-sm">
                  SIRET : 123 456 789 00012
                </p>
                <p className="text-muted-foreground text-sm">
                  RCS : Paris B 123 456 789
                </p>
                <p className="text-muted-foreground text-sm">
                  Numéro TVA intracommunautaire : FR 12 123456789
                </p>
                <p className="text-muted-foreground text-sm">
                  Directeur de la publication : Jean Dupont
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Hébergeur</h2>
              <div className="p-5 rounded-xl bg-muted/50 border border-border space-y-2">
                <p className="text-foreground font-medium">Vercel Inc.</p>
                <p className="text-muted-foreground text-sm">
                  440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
                </p>
                <p className="text-muted-foreground text-sm">
                  Site web :{' '}
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
                  >
                    vercel.com
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Délégué à la Protection des Données (DPO)</h2>
              <p className="text-muted-foreground leading-relaxed">
                Conformément au RGPD, Maellis a désigné un Délégué à la Protection des Données.
                Pour toute question relative au traitement de vos données personnelles, vous pouvez
                le contacter à l&apos;adresse :{' '}
                <a
                  href="mailto:dpo@maellis.com"
                  className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
                >
                  dpo@maellis.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Propriété intellectuelle</h2>
              <p className="text-muted-foreground leading-relaxed">
                L&apos;ensemble du contenu du site maellis.com (textes, images, graphismes, logo,
                icônes, sons, logiciels, etc.) est la propriété exclusive de Maellis ou de ses
                partenaires et est protégé par les lois françaises et internationales relatives à
                la propriété intellectuelle. Toute reproduction, représentation, modification,
                publication, adaptation de tout ou partie des éléments du site, quel que soit le
                moyen ou le procédé utilisé, est interdite sans l&apos;autorisation écrite préalable
                de Maellis.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Limitation de responsabilité</h2>
              <p className="text-muted-foreground leading-relaxed">
                Maellis s&apos;efforce de fournir des informations aussi précises que possible sur le
                site. Toutefois, l&apos;Éditeur ne pourra être tenu responsable des omissions, des
                inexactitudes et des carences dans la mise à jour, qu&apos;elles soient de son fait
                ou du fait des tiers partenaires qui lui fournissent ces informations. L&apos;Éditeur
                décline toute responsabilité pour les dommages directs ou indirects résultant de
                l&apos;accès au site ou de l&apos;utilisation des informations qui y sont publiées.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Liens hypertextes</h2>
              <p className="text-muted-foreground leading-relaxed">
                Le site maellis.com peut contenir des liens hypertextes vers d&apos;autres sites
                internet. Maellis n&apos;exerce aucun contrôle sur le contenu de ces sites et
                décline toute responsabilité quant à leur contenu ou aux éventuels dommages
                résultant de leur consultation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Le site maellis.com est susceptible d&apos;utiliser des cookies pour améliorer
                l&apos;expérience de l&apos;Utilisateur. L&apos;Utilisateur peut refuser les cookies
                en modifiant les paramètres de son navigateur, ce qui peut toutefois affecter
                certaines fonctionnalités du site. Pour plus d&apos;informations, consultez notre{' '}
                <Link href="/legal/privacy" className="text-emerald-500 hover:text-emerald-600 underline">
                  Politique de confidentialité
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Droit applicable</h2>
              <p className="text-muted-foreground leading-relaxed">
                Les présentes mentions légales sont régies par le droit français. En cas de
                litige et après tentative de recherche d&apos;une solution amiable, compétence est
                attribuée aux tribunaux français compétents.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Médiation des litiges</h2>
              <p className="text-muted-foreground leading-relaxed">
                Conformément aux articles L.612-1 et suivants du Code de la consommation, un
                consommateur peut recourir gratuitement à un médiateur de la consommation en vue
                de la résolution amiable du litige qui l&apos;oppose à un professionnel. Pour plus
                d&apos;informations, consultez le site{' '}
                <a
                  href="https://www.economie.gouv.fr/mediation-conso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
                >
                  économie.gouv.fr/mediation-conso
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Crédits</h2>
              <p className="text-muted-foreground leading-relaxed">
                Conception et développement : Maellis
                <br />
                Design et identité visuelle : Maellis
                <br />
                Icônes :{' '}
                <a
                  href="https://lucide.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-500 hover:text-emerald-600 underline transition-colors"
                >
                  Lucide Icons
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
              href="/legal/cgv"
              className="text-sm text-emerald-500 hover:text-emerald-600 transition-colors"
            >
              Conditions Générales de Vente →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
