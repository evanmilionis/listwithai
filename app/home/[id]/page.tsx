import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase';
import type { Report, ReportOutput } from '@/types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PropertyInquiryForm from '@/components/PropertyInquiryForm';
import { formatCurrency } from '@/lib/utils';
import { Bed, Bath, Maximize2, MapPin, Calendar, Home as HomeIcon } from 'lucide-react';

// Never statically cache — always fetch fresh photos + subscription state.
// This ensures newly uploaded photos show up immediately and access gating
// reflects live Stripe state.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Fetch just the data needed for the public page (report + photos). */
async function getPublicProperty(
  id: string
): Promise<{ report: Report; photos: { id: string; url: string }[] } | null> {
  const supabase = createServiceClient();

  const { data: report, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !report) return null;

  // Only expose listings that are actively subscribed (trialing or active)
  // and that have completed report generation.
  if (report.status !== 'complete') return null;

  // For homeowner listings, verify the subscription is still live
  if (report.customer_type === 'homeowner') {
    const { data: sub } = await supabase
      .from('homeowner_subscriptions')
      .select('status')
      .eq('report_id', report.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const active = !sub || ['trialing', 'active'].includes(String(sub.status).toLowerCase());
    if (!active) return null;
  }

  // Load photos (may be empty; we fall back to Street View)
  const { data: photos } = await supabase
    .from('property_photos')
    .select('id, url, order_index')
    .eq('report_id', id)
    .order('order_index', { ascending: true });

  return {
    report: report as Report,
    photos: (photos ?? []).map((p) => ({ id: p.id, url: p.url })),
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getPublicProperty(id);

  if (!bundle) {
    return { title: 'Listing not found | ListAI' };
  }

  const { report } = bundle;
  const listing = (report.report_output as ReportOutput | null)?.listing;
  const price = report.asking_price;
  const address = `${report.property_address}, ${report.property_city}, ${report.property_state} ${report.property_zip}`;
  const title = listing?.headline || `${report.beds} bed ${report.baths} bath in ${report.property_city}`;
  const description = listing?.short_description
    || `${report.beds} bed, ${report.baths} bath, ${report.sqft.toLocaleString()} sqft in ${report.property_city}, ${report.property_state}. ${price ? `Listed at ${formatCurrency(price)}.` : ''}`;

  return {
    title: `${title} — ${formatCurrency(price)}`,
    description,
    openGraph: {
      title: `${address} — ${formatCurrency(price)}`,
      description,
      type: 'website',
      url: `https://listwithai.io/home/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${address} — ${formatCurrency(price)}`,
      description,
    },
  };
}

export default async function PublicPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getPublicProperty(id);

  if (!bundle) notFound();

  const { report, photos } = bundle;
  const output = (report.report_output as ReportOutput | null);
  const listing = output?.listing;
  const amenities = output?.amenities;

  const address = `${report.property_address}, ${report.property_city}, ${report.property_state} ${report.property_zip}`;

  // If the owner uploaded photos, use those. Otherwise fall back to Google
  // Street View. Street View requires Street View Static API enabled in
  // Google Cloud for the GOOGLE_PLACES_API_KEY.
  const hasUploadedPhotos = photos.length > 0;
  const heroUrl = hasUploadedPhotos
    ? photos[0].url
    : process.env.GOOGLE_PLACES_API_KEY
      ? `https://maps.googleapis.com/maps/api/streetview?size=1200x600&location=${encodeURIComponent(address)}&fov=80&key=${process.env.GOOGLE_PLACES_API_KEY}`
      : null;
  const galleryPhotos = hasUploadedPhotos ? photos.slice(1) : [];

  // Schema.org JSON-LD for SEO
  const listingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: listing?.headline || address,
    description: listing?.short_description || listing?.full_description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: report.property_address,
      addressLocality: report.property_city,
      addressRegion: report.property_state,
      postalCode: report.property_zip,
    },
    numberOfRooms: report.beds,
    floorSize: { '@type': 'QuantitativeValue', value: report.sqft, unitCode: 'FTK' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
      />
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero: uploaded photo (preferred) or Street View fallback + price overlay */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-200 aspect-[2/1] shadow-sm mb-8">
            {heroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroUrl}
                alt={address}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                <HomeIcon size={48} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                For Sale by Owner
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                {formatCurrency(report.asking_price)}
              </h1>
              <p className="mt-2 text-lg text-white/90 flex items-center gap-2">
                <MapPin size={18} />
                {report.property_address}, {report.property_city}, {report.property_state} {report.property_zip}
              </p>
            </div>
          </div>

          {/* Photo gallery — if more than 1 uploaded */}
          {galleryPhotos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              {galleryPhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt="Property"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            {[
              { icon: Bed, label: 'Beds', value: report.beds },
              { icon: Bath, label: 'Baths', value: report.baths },
              { icon: Maximize2, label: 'Sq Ft', value: report.sqft.toLocaleString() },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 text-center">
                <stat.icon className="mx-auto text-slate-400 mb-2" size={20} />
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-8">

              {/* Listing description */}
              {listing && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
                  {listing.headline && (
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">{listing.headline}</h2>
                  )}
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {listing.full_description}
                  </p>
                </div>
              )}

              {/* Highlights */}
              {listing?.bullet_highlights && listing.bullet_highlights.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Highlights</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {listing.bullet_highlights.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Amenities */}
              {amenities && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Nearby</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {amenities.grocery && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Grocery</p>
                        <p className="text-slate-700 mt-0.5">{amenities.grocery.name} · {amenities.grocery.distance_miles.toFixed(1)} mi</p>
                      </div>
                    )}
                    {amenities.school && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">School</p>
                        <p className="text-slate-700 mt-0.5">{amenities.school.name} · {amenities.school.distance_miles.toFixed(1)} mi</p>
                      </div>
                    )}
                    {amenities.hospital && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Hospital</p>
                        <p className="text-slate-700 mt-0.5">{amenities.hospital.name} · {amenities.hospital.distance_miles.toFixed(1)} mi</p>
                      </div>
                    )}
                    {amenities.shopping && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Shopping</p>
                        <p className="text-slate-700 mt-0.5">{amenities.shopping.name} · {amenities.shopping.distance_miles.toFixed(1)} mi</p>
                      </div>
                    )}
                    {amenities.beach && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Beach</p>
                        <p className="text-slate-700 mt-0.5">{amenities.beach.name} · {amenities.beach.distance_miles.toFixed(1)} mi</p>
                      </div>
                    )}
                    {typeof amenities.restaurants_count === 'number' && amenities.restaurants_count > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Restaurants</p>
                        <p className="text-slate-700 mt-0.5">{amenities.restaurants_count}+ within 1 mi</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Open house (if configured) */}
              {listing?.open_house_description && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 sm:p-8">
                  <div className="flex items-center gap-2 text-blue-700 text-sm font-semibold mb-2">
                    <Calendar size={16} />
                    Open House
                  </div>
                  <p className="text-slate-700 leading-relaxed">{listing.open_house_description}</p>
                </div>
              )}

            </div>

            {/* Sidebar: inquiry form */}
            <div className="lg:col-span-1">
              <div className="sticky top-28">
                <PropertyInquiryForm
                  reportId={report.id}
                  propertyAddress={address}
                  askingPrice={report.asking_price}
                />
                <p className="mt-4 text-xs text-slate-400 text-center">
                  Direct from owner · No agent commission
                </p>
              </div>
            </div>
          </div>

          {/* Bottom footer strip */}
          <div className="mt-16 pt-8 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">
              Listed with{' '}
              <a href="/" className="text-blue-600 hover:text-blue-700 font-semibold">ListAI</a>
              {' '}— the AI toolkit for selling without an agent.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
