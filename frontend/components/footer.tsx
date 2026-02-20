"use client"

import Image from "next/image"
import Link from "next/link"
import { MapPin, Phone, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"

export function Footer() {
  const { t } = useTranslation()
  const city = t("common.city.bolzano")
  const phoneDisplay = " +39 392 810 0919"
  const phoneTel = "+393928100919"
  const mapsHref = "https://maps.app.goo.gl/m9vFp5QStRofnNaJ9"
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 items-start">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.webp"
                alt="15 Palle"
                width={40}
                height={40}
                sizes="40px"
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="text-xl font-bold text-foreground">
                15 <span className="text-primary">Palle</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">{t("footer.contact")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                <Link
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label={t("home.contact.directionsCta")}
                >
                  Via Bruno Buozzi, 12, 39100 {city} BZ
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <a
                  href={`tel:${phoneTel}`}
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label={t("home.contact.callCta")}
                >
                  {phoneDisplay}
                </a>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">
              {t("footer.openingHours")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                <div className="text-muted-foreground">
                  <p>{t("home.contact.hoursMonSat")}</p>
                  <p>{t("home.contact.hoursSun")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links - Simplified */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">
              {t("footer.quickLinks")}
            </h3>
            <div className="space-y-2 text-sm">
              <Link href="/" className="block text-muted-foreground transition-colors hover:text-primary">
                {t("footer.home")}
              </Link>
              <Link href="/login" className="block text-muted-foreground transition-colors hover:text-primary">
                {t("nav.login")}
              </Link>
              <Link href="/privacy-policy" className="block text-muted-foreground transition-colors hover:text-primary">
                {t("footer.privacyPolicy")}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} 15 Palle. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  )
}
