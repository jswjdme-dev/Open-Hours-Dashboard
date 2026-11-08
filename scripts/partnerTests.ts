import {
  getPartners,
  getPartnerById,
  createPartner,
  updatePartnerDealTerms,
  getPartnerDealHistory,
  updatePartnerPortalSettings,
  getClientsByPartner,
  archivePartner,
  generatePartnerPortalInvite,
  getClients,
  getPayments,
  getTimeEntries,
  getTeamMembers,
} from '../src/data/repo.ts';
import { computePartnerEarnings } from '../src/lib/partners.ts';
import { PartnerDealTerms } from '../src/types/index.ts';

async function runPartnerTests() {
  console.log('--- RUNNING PARTNERSHIPS & EARNINGS INTEGRATION TESTS ---');
  let allPassed = true;

  // TEST 1: Partner Earnings = f(deal terms, Payment records) (Cash Basis Single Source of Truth)
  try {
    const [partners, clients, payments, timeEntries, teamMembers] = await Promise.all([
      getPartners(),
      getClients(),
      getPayments(),
      getTimeEntries(),
      getTeamMembers(),
    ]);

    const liam = partners.find((p) => p.id === 'part_01');
    if (!liam) throw new Error('Liam Byrne (part_01) not found');

    const computation = computePartnerEarnings(liam, clients, payments, timeEntries, teamMembers);

    // Liam has Harbour Dental Studio (client_01) which has received payments
    const passed1 =
      computation.grossClientPaymentsEUR > 0 &&
      computation.partnerShareEUR > 0 &&
      computation.netToOpenHoursEUR === computation.grossClientPaymentsEUR - computation.partnerShareEUR &&
      computation.clientBreakdowns.length > 0;

    console.log(`[${passed1 ? 'PASS' : 'FAIL'}] 1. Partner earnings computed from received client payments (cash basis)`);
    console.log(
      `       Gross Payments: €${computation.grossClientPaymentsEUR}, Share: €${computation.partnerShareEUR}, Net: €${computation.netToOpenHoursEUR}`
    );
    if (!passed1) allPassed = false;
  } catch (err: any) {
    console.log(`[FAIL] 1. Partner earnings calculation error: ${err.message}`);
    allPassed = false;
  }

  // TEST 2: Deal Versioning & History on Edit
  try {
    const testPartner = await createPartner({
      name: 'Dr. Jane Smith',
      organisation: 'Munster Health Consulting',
      type: 'Local agency',
      country: 'Ireland',
      city: 'Cork',
      email: 'jane@munsterhealth.ie',
      dealTerms: {
        dealSummary: '10% on monthly retainers',
        dealModel: 'Revenue share % per client',
        sharePercentage: 10,
        appliesTo: 'Monthly fees',
        cashBasis: true,
        currency: 'EUR',
        startDate: '2026-10-01',
      },
      portalType: 'No portal',
      clientVisibility: {
        enabled: false,
        businessName: false,
        projectStage: false,
        monthlyReportSummary: false,
        contactName: false,
      },
    });

    const newTerms: PartnerDealTerms = {
      dealSummary: '15% on both setup and monthly retainers',
      dealModel: 'Revenue share % per client',
      sharePercentage: 15,
      appliesTo: 'Both',
      cashBasis: true,
      currency: 'EUR',
      startDate: '2026-11-01',
    };

    const updated = await updatePartnerDealTerms(
      testPartner.id,
      newTerms,
      'Tier upgrade after milestone'
    );

    const history = await getPartnerDealHistory(testPartner.id);
    const passed2 =
      updated.dealTerms?.sharePercentage === 15 &&
      history.length === 1 &&
      history[0].terms.sharePercentage === 10 &&
      history[0].summaryOfChange === 'Tier upgrade after milestone';

    console.log(`[${passed2 ? 'PASS' : 'FAIL'}] 2. Deal terms versioning and immutable history`);
    console.log(
      `       Version 1 stored in history with old 10% rate; active deal updated to 15%.`
    );
    if (!passed2) allPassed = false;
  } catch (err: any) {
    console.log(`[FAIL] 2. Deal versioning error: ${err.message}`);
    allPassed = false;
  }

  // TEST 3: Portal Settings & Data Visibility Configuration
  try {
    const partners = await getPartners();
    const testP = partners[0];

    const updatedPortal = await updatePartnerPortalSettings(testP.id, {
      portalType: 'Standard partner portal (Open Hours branding)',
      clientVisibility: {
        enabled: true,
        businessName: true,
        projectStage: true,
        monthlyReportSummary: false,
        contactName: true,
      },
      portalLoginEmail: 'portal.admin@test.ie',
    });

    const passed3 =
      updatedPortal.portalType === 'Standard partner portal (Open Hours branding)' &&
      updatedPortal.clientVisibility?.enabled === true &&
      updatedPortal.clientVisibility?.businessName === true &&
      updatedPortal.clientVisibility?.monthlyReportSummary === false &&
      updatedPortal.portalLoginEmail === 'portal.admin@test.ie';

    console.log(`[${passed3 ? 'PASS' : 'FAIL'}] 3. Portal settings & granular data visibility configuration`);
    console.log(
      `       Portal mode and visibility toggles stored correctly.`
    );
    if (!passed3) allPassed = false;
  } catch (err: any) {
    console.log(`[FAIL] 3. Portal settings error: ${err.message}`);
    allPassed = false;
  }

  // TEST 4: Passwordless Magic Link Invite (Never Plaintext Passwords)
  try {
    const partners = await getPartners();
    const testP = partners[0];
    const invite = await generatePartnerPortalInvite(testP.id);

    const passed4 =
      invite.success === true &&
      Boolean(invite.inviteSentAt) &&
      !invite.message.includes('password');

    console.log(`[${passed4 ? 'PASS' : 'FAIL'}] 4. Passwordless magic link invite generation (Zero plaintext credentials)`);
    console.log(`       ${invite.message}`);
    if (!passed4) allPassed = false;
  } catch (err: any) {
    console.log(`[FAIL] 4. Invite generation error: ${err.message}`);
    allPassed = false;
  }

  // TEST 5: Soft-delete / Archive Partner
  try {
    const testPartnerToArchive = await createPartner({
      name: 'Archive Test Partner',
      organisation: 'Temporary Agency',
      type: 'Other',
      country: 'Ireland',
      city: 'Galway',
    });

    const archiveSuccess = await archivePartner(testPartnerToArchive.id);
    const reloaded = await getPartnerById(testPartnerToArchive.id);

    const passed5 = archiveSuccess && Boolean(reloaded?.archivedAt);
    console.log(`[${passed5 ? 'PASS' : 'FAIL'}] 5. Soft-delete archive enforcement`);
    console.log(`       Partner soft-deleted with timestamp ${reloaded?.archivedAt}.`);
    if (!passed5) allPassed = false;
  } catch (err: any) {
    console.log(`[FAIL] 5. Archive error: ${err.message}`);
    allPassed = false;
  }

  console.log('--------------------------------------------------------');
  if (allPassed) {
    console.log('ALL PARTNERSHIP & EARNINGS TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('SOME PARTNERSHIP TESTS FAILED!');
    process.exit(1);
  }
}

runPartnerTests().catch((err) => {
  console.error('Fatal partner test runner error:', err);
  process.exit(1);
});
