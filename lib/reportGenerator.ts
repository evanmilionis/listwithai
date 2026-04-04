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
        }).catch((err) => {
          console.error('Rentcast fetch failed entirely:', err);
          return { property: null, valuation: null, market: null } as RentcastData;
        }),
        fetchNearbyAmenities(
          typedReport.property_address,
          typedReport.property_city,
          typedReport.property_state,
          typedReport.property_zip
        ).catch((err) => {
          console.error('Google Places fetch failed:', err);
          return null;
        }),
      ]);
      rentcastData = fetchedRentcast;
      amenities = fetchedAmenities;

      // Log what we got so we can diagnose issues
      const hasValuation = !!rentcastData.valuation;
      const hasMarket = !!rentcastData.market;
      const hasProperty = !!rentcastData.property;
      console.log(`Rentcast results — property: ${hasProperty}, valuation: ${hasValuation}, market: ${hasMarket}`);
      console.log(`Google Places — amenities: ${!!amenities}`);

      // Still cache whatever we got (even partial) so regeneration doesn't re-fetch
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
    const moduleStart = Date.now();
    const [timeline, improvements, pricing, listing, legal] = await Promise.all([
      generateTimeline(typedReport, rentcastData, ctx).catch((err) => {
        console.error('Timeline THREW:', err instanceof Error ? err.message : err);
        return null;
      }),
      generateImprovements(typedReport, rentcastData, ctx).catch((err) => {
        console.error('Improvements THREW:', err instanceof Error ? err.message : err);
        return null;
      }),
      generatePricingAnalysis(typedReport, rentcastData, ctx).catch((err) => {
        console.error('Pricing THREW:', err instanceof Error ? err.message : err);
        return null;
      }),
      generateListingCopy(typedReport, rentcastData, amenities, ctx).catch((err) => {
        console.error('Listing THREW:', err instanceof Error ? err.message : err);
        return null;
      }),
      generateLegalPackage(typedReport, ctx).catch((err) => {
        console.error('Legal THREW:', err instanceof Error ? err.message : err);
        return null;
      }),
    ]);
    console.log(`Base modules completed in ${((Date.now() - moduleStart) / 1000).toFixed(1)}s`);
    console.log('  Timeline:', timeline ? 'OK' : 'FAILED');
    console.log('  Improvements:', improvements ? 'OK' : 'FAILED');
    console.log('  Pricing:', pricing ? 'OK' : 'FAILED');
    console.log('  Listing:', listing ? 'OK' : 'FAILED');
    console.log('  Legal:', legal ? 'OK' : 'FAILED');

    // -----------------------------------------------------------------------
    // 4a. RETRY failed core modules once — these are what the customer paid for
    // -----------------------------------------------------------------------
    let retryTimeline = timeline;
    let retryPricing = pricing;
    let retryListing = listing;

    const coreFailures = [
      !timeline && 'timeline',
      !pricing && 'pricing',
      !listing && 'listing',
    ].filter(Boolean) as string[];

    if (coreFailures.length > 0) {
      console.log(`Retrying ${coreFailures.length} failed core module(s): ${coreFailures.join(', ')}`);
      const retryStart = Date.now();

      const retries = await Promise.all([
        !timeline ? generateTimeline(typedReport, rentcastData, ctx).catch(() => null) : Promise.resolve(timeline),
        !pricing ? generatePricingAnalysis(typedReport, rentcastData, ctx).catch(() => null) : Promise.resolve(pricing),
        !listing ? generateListingCopy(typedReport, rentcastData, amenities, ctx).catch(() => null) : Promise.resolve(listing),
      ]);

      retryTimeline = retries[0] as typeof timeline;
      retryPricing = retries[1] as typeof pricing;
      retryListing = retries[2] as typeof listing;

      console.log(`Core retries completed in ${((Date.now() - retryStart) / 1000).toFixed(1)}s`);
      if (!timeline && retryTimeline) console.log('  Timeline: RECOVERED on retry');
      if (!pricing && retryPricing) console.log('  Pricing: RECOVERED on retry');
      if (!listing && retryListing) console.log('  Listing: RECOVERED on retry');
    }

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
    //    Use retried values for core modules (falls back to original if no retry needed)
    // -----------------------------------------------------------------------
    const finalTimeline = retryTimeline;
    const finalPricing = retryPricing;
    const finalListing = retryListing;

    const reportOutput: ReportOutput = {
      timeline: finalTimeline,
      improvements,
      pricing: finalPricing,
      listing: finalListing,
      legal,
      amenities,
      social_media: socialMedia,
      buyer_cma: buyerCMA,
      open_house: openHouse,
      market_snapshot: marketSnapshot,
    };

    const baseModules = [finalTimeline, improvements, finalPricing, finalListing, legal].filter(Boolean).length;
    const agentModules = typedReport.customer_type === 'agent'
      ? [socialMedia, buyerCMA, openHouse, marketSnapshot].filter(Boolean).length
      : 0;
    const totalModules = typedReport.customer_type === 'agent' ? 9 : 5;
    const successCount = baseModules + agentModules;

    // Core modules that MUST succeed for the report to be useful to a paying customer.
    // Timeline, pricing, and listing are the minimum viable report.
    const coreModulesPresent = !!(finalTimeline && finalPricing && finalListing);
    const failedModules: string[] = [];
    if (!finalTimeline) failedModules.push('timeline');
    if (!improvements)  failedModules.push('improvements');
    if (!finalPricing)  failedModules.push('pricing');
    if (!finalListing)  failedModules.push('listing');
    if (!legal)         failedModules.push('legal');

    console.log(`Report modules complete: ${successCount}/${totalModules} succeeded`);
    if (failedModules.length > 0) {
      console.error(`FAILED modules: ${failedModules.join(', ')}`);
    }
    console.log('Data sizes:', {
      timeline:     finalTimeline ? JSON.stringify(finalTimeline).length : 0,
      improvements: improvements  ? JSON.stringify(improvements).length  : 0,
      pricing:      finalPricing  ? JSON.stringify(finalPricing).length  : 0,
      listing:      finalListing  ? JSON.stringify(finalListing).length  : 0,
      legal:        legal         ? JSON.stringify(legal).length         : 0,
    });

    // Determine final status:
    // - 'complete' only if ALL 3 core modules (timeline, pricing, listing) succeeded
    // - 'failed' if any core module is missing — customer paid for a full report
    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/report/${reportId}`;
    const finalStatus = coreModulesPresent ? 'complete' : 'failed';

    if (finalStatus === 'failed') {
      console.error(`Report ${reportId} marked FAILED — missing core modules: ${failedModules.filter(m => ['timeline', 'pricing', 'listing'].includes(m)).join(', ')}`);
    }

    const { error: saveError, data: savedData } = await supabase
      .from('reports')
      .update({
        report_output: reportOutput,
        status:        finalStatus,
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
    // 6. Send notification email (first generation only, and ONLY on success)
    //    For agent reports: send to client AND agent (separate emails)
    // -----------------------------------------------------------------------
    if (finalStatus === 'complete' && !isRegeneration) {
      const formMeta = (typedReport.report_output as unknown as Record<string, unknown>)?.form_metadata as Record<string, string> | undefined;

      if (typedReport.customer_type === 'agent' && formMeta) {
        const agentEmail = formMeta.agent_email;
        const agentName = formMeta.agent_name;
        const clientEmail = formMeta.client_email || typedReport.customer_email;
        const clientName = typedReport.customer_name;

        // Send to client (if we have their email and it's different from agent's)
        if (clientEmail && clientEmail !== agentEmail) {
          await sendReportReadyEmail(clientEmail, clientName, reportUrl);
          console.log(`Client notification sent to ${clientEmail}`);
        }

        // Always send to agent
        if (agentEmail) {
          await sendReportReadyEmail(agentEmail, agentName || 'Agent', reportUrl);
          console.log(`Agent notification sent to ${agentEmail}`);
        }
      } else {
        // Homeowner report — send to the customer
        await sendReportReadyEmail(
          typedReport.customer_email,
          typedReport.customer_name,
          reportUrl
        );
      }
      console.log('Notification email(s) sent');
    } else if (finalStatus === 'failed') {
      console.error(`Report ${reportId} FAILED — NOT sending customer email. Failed modules: ${failedModules.join(', ')}`);
    } else {
      console.log('Skipping email (regeneration)');
    }

    console.log(`Report ${reportId} generation ${finalStatus} (${successCount}/${totalModules} modules)`);
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
