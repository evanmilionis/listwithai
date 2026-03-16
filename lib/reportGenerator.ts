import { createServiceClient } from '@/lib/supabase';
import { fetchAllRentcastData } from '@/lib/rentcast';
import { fetchNearbyAmenities } from '@/lib/googlePlaces';
import {
  buildPropertyContext,
  generateTimeline,
  generateImprovements,
  generatePricingAnalysis,
  generateListingCopy,
  generateLegalPackage,
  generateSocialMedia,
  generateBuyerCMA,
  generateOpenHouse,
  generateMarketSnapshot,
} from '@/lib/claude';
import { sendReportReadyEmail } from '@/lib/resend';
import type { Report, ReportOutput, RentcastData, NearbyAmenities } from '@/types';

/**
 * Main report generation orchestrator.
 *
 * 1. Fetches report from Supabase, sets status to 'processing'
 * 2. Calls Rentcast + Google Places in parallel (skips if data already exists)
 * 3. Builds a single shared PropertyContext (cached across all Claude calls)
 * 4. Calls all 5 Claude AI modules sequentially
 * 5. Stores combined results, sets status to 'complete'
 * 6. Sends notification email (only on first generation, not re-runs)
 * 7. On any failure: sets status to 'failed'
 */
export async function generateReport(reportId: string): Promise<void> {
  const supabase = createServiceClient();

  try {
    // -----------------------------------------------------------------------
    // 1. Fetch report & mark as processing
    // -----------------------------------------------------------------------
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (fetchError || !report) {
      console.error('Failed to fetch report:', fetchError);
      throw new Error(`Report not found: ${reportId}`);
    }

    const typedReport = report as Report;
    const isRegeneration = typedReport.status === 'complete' || typedReport.status === 'failed';

    await supabase
      .from('reports')
      .update({ status: 'processing' })
      .eq('id', reportId);

    // -----------------------------------------------------------------------
    // 2. Fetch external data (skip Rentcast if already cached)
    // -----------------------------------------------------------------------
    const propertyType =
      (typedReport as unknown as Record<string, unknown>).property_type as string ?? 'Single Family';

    let rentcastData: RentcastData;
    let amenities: NearbyAmenities | null;

    if (typedReport.rentcast_data && Object.keys(typedReport.rentcast_data).length > 0) {
      console.log('Using cached Rentcast data (skipping API call)');
      rentcastData = typedReport.rentcast_data as RentcastData;
      const existingAmenities = (typedReport.report_output as ReportOutput)?.amenities;
      amenities = existingAmenities ?? await fetchNearbyAmenities(
        typedReport.property_address,
        typedReport.property_city,
        typedReport.property_state,
        typedReport.property_zip
      );
    } else {
      console.log('Fetching Rentcast + Google Places data...');
      const [fetchedRentcast, fetchedAmenities] = await Promise.all([
        fetchAllRentcastData({
          address:       typedReport.property_address,
          city:          typedReport.property_city,
          state:         typedReport.property_state,
          zipCode:       typedReport.property_zip,
          bedrooms:      typedReport.beds,
          bathrooms:     typedReport.baths,
          squareFootage: typedReport.sqft,
          propertyType,
        }),
        fetchNearbyAmenities(
          typedReport.property_address,
          typedReport.property_city,
          typedReport.property_state,
          typedReport.property_zip
        ),
      ]);
      rentcastData = fetchedRentcast;
      amenities = fetchedAmenities;

      await supabase
        .from('reports')
        .update({ rentcast_data: rentcastData })
        .eq('id', reportId);
    }

    // -----------------------------------------------------------------------
    // 3. Build shared property context ONCE
    //    This is the object that gets cached by Anthropic across all 5 calls.
    //    Building it here (after data fetch, before any Claude call) ensures
    //    the identical block is sent on every module — required for cache hits.
    // -----------------------------------------------------------------------
    const ctx = buildPropertyContext(typedReport, rentcastData, amenities);
    console.log(`Property context built — ${ctx.text.length} chars (~${Math.round(ctx.text.length / 4)} tokens)`);

    // -----------------------------------------------------------------------
    // 4. Run Claude modules IN PARALLEL
    //    All 5 modules run concurrently to fit within Vercel's 60s timeout
    // -----------------------------------------------------------------------
    console.log('Starting all 5 Claude modules in parallel...');
    const [timeline, improvements, pricing, listing, legal] = await Promise.all([
      generateTimeline(typedReport, rentcastData, ctx).catch((err) => {
        console.error('Timeline failed:', err);
        return null;
      }),
      generateImprovements(typedReport, rentcastData, ctx).catch((err) => {
        console.error('Improvements failed:', err);
        return null;
      }),
      generatePricingAnalysis(typedReport, rentcastData, ctx).catch((err) => {
        console.error('Pricing failed:', err);
        return null;
      }),
      generateListingCopy(typedReport, rentcastData, amenities, ctx).catch((err) => {
        console.error('Listing failed:', err);
        return null;
      }),
      generateLegalPackage(typedReport, ctx).catch((err) => {
        console.error('Legal failed:', err);
        return null;
      }),
    ]);
    console.log('  Timeline:', timeline ? 'OK' : 'FAILED');
    console.log('  Improvements:', improvements ? 'OK' : 'FAILED');
    console.log('  Pricing:', pricing ? 'OK' : 'FAILED');
    console.log('  Listing:', listing ? 'OK' : 'FAILED');
    console.log('  Legal:', legal ? 'OK' : 'FAILED');

    // -----------------------------------------------------------------------
    // 4b. Run AGENT-ONLY modules (social media, buyer CMA, open house, market snapshot)
    //     Only generated for agent customer_type reports
    // -----------------------------------------------------------------------
    let socialMedia = null;
    let buyerCMA = null;
    let openHouse = null;
    let marketSnapshot = null;

    if (typedReport.customer_type === 'agent') {
      console.log('Starting agent-only modules...');
      [socialMedia, buyerCMA, openHouse, marketSnapshot] = await Promise.all([
        generateSocialMedia(typedReport, rentcastData, amenities, ctx).catch((err) => {
          console.error('Social Media failed:', err);
          return null;
        }),
        generateBuyerCMA(typedReport, rentcastData, ctx).catch((err) => {
          console.error('Buyer CMA failed:', err);
          return null;
        }),
        generateOpenHouse(typedReport, rentcastData, amenities, ctx).catch((err) => {
          console.error('Open House failed:', err);
          return null;
        }),
        generateMarketSnapshot(typedReport, rentcastData, ctx).catch((err) => {
          console.error('Market Snapshot failed:', err);
          return null;
        }),
      ]);
      console.log('  Social Media:', socialMedia ? 'OK' : 'FAILED');
      console.log('  Buyer CMA:', buyerCMA ? 'OK' : 'FAILED');
      console.log('  Open House:', openHouse ? 'OK' : 'FAILED');
      console.log('  Market Snapshot:', marketSnapshot ? 'OK' : 'FAILED');
    }

    // -----------------------------------------------------------------------
    // 5. Store results & mark complete
    // -----------------------------------------------------------------------
    const reportOutput: ReportOutput = {
      timeline,
      improvements,
      pricing,
      listing,
      legal,
      amenities,
      social_media: socialMedia,
      buyer_cma: buyerCMA,
      open_house: openHouse,
      market_snapshot: marketSnapshot,
    };

    const baseModules = [timeline, improvements, pricing, listing, legal].filter(Boolean).length;
    const agentModules = typedReport.customer_type === 'agent'
      ? [socialMedia, buyerCMA, openHouse, marketSnapshot].filter(Boolean).length
      : 0;
    const totalModules = typedReport.customer_type === 'agent' ? 9 : 5;
    const successCount = baseModules + agentModules;
    console.log(`Report modules complete: ${successCount}/${totalModules} succeeded`);
    console.log('Data sizes:', {
      timeline:     timeline     ? JSON.stringify(timeline).length     : 0,
      improvements: improvements ? JSON.stringify(improvements).length : 0,
      pricing:      pricing      ? JSON.stringify(pricing).length      : 0,
      listing:      listing      ? JSON.stringify(listing).length      : 0,
      legal:        legal        ? JSON.stringify(legal).length        : 0,
    });

    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/report/${reportId}`;

    const { error: saveError, data: savedData } = await supabase
      .from('reports')
      .update({
        report_output: reportOutput,
        status:        successCount > 0 ? 'complete' : 'failed',
        report_url:    reportUrl,
      })
      .eq('id', reportId)
      .select('id, status, report_output')
      .single();

    if (saveError) {
      console.error('CRITICAL: Failed to save report output to Supabase:', saveError);
      throw new Error('Failed to save report output');
    }

    const savedOutput = savedData?.report_output as Record<string, unknown> | null;
    const savedKeys = savedOutput ? Object.keys(savedOutput).filter(k => savedOutput[k] !== null) : [];
    console.log('Verified saved data — non-null keys:', savedKeys);

    // -----------------------------------------------------------------------
    // 6. Send notification email (first generation only)
    //    BUG FIX: was `if (true)` — now correctly uses isRegeneration flag
    // -----------------------------------------------------------------------
    if (!isRegeneration) {
      await sendReportReadyEmail(
        typedReport.customer_email,
        typedReport.customer_name,
        reportUrl
      );
      console.log('Notification email sent');
    } else {
      console.log('Skipping email (regeneration)');
    }

    console.log(`Report ${reportId} generated successfully (${successCount}/${totalModules} modules)`);
  } catch (error) {
    console.error(`Report ${reportId} generation failed:`, error);

    await supabase
      .from('reports')
      .update({ status: 'failed' })
      .eq('id', reportId);

    // Alert admin immediately on failure
    try {
      await fetch('https://listwithai.io/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, error: String(error) }),
      });
    } catch (notifyErr) {
      console.error('Failed to notify admin:', notifyErr);
    }
  }
}
