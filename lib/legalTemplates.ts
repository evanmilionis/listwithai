/**
 * lib/legalTemplates.ts
 *
 * Pre-written Florida FSBO legal document templates.
 * Variables use {{PLACEHOLDER}} syntax — filled at runtime via fillTemplate().
 *
 * These are starter templates only. Every document includes a disclaimer
 * that attorney review is required before use.
 *
 * Documents included:
 *   1. FL FSBO Purchase & Sale Agreement
 *   2. Seller's Property Disclosure Statement
 *   3. FSBO Closing Checklist
 */

export interface TemplateVars {
  PROPERTY_ADDRESS: string;
  PROPERTY_CITY: string;
  PROPERTY_STATE: string;
  PROPERTY_ZIP: string;
  SELLER_NAME: string;
  ASKING_PRICE: string;
  TARGET_CLOSE_DATE: string;
  CURRENT_DATE: string;
  COUNTY: string;
}

export function fillTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return (vars as unknown as Record<string, string>)[key] ?? `{{${key}}}`;
  });
}

// ---------------------------------------------------------------------------
// Document 1 — Purchase & Sale Agreement
// ---------------------------------------------------------------------------

export const PURCHASE_AGREEMENT_TEMPLATE = `
FLORIDA RESIDENTIAL PURCHASE AND SALE AGREEMENT
(For Sale By Owner — Template Only)

DISCLAIMER: This is a template document for informational purposes only. It does NOT
constitute legal advice. You MUST have a licensed Florida real estate attorney review
and customize this document before use. Florida law requires specific disclosures and
clauses that may not be fully reflected here.

Date: {{CURRENT_DATE}}

1. PARTIES
   Seller: {{SELLER_NAME}} ("Seller")
   Buyer: _________________________ ("Buyer")

2. PROPERTY
   The real property located at:
   {{PROPERTY_ADDRESS}}, {{PROPERTY_CITY}}, {{PROPERTY_STATE}} {{PROPERTY_ZIP}}
   (the "Property"), together with all improvements, fixtures, and appurtenances.

3. PURCHASE PRICE
   The total purchase price shall be $_________________________ (the "Purchase Price"),
   payable as follows:
   a. Earnest Money Deposit: $_________________________ due within 3 days of execution,
      held in escrow by _________________________.
   b. Balance at Closing: The remainder of the Purchase Price, adjusted for prorations
      and closing costs, due at closing.

4. CLOSING DATE
   Closing shall occur on or before {{TARGET_CLOSE_DATE}}, or as otherwise agreed in
   writing by both parties ("Closing Date").

5. FINANCING CONTINGENCY
   [ ] This Agreement IS contingent upon Buyer obtaining financing.
       Loan Amount: $_____________  Type: _____________  Rate: _____%
       Buyer shall apply for financing within ____ days of execution and provide
       written approval within ____ days. If financing is not obtained by
       _________________________, Buyer may cancel and receive Earnest Money refund.
   [ ] This Agreement is NOT contingent upon financing (cash purchase).

6. INSPECTION CONTINGENCY
   Buyer shall have _____ calendar days from execution to conduct inspections
   ("Inspection Period"). If Buyer is unsatisfied, Buyer may:
   a. Cancel and receive full Earnest Money refund, OR
   b. Submit a written repair request to Seller.
   Seller shall have 5 days to respond. If parties cannot agree, either may cancel.

7. TITLE
   Seller shall convey marketable title by Warranty Deed, free and clear of all
   encumbrances except: (a) taxes for the current year, (b) zoning restrictions,
   and (c) restrictions/easements of record. Title shall be examined by a Florida-
   licensed title agent or attorney at Buyer's expense.

8. CLOSING COSTS & PRORATIONS
   a. Documentary Stamp Tax on Deed: Seller pays
   b. Title Insurance (owner's policy): [ ] Seller [ ] Buyer [ ] Split
   c. Closing/Settlement Fee: [ ] Seller [ ] Buyer [ ] Split
   d. Real Estate Taxes: Prorated to Closing Date
   e. HOA fees (if applicable): Prorated to Closing Date
   f. Each party pays their own attorney fees.

9. PROPERTY CONDITION / AS-IS
   [ ] Property sold AS-IS. Seller makes no repairs but Buyer retains right to inspect.
   [ ] Seller agrees to repair items agreed upon in Inspection Addendum.
   Seller represents that, to the best of Seller's knowledge, all material facts
   affecting the Property's value have been disclosed in the attached Disclosure.

10. FLORIDA-SPECIFIC DISCLOSURES (attach separately)
    Seller shall provide, prior to or at execution:
    a. Seller's Property Disclosure Statement
    b. Lead-Based Paint Disclosure (if home built before 1978)
    c. HOA Disclosure (if applicable) — Florida Statute §720.401
    d. Condominium Disclosure (if applicable) — Florida Statute §718.503
    e. Radon Gas Disclosure — Florida Statute §404.056(5)
    f. Mold Disclosure (if known)

11. POSSESSION
    Seller shall deliver possession of the Property at Closing, free of all occupants
    and personal property not included in the sale, in the same condition as of
    the date of this Agreement, normal wear and tear excepted.

12. DEFAULT
    If Buyer defaults: Seller may retain Earnest Money as liquidated damages.
    If Seller defaults: Buyer may seek specific performance or receive Earnest Money refund.

13. DISPUTE RESOLUTION
    Any dispute arising under this Agreement shall first be submitted to mediation
    in {{COUNTY}} County, Florida, before litigation. Prevailing party in any
    litigation is entitled to reasonable attorney's fees.

14. ENTIRE AGREEMENT
    This Agreement, including all addenda, constitutes the entire agreement between
    the parties. Any modifications must be in writing signed by both parties.

15. GOVERNING LAW
    This Agreement shall be governed by the laws of the State of Florida.

SELLER SIGNATURE: _________________________  Date: ___________
Print Name: {{SELLER_NAME}}

BUYER SIGNATURE:  _________________________  Date: ___________
Print Name: _________________________

[ATTACH: Seller's Disclosure, Lead Paint Addendum (if applicable), HOA Addendum (if applicable)]
`.trim();

// ---------------------------------------------------------------------------
// Document 2 — Seller's Property Disclosure Statement
// ---------------------------------------------------------------------------

export const DISCLOSURE_TEMPLATE = `
FLORIDA SELLER'S PROPERTY DISCLOSURE STATEMENT
(Residential Real Property)

DISCLAIMER: This is a template. Have a Florida real estate attorney review before use.
Florida law (§689.261) requires sellers to disclose known material defects.

Property Address: {{PROPERTY_ADDRESS}}, {{PROPERTY_CITY}}, FL {{PROPERTY_ZIP}}
Seller Name: {{SELLER_NAME}}
Date: {{CURRENT_DATE}}

INSTRUCTIONS TO SELLER: Answer ALL questions truthfully and completely. "Yes" means
the condition EXISTS or HAS existed. Leave no blanks. Attach additional pages if needed.
Failure to disclose known material defects can result in legal liability.

SECTION 1 — ROOF
1. Age of roof: _______  Type: _______
2. Known leaks or water intrusion?              [ ] Yes  [ ] No  [ ] Unknown
3. Any repairs in last 5 years?                 [ ] Yes  [ ] No
   If yes, describe: _________________________________

SECTION 2 — WATER / PLUMBING
4. Water source:  [ ] Public  [ ] Well  [ ] Other: _______
5. Sewer:         [ ] Public  [ ] Septic  [ ] Other: _______
6. Known plumbing leaks or backups?             [ ] Yes  [ ] No  [ ] Unknown
7. Water heater age: _______  Type: _______

SECTION 3 — ELECTRICAL
8. Electrical panel type/age: _______
9. Known electrical problems?                   [ ] Yes  [ ] No  [ ] Unknown
10. Aluminum wiring?                            [ ] Yes  [ ] No  [ ] Unknown

SECTION 4 — HVAC
11. A/C system age: _______  Type: _______
12. Heating system age: _______  Type: _______
13. Known HVAC problems?                        [ ] Yes  [ ] No  [ ] Unknown

SECTION 5 — STRUCTURAL
14. Known foundation issues, cracks, or settling?  [ ] Yes  [ ] No  [ ] Unknown
15. Known issues with floors, walls, or ceilings?  [ ] Yes  [ ] No  [ ] Unknown
16. Any additions/renovations done without permits? [ ] Yes  [ ] No  [ ] Unknown
    If yes, describe: _________________________________

SECTION 6 — WATER DAMAGE / MOLD
17. Known past or present water damage?         [ ] Yes  [ ] No  [ ] Unknown
18. Known mold or mildew?                       [ ] Yes  [ ] No  [ ] Unknown
19. Ever filed a water/flood insurance claim?   [ ] Yes  [ ] No
    If yes, describe: _________________________________

SECTION 7 — PEST / ENVIRONMENTAL
20. Known termite or pest infestation?          [ ] Yes  [ ] No  [ ] Unknown
21. Any termite bonds or warranties?            [ ] Yes  [ ] No
22. Known presence of Chinese drywall?          [ ] Yes  [ ] No  [ ] Unknown
23. Property in a flood zone?                   [ ] Yes  [ ] No  [ ] Unknown
    Flood zone designation (if known): _______

SECTION 8 — FLORIDA-SPECIFIC (REQUIRED)
24. RADON: Florida Statute §404.056(5) requires the following disclosure:
    RADON GAS: Radon is a naturally occurring radioactive gas that, when it has
    accumulated in a building in sufficient quantities, may present health risks to
    persons who are exposed to it over time. Levels of radon that exceed federal and
    state guidelines have been found in buildings in Florida. Additional information
    regarding radon and radon testing may be obtained from your county health department.

25. HOA/Community:
    Is property subject to HOA or CDD fees?     [ ] Yes  [ ] No
    If yes — Name: _______  Monthly fee: $_______  CDD: $_______

26. Any pending assessments or violations?      [ ] Yes  [ ] No  [ ] Unknown

SECTION 9 — LEGAL / TITLE
27. Any pending litigation involving the property?  [ ] Yes  [ ] No
28. Any liens, judgments, or encumbrances?          [ ] Yes  [ ] No
29. Any boundary disputes with neighbors?           [ ] Yes  [ ] No

SECTION 10 — ADDITIONAL DISCLOSURES
Please describe any other known material defects or conditions not covered above:
________________________________________________________________________________
________________________________________________________________________________

SELLER CERTIFICATION:
The Seller(s) represent that the information above is accurate and complete to the
best of Seller's knowledge as of the date signed. Seller acknowledges the duty to
update this disclosure if any information changes prior to closing.

Seller Signature: _________________________  Date: ___________
Print Name: {{SELLER_NAME}}
`.trim();

// ---------------------------------------------------------------------------
// Document 3 — FSBO Closing Checklist
// ---------------------------------------------------------------------------

export const CLOSING_CHECKLIST_TEMPLATE = `
FLORIDA FSBO CLOSING CHECKLIST
Property: {{PROPERTY_ADDRESS}}, {{PROPERTY_CITY}}, FL {{PROPERTY_ZIP}}
Target Closing Date: {{TARGET_CLOSE_DATE}}
Seller: {{SELLER_NAME}}

DISCLAIMER: This checklist is a general guide only. A Florida real estate attorney
should oversee your closing to ensure all legal requirements are met.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — BEFORE ACCEPTING AN OFFER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Hire a Florida real estate attorney to review all contracts
[ ] Order a title search to identify any liens or encumbrances
[ ] Gather HOA documents (if applicable): bylaws, financials, rules, fees
[ ] Locate your survey (or order a new one if unavailable)
[ ] Pull permits for any additions or renovations
[ ] Complete Seller's Property Disclosure Statement (attached)
[ ] Complete Lead-Based Paint Disclosure (required if built before 1978)
[ ] Have property appraised (optional but recommended)
[ ] Open escrow account or identify closing/title company

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — AFTER ACCEPTING AN OFFER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Confirm Earnest Money deposit received and in escrow
[ ] Provide all disclosures to Buyer (keep signed copies)
[ ] Coordinate Buyer's inspection — be available, prepare the home
[ ] Respond to any inspection repair requests in writing within 5 days
[ ] Confirm Buyer's financing timeline (if financed sale)
[ ] Monitor appraisal (if financed — appraisal ordered by Buyer's lender)
[ ] Begin payoff process on your mortgage (contact lender for payoff quote)
[ ] Contact HOA for estoppel letter (required — can take 10-14 days in FL)
[ ] Notify your homeowner's insurance company of pending sale

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — 2 WEEKS BEFORE CLOSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Review title commitment from title company — confirm no surprises
[ ] Review preliminary closing disclosure / settlement statement (HUD-1 or ALTA)
[ ] Confirm wire instructions for your proceeds (use verified phone number — wire fraud is common)
[ ] Arrange to pay off any liens or judgments before closing
[ ] Begin transferring or canceling utilities (schedule for day after closing)
[ ] Confirm closing time, location, and what ID to bring
[ ] Gather keys, garage door openers, gate codes, mailbox keys, manuals
[ ] Complete any agreed-upon repairs — obtain receipts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — CLOSING DAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Bring valid government-issued photo ID (passport or driver's license)
[ ] Do a final walkthrough with Buyer before closing (standard practice)
[ ] Review all closing documents carefully before signing
[ ] Confirm final sale price, prorations, and net proceeds match expectations
[ ] Sign Warranty Deed (transfers title to Buyer)
[ ] Sign Closing Disclosure / Settlement Statement
[ ] Hand over all keys, remotes, codes, and manuals at closing
[ ] Confirm proceeds wired or check issued

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 — AFTER CLOSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Keep all closing documents in a safe place (minimum 7 years)
[ ] Confirm deed was recorded by title company in {{COUNTY}} County
[ ] Cancel homeowner's insurance (after closing is confirmed)
[ ] File change of address with USPS
[ ] Report sale to your CPA — capital gains exclusion may apply (§121 exclusion:
    up to $250k single / $500k married if primary residence 2+ of last 5 years)
[ ] Confirm mortgage payoff reflected on your credit report within 30-60 days

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLORIDA-SPECIFIC REMINDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Doc stamps: Florida charges $0.70 per $100 of sale price on the deed — this is
  the Seller's cost (e.g., a $400,000 sale = $2,800 in doc stamps).
• HOA estoppel: Florida law (§720.30851) requires a current estoppel letter from
  any HOA. Budget 10–14 days and up to $299 for this.
• Wire fraud: Florida is a high-risk state. Always verify wire instructions by
  phone using a number you independently verified — never email alone.
• Homestead: If this is your primary residence, confirm Homestead Exemption is
  removed after sale to avoid future tax issues.
`.trim();

// ---------------------------------------------------------------------------
// Builder — returns the full documents array with variables filled in
// ---------------------------------------------------------------------------

export function buildLegalDocuments(vars: TemplateVars) {
  return [
    {
      document_name: 'Florida FSBO Purchase & Sale Agreement',
      description:
        'A Florida-specific residential purchase and sale agreement for FSBO transactions. Includes financing contingency, inspection period, title, closing costs, and required FL disclosures.',
      template: fillTemplate(PURCHASE_AGREEMENT_TEMPLATE, vars),
      what_to_fill_in: [
        "Buyer's full legal name",
        'Purchase price and earnest money amount',
        'Escrow holder name and contact',
        'Financing contingency details (or mark cash)',
        'Inspection period length (typically 10–15 days)',
        'Title insurance responsibility (buyer, seller, or split)',
        'Repair obligations (AS-IS or negotiated)',
      ],
    },
    {
      document_name: "Florida Seller's Property Disclosure Statement",
      description:
        'Required disclosure of all known material defects. Florida law requires sellers to disclose anything that materially affects the value of the property.',
      template: fillTemplate(DISCLOSURE_TEMPLATE, vars),
      what_to_fill_in: [
        'All checkboxes answered truthfully — no blanks',
        'Roof age and type',
        'Water heater and HVAC ages',
        'HOA name and monthly fee (if applicable)',
        'Any known defects described in Section 10',
      ],
    },
    {
      document_name: 'FSBO Closing Checklist',
      description:
        'A phase-by-phase closing checklist covering everything from pre-listing prep through post-closing tasks. Florida-specific items included.',
      template: fillTemplate(CLOSING_CHECKLIST_TEMPLATE, vars),
      what_to_fill_in: [
        'Complete each checkbox as tasks are finished',
        'Fill in closing company name and contact',
        'Fill in HOA name and estoppel contact (if applicable)',
      ],
    },
  ];
}
