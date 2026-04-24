export type CustomerType = 'homeowner' | 'agent';
export type ReportStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type SoldStatus = 'unknown' | 'active' | 'sold' | 'withdrawn';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';
export type PropertyType = 'Single Family' | 'Condo' | 'Townhouse' | 'Multi-Family';
export type ConditionLabel = 'Needs Work' | 'Average' | 'Good' | 'Excellent';

export interface Report {
  id: string;
  created_at: string;
  user_id: string | null;
  customer_email: string;
  customer_name: string;
  stripe_session_id: string;
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  beds: number;
  baths: number;
  sqft: number;
  condition_score: number;
  asking_price: number;
  target_close_date: string;
  customer_type: CustomerType;
  status: ReportStatus;
  rentcast_data: RentcastData | null;
  report_output: ReportOutput | null;
  sold_status: SoldStatus;
  sold_price: number | null;
  sold_date: string | null;
  followup_stage: number;
  report_url: string | null;
  hoa_monthly_amount: number | null;
}

export interface AgentSubscription {
  id: string;
  created_at: string;
  user_id: string | null;
  email: string;
  name: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  reports_run: number;
  display_name: string | null;
  brokerage: string | null;
  phone: string | null;
  license_number: string | null;
  photo_url: string | null;
  tagline: string | null;
}

export interface HomeownerSubscription {
  id: string;
  created_at: string;
  user_id: string | null;
  email: string;
  name: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  report_id: string | null;
}

// Buyer inquiry submitted through a public /home/[id] listing page
export interface BuyerInquiry {
  id: string;
  created_at: string;
  report_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  pre_approved: boolean | null;
  financing_type: string | null;
  message: string | null;
  contacted: boolean;
  contacted_at: string | null;
}

// Lead (sales funnel / abandoned cart)
export interface Lead {
  id: string;
  created_at: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  property_address: string | null;
  property_city: string | null;
  property_zip: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  asking_price: number | null;
  form_step_reached: number;
  converted: boolean;
  converted_at: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  notes: string | null;
  followup_count: number;
  last_followup_at: string | null;
}

// Intake form data
export interface IntakeFormData {
  // Step 1: Property details
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  property_type: PropertyType;
  beds: number;
  baths: number;
  sqft: number;
  year_built: number;
  lot_size: number | null;
  home_features: string;
  // Step 2: Selling details
  condition_score: number;
  asking_price: number;
  target_close_date: string;
  recently_updated: boolean;
  updated_areas: string[];
  other_improvements: string;
  mortgage_status: 'Own free & clear' | 'Has mortgage' | 'Unknown';
  flexible_on_price: boolean;
  hoa_monthly_amount?: number;
  // Step 3: Contact
  customer_name: string;
  customer_email: string;
  phone: string;
  referral_source: string;
  disclaimer_accepted: boolean;
  // Agent-specific
  client_name?: string;
  client_email?: string;
  report_notes?: string;
}

// Rentcast API types
export interface RentcastData {
  property: RentcastProperty | null;
  valuation: RentcastValuation | null;
  market: RentcastMarket | null;
}

export interface RentcastProperty {
  id?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  lotSize?: number;
  propertyType?: string;
  lastSalePrice?: number;
  lastSaleDate?: string;
  ownerName?: string;
  taxAssessedValue?: number;
  [key: string]: unknown;
}

export interface RentcastValuation {
  price?: number;
  priceRangeLow?: number;
  priceRangeHigh?: number;
  comparables?: RentcastComparable[];
  [key: string]: unknown;
}

export interface RentcastComparable {
  formattedAddress?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  price?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  daysOnMarket?: number;
  distance?: number;
  [key: string]: unknown;
}

export interface RentcastMarket {
  averagePrice?: number;
  medianDaysOnMarket?: number;
  averagePricePerSquareFoot?: number;
  activeListingCount?: number;
  saleToListPriceRatio?: number;
  historicalData?: Record<string, unknown>[];
  [key: string]: unknown;
}

// Google Places types
export interface NearbyAmenities {
  grocery: PlaceResult | null;
  hospital: PlaceResult | null;
  school: PlaceResult | null;
  restaurants_count: number;
  beach: PlaceResult | null;
  shopping: PlaceResult | null;
}

export interface PlaceResult {
  name: string;
  distance_miles: number;
  rating?: number;
  address?: string;
}

// Report output modules
export interface ReportOutput {
  timeline: TimelineModule | null;
  improvements: ImprovementsModule | null;
  pricing: PricingModule | null;
  listing: ListingModule | null;
  legal: LegalModule | null;
  amenities: NearbyAmenities | null;
  social_media?: SocialMediaModule | null;
  buyer_cma?: BuyerCMAModule | null;
  open_house?: OpenHouseModule | null;
  market_snapshot?: MarketSnapshotModule | null;
}

export interface TimelineModule {
  timeline_summary: string;
  recommended_list_date: string;
  recommended_list_day: string;
  estimated_close_date: string;
  // Phase-based (current) — 4-6 phases with 3-5 tasks each
  phases?: {
    phase_number: number;
    label: string;
    duration: string;
    tasks: {
      task: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      estimated_hours: number;
    }[];
  }[];
  // Legacy week-based (backwards compat for old reports)
  weeks?: {
    week_number: number;
    label: string;
    tasks: {
      task: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      estimated_hours: number;
    }[];
  }[];
  local_tips: string[];
  florida_specific_tips?: string[];
  seasonal_note: string;
}

export interface ImprovementsModule {
  summary: string;
  total_estimated_investment: string;
  potential_value_increase: string;
  recommendations: {
    area: string;
    recommendation: string;
    why: string;
    estimated_cost: string;
    estimated_roi: string;
    priority: number;
    diy_friendly: boolean;
    time_to_complete: string;
  }[];
  things_to_avoid: string[];
  staging_tips: string[];
  florida_staging_tips?: string[];
}

export interface PricingModule {
  pricing_summary: string;
  recommended_list_price: number;
  price_range: { aggressive: number; conservative: number };
  price_per_sqft: number;
  market_avg_ppsf: number;
  owner_price_assessment: string;
  days_on_market_prediction: string;
  negotiation_floor: number;
  pricing_strategy: string;
  comparable_analysis: {
    address: string;
    sale_price: number;
    sqft: number;
    ppsf: number;
    beds: number;
    baths: number;
    sale_date: string;
    dom: number;
    distance: string;
    relevance: string;
  }[];
  market_context: string;
  florida_market_context?: string;
  price_reduction_triggers: string[];
}

export interface ListingModule {
  headline: string;
  tagline: string;
  full_description: string;
  short_description: string;
  bullet_highlights: string[];
  open_house_description: string;
  seo_keywords: string[];
  buyer_persona_targeted: string;
  lifestyle_angle: string;
  florida_lifestyle_angle?: string;
}

export interface LegalModule {
  disclaimer: string;
  attorney_referral_note: string;
  required_documents: {
    document_name: string;
    description: string;
    why_needed: string;
    where_to_get: string;
  }[];
  state_disclosures: {
    disclosure: string;
    statute_reference: string;
    plain_english: string;
  }[];
  key_clauses_explained: {
    clause: string;
    plain_english: string;
  }[];
  closing_costs: {
    item: string;
    who_pays: string;
    estimated_amount: string;
  }[];
  attorney_referral: {
    intro: string;
    what_to_ask_them: string[];
    typical_cost: string;
    when_to_call: string;
  };
  // Legacy backwards compat
  documents?: {
    document_name: string;
    description: string;
    template: string;
    key_clauses_explained: { clause: string; plain_english: string }[];
    what_to_fill_in: string[];
  }[];
  florida_attorney_referral?: {
    intro: string;
    what_to_ask_them: string[];
    typical_cost: string;
    when_to_call: string;
  };
}

export interface SocialMediaModule {
  instagram_caption: string;
  instagram_hashtags: string[];
  facebook_post: string;
  twitter_post: string;
  linkedin_post: string;
  short_form_video_script: string;
  email_blast: string;
}

export interface BuyerCMAModule {
  executive_summary: string;
  property_highlights: string[];
  comparable_sales: {
    address: string;
    sale_price: number;
    sqft: number;
    ppsf: number;
    beds: number;
    baths: number;
    sale_date: string;
    condition_comparison: string;
    price_adjustment: string;
  }[];
  market_position: string;
  value_justification: string;
  investment_outlook: string;
  neighborhood_highlights: string[];
  price_per_sqft_analysis: string;
}

export interface OpenHouseModule {
  property_fact_sheet: string;
  feature_highlights: string[];
  neighborhood_info: string;
  agent_talking_points: string[];
  objection_handlers: {
    objection: string;
    response: string;
  }[];
  follow_up_email_template: string;
}

export interface MarketSnapshotModule {
  market_summary: string;
  median_price: number;
  avg_price_per_sqft: number;
  avg_days_on_market: number;
  inventory_level: string;
  market_trend: 'Rising' | 'Stable' | 'Declining';
  buyer_vs_seller_market: string;
  price_trend_narrative: string;
  best_time_to_list: string;
  key_insights: string[];
  comparable_recent_sales: {
    address: string;
    price: number;
    sqft: number;
    beds: number;
    baths: number;
    sold_date: string;
    dom: number;
  }[];
}

export interface PlacesAttorney {
  name: string;
  address: string;
  rating?: number;
  total_ratings?: number;
  phone?: string;
  website?: string;
  distance_miles: number;
}

// Attorney data types
export interface AttorneyRegion {
  cities: string[];
  attorneys: Attorney[];
}

export interface Attorney {
  name: string;
  specialty: string;
  phone: string;
  website: string;
  avg_review_cost: string;
  note: string;
}
