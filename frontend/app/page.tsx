"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { BilliardBall } from "@/components/billiard-ball"
import { Button } from "@/components/ui/button"
import { ImageLightbox } from "@/components/image-lightbox"
import { Marquee } from "@/components/ui/marquee"
import { Clock, ChevronDown, ArrowRight, MapPin, Navigation2, Phone, Trophy } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useRef } from "react"
import { useTranslation } from "react-i18next"

type LightboxImage = { src: string; alt: string }

export default function HomePage() {
  const { t } = useTranslation()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null)
  const [barInView, setBarInView] = useState(false)
  const barSectionRef = useRef<HTMLElement>(null)

  const openLightbox = (src: string, alt: string) => setLightbox({ src, alt })
  const closeLightbox = () => setLightbox(null)

  const images = [
    { src: "/table-upscale.webp", alt: "Professional billiard table" },
    { src: "/aura.webp", alt: "Billiard game action" },
    { src: "/aura2-expanded.webp", alt: "Players enjoying" },
    { src: "/another-one.webp", alt: "Lounge area" },
  ]
  const activeHeroImage = images[currentImageIndex]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [images.length])

  useEffect(() => {
    const el = barSectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setBarInView(true),
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
  }

  const scrollToDirections = () => {
    document.getElementById("directions")?.scrollIntoView({ behavior: "smooth" })
  }

  const city = t("common.city.bolzano")
  const phoneDisplay = "+39 392 810 0919"
  const phoneTel = "+393928100919"
  const mapsQuery = "Circolo sportivo 15 Palle, Via Bruno Buozzi, 12, 39100 Bolzano BZ"
  const mapsHref = "https://maps.app.goo.gl/m9vFp5QStRofnNaJ9"
  const mapsEmbedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`
  const addressLine = `Via Bruno Buozzi, 12, 39100 ${city} BZ`

  // Avoid hydration mismatch (React #418): server and client can have different Date/timezone.
  // Use a stable default for first paint, then set the real value after mount.
  const [openUntilLabel, setOpenUntilLabel] = useState(() =>
    t("home.badges.openUntilWeekday")
  )
  useEffect(() => {
    const isSunday = new Date().getDay() === 0
    setOpenUntilLabel(t(isSunday ? "home.badges.openUntilSunday" : "home.badges.openUntilWeekday"))
  }, [t])

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans selection:bg-primary/30">
      <Navigation />

      <main className="flex-1">
        {/* =========================================
            HERO SECTION
           ========================================= */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <button
            type="button"
            className="absolute inset-0 z-[5] cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset"
            onClick={() => openLightbox(activeHeroImage.src, activeHeroImage.alt)}
            aria-label={t("home.lightboxOpen", "View image full size")}
          >
            <span className="sr-only">{t("home.lightboxOpen", "View image full size")}</span>
          </button>
          <div className="absolute inset-0">
            <Image
              key={activeHeroImage.src}
              src={activeHeroImage.src}
              alt={activeHeroImage.alt}
              fill
              sizes="100vw"
              quality={70}
              priority={currentImageIndex === 0}
              className="object-cover transition-opacity duration-700 pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/40 to-background z-10" />
          </div>

          <div className="relative z-20 container mx-auto px-4 pt-20 text-center">
            <div className="max-w-5xl mx-auto">
              <div className="mb-8 flex justify-center">
                <button
                  type="button"
                  className="relative cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-transparent rounded-full"
                  onClick={() => openLightbox("/logo.webp", "15palle - Circolo sportivo 15 Palle")}
                  aria-label={t("home.lightboxOpen", "View image full size")}
                >
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                  <Image
                    src="/logo.webp"
                    alt="15palle - Circolo sportivo 15 Palle"
                    width={200}
                    height={200}
                    sizes="(min-width: 768px) 160px, 128px"
                    className="relative h-32 w-32 md:h-40 md:w-40 rounded-full object-cover border-2 border-white/10 shadow-2xl"
                  />
                </button>
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-none tracking-tight drop-shadow-lg">
                <span className="text-white">{t("home.headline.line1")}</span>
                <br />
                <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                  {t("home.headline.line2")}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                {t("home.heroDescription.line1")}
                <br className="hidden md:block" />
                {t("home.heroDescription.line2", { city })}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white text-lg px-10 py-7 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all hover:scale-105"
                >
                  <Link href="/login" className="gap-2 font-bold">
                    {t("home.ctaMemberLogin")}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-sm mb-24">
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full hover:bg-white/10 transition-colors cursor-default">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-gray-200 font-medium">{openUntilLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={scrollToDirections}
                  className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-gray-200 font-medium">{city}</span>
                </button>
                <a
                  href={`tel:${phoneTel}`}
                  className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-gray-200 font-medium">{phoneDisplay}</span>
                </a>
              </div>
            </div>

            {/* Carousel Dots */}
            <div className="justify-center flex gap-2 z-30">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentImageIndex ? "bg-white w-8" : "bg-white/40 w-2 hover:bg-white/60"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={scrollToFeatures}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-gray-400 hover:text-white transition-colors p-2 z-30"
              aria-label="Scroll down"
            >
              <ChevronDown className="h-8 w-8" />
            </button>
          </div>
        </section>

        {lightbox && (
          <ImageLightbox
            open={!!lightbox}
            onClose={closeLightbox}
            src={lightbox.src}
            alt={lightbox.alt}
          />
        )}

        {/* =========================================
            WHY CHOOSE 15 PALLE
           ========================================= */}
        <section id="features" className="py-32 relative bg-[#0a0a0a]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#0a0a0a] to-[#050505]" />
          
          <div className="container mx-auto px-4 relative z-10">
            {/* Header */}
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                {t("home.whyChoose")}
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed font-light">
                {t("home.whyChooseSubtitle")}
              </p>
            </div>

            {/* Main Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              
              {/* Card 1: Equipment */}
              <div className="group relative rounded-2xl bg-[#111] p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10 border border-white/5 hover:border-[#f5d742]/30">
                 <div className="mb-6 w-full flex justify-between items-start">
                    <div className="rounded-xl bg-[#f5d742]/10 p-3 text-[#f5d742]">
                       <Trophy className="h-6 w-6" />
                    </div>
                    <div className="transform group-hover:rotate-12 transition-transform duration-500 opacity-80">
                      <BilliardBall number={1} size="sm" title="" />
                    </div>
                 </div>
                 <h3 className="text-xl font-bold text-white mb-3">{t("home.features.professionalTablesTitle")}</h3>
                 <p className="text-gray-400 leading-relaxed text-sm">
                   {t("home.features.professionalTablesText")}
                 </p>
              </div>

              {/* Card 2: Community */}
              <div className="group relative rounded-2xl bg-[#111] p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-900/10 border border-white/5 hover:border-white/20">
                 <div className="mb-6 w-full flex justify-between items-start">
                    <div className="rounded-xl bg-white/10 p-3 text-white">
                       <MapPin className="h-6 w-6" />
                    </div>
                    <div className="transform group-hover:rotate-12 transition-transform duration-500 opacity-80">
                      <BilliardBall number={8} size="sm" title="" />
                    </div>
                 </div>
                 <h3 className="text-xl font-bold text-white mb-3">{t("home.features.friendlyCommunityTitle")}</h3>
                 <p className="text-gray-400 leading-relaxed text-sm">
                    {t("home.features.locationPrefix", { city })} {t("home.features.friendlyCommunityText")}
                 </p>
              </div>

              {/* Card 3: Hours */}
              <div className="group relative rounded-2xl bg-[#111] p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-900/10 border border-white/5 hover:border-[#e84040]/30">
                 <div className="mb-6 w-full flex justify-between items-start">
                    <div className="rounded-xl bg-[#e84040]/10 p-3 text-[#e84040]">
                       <Clock className="h-6 w-6" />
                    </div>
                    <div className="transform group-hover:rotate-12 transition-transform duration-500 opacity-80">
                      <BilliardBall number={3} size="sm" title="" />
                    </div>
                 </div>
                 <h3 className="text-xl font-bold text-white mb-3">{t("home.features.extendedHoursTitle")}</h3>
                 <p className="text-gray-400 leading-relaxed text-sm">
                   {t("home.features.extendedHoursText")} {t("home.features.extendedHoursSuffix")}
                 </p>
              </div>

            </div>
          </div>
        </section>

        {/* =========================================
            THE EXPERIENCE — Bento box gallery
           ========================================= */}
        <section id="gallery" className="py-20 md:py-32 bg-[#050505] relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight">
                {t("home.galleryTitle")}
              </h2>
              <p className="mt-3 text-white/50 text-base font-light max-w-2xl">
                {t("home.gallerySubtitle", { city })}
              </p>
            </div>

            {/* Bento grid — 4 cols on desktop, 2 on tablet, 1 on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-fr">
              {/* Hero — large 2x2 */}
              <button
                type="button"
                className="group relative col-span-1 sm:col-span-2 row-span-2 rounded-2xl overflow-hidden bg-[#0a0a0a] text-left cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset min-h-[280px] md:min-h-[320px]"
                onClick={() => openLightbox("/hero-focus.webp", t("home.galleryLabels.gameTime"))}
                aria-label={t("home.lightboxOpen", "View image full size")}
              >
                <Image
                  src="/hero-focus.webp"
                  alt={t("home.galleryLabels.gameTime")}
                  fill
                  loading="eager"
                  sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
                  quality={75}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 z-10">
                  <p className="text-white/70 text-xs uppercase tracking-widest">{t("home.galleryLabels.focus")}</p>
                  <h3 className="text-white text-xl md:text-2xl font-semibold mt-1">{t("home.galleryLabels.gameTime")}</h3>
                </div>
              </button>

              {/* Lounge — wide */}
              <button
                type="button"
                className="group relative col-span-1 sm:col-span-2 rounded-2xl overflow-hidden bg-[#0a0a0a] text-left cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset min-h-[180px] md:min-h-[200px]"
                onClick={() => openLightbox("/lounge.webp", t("home.galleryLabels.lounge"))}
                aria-label={t("home.lightboxOpen", "View image full size")}
              >
                <Image
                  src="/lounge.webp"
                  alt={t("home.galleryLabels.lounge")}
                  fill
                  loading="lazy"
                  sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
                  quality={72}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 z-10">
                  <h3 className="text-white text-lg font-semibold">{t("home.galleryLabels.lounge")}</h3>
                </div>
              </button>

              {/* Mano — wide */}
              <button
                type="button"
                className="group relative col-span-1 sm:col-span-2 rounded-2xl overflow-hidden bg-[#0a0a0a] text-left cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset min-h-[180px] md:min-h-[200px]"
                onClick={() => openLightbox("/mano.webp", t("home.galleryLabels.premiumGear"))}
                aria-label={t("home.lightboxOpen", "View image full size")}
              >
                <Image
                  src="/mano.webp"
                  alt={t("home.galleryLabels.premiumGear")}
                  fill
                  loading="lazy"
                  sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
                  quality={75}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 z-10">
                  <h3 className="text-white text-lg font-semibold">{t("home.galleryLabels.premiumGear")}</h3>
                </div>
              </button>

            </div>
          </div>
        </section>

        {/* =========================================
            THE BAR — seamless infinite marquee
            Same container & alignment as L'esperienza
           ========================================= */}
        <section
          id="bar"
          ref={barSectionRef}
          className="relative pt-8 md:pt-12 pb-20 md:pb-32 w-full overflow-hidden bg-[#050505]"
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-8 md:mb-10">
              <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight">
                {t("home.galleryLabels.bar")}
              </h2>
              <p className="mt-3 text-white/50 text-base font-light max-w-2xl">
                {t("home.barSubtitle")}
              </p>
            </div>
            <div className="h-[220px] md:h-[300px] -mx-4 md:-mx-6">
              <Marquee duration={25} gap="0.75rem" className="h-full pl-4 md:pl-6">
              {["/newbar1.webp", "/newbar2.webp", "/newbar3.webp", "/newbar4.webp", "/newbar5.webp"].map((src, i) => (
                <button
                  key={i}
                  type="button"
                  className="relative h-full w-[360px] md:w-[480px] flex-shrink-0 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#0a0a0a] cursor-zoom-in transition-colors"
                  onClick={() => openLightbox(src, t("home.galleryLabels.bar"))}
                  aria-label={t("home.lightboxOpen", "View image full size")}
                >
                  <Image
                    src={src}
                    alt={t("home.galleryLabels.bar")}
                    fill
                    loading={i < 2 ? "eager" : "lazy"}
                    sizes="480px"
                    quality={75}
                    className="object-cover object-center hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </Marquee>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="directions" className="py-24 relative overflow-hidden bg-background">
          <div className="absolute inset-0 [background:radial-gradient(900px_circle_at_10%_20%,rgba(47,105,159,0.08),transparent_60%),radial-gradient(900px_circle_at_90%_80%,rgba(245,215,66,0.05),transparent_60%)]" />
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto relative">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
                <div className="rounded-[32px] border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl p-8 md:p-12 shadow-2xl">
                  <h2 className="mt-4 text-3xl md:text-5xl font-black text-white tracking-tight">
                    {t("home.contact.title")}
                  </h2>
                  <p className="mt-4 text-gray-400 leading-relaxed text-lg">
                    {t("home.contact.subtitle", { city })}
                  </p>

                  <div className="mt-10 grid gap-6">
                    <div className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-start gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-lg">{t("home.contact.addressLabel")}</p>
                          <p className="text-gray-400 mt-1">{addressLine}</p>
                        </div>
                      </div>
                    </div>

                    <div className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-start gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-blue-400/10 ring-1 ring-blue-400/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Phone className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-lg">{t("home.contact.phoneLabel")}</p>
                          <a className="text-gray-400 mt-1 hover:text-white transition-colors" href="tel:+393928100919">
                            +39 392 810 0919
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-start gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 ring-1 ring-yellow-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Clock className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-lg">{t("home.contact.hoursLabel")}</p>
                          <p className="text-gray-400 mt-1">{t("home.contact.hoursMonSat")}</p>
                          <p className="text-gray-400">{t("home.contact.hoursSun")}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    <Button asChild size="lg" className="rounded-full h-14 px-8 text-base bg-white text-black hover:bg-gray-200">
                      <Link
                        href={mapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="gap-2"
                      >
                        {t("home.contact.directionsCta")}
                        <Navigation2 className="h-5 w-5" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full h-14 px-8 text-base border-white/20 hover:bg-white/10 hover:text-white">
                      <a href={`tel:${phoneTel}`} className="gap-2">
                        {t("home.contact.callCta")}
                        <Phone className="h-5 w-5" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="relative rounded-[32px] border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl h-[500px] lg:h-auto">
                  <div className="absolute inset-0 filter grayscale hover:grayscale-0 transition-all duration-700">
                    <iframe
                      title="15 Palle location"
                      className="h-full w-full opacity-80"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={mapsEmbedSrc}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}