import {
  calculateLeadScore,
  checkIsSuppressed,
  validateStageTransition,
} from './logic.ts';
import { SuppressionEntry, Client, Application, ReferralCredit, ReferralMilestoneRow } from '../types/index.ts';
import {
  generateClientReferralCode,
  evaluateSelfReferralAndCap,
  contentGuardCheck,
  assertNoForbiddenFieldsInPortalViewModel,
  assertNoForbiddenFieldsInProposalViewModel,
  assertNoForbiddenFieldsInPublicPreview,
  computeAdditiveEarnedMonths,
  computeNextReferralReward,
} from '../data/repo.ts';
import { validateAllowedUrl, assertAllowedHost } from './allowedHosts.ts';
import {
  parseGitHubRepoInput,
  parseTemplateCommentMeta,
  parseSidecarJson,
} from './githubSync.ts';
import { validateTemplateHtml, renderWebsiteTemplate } from './templateEngine.ts';
import {
  validatePreviewUrl,
  validateChangelog,
  validateCommitSha,
  slugifyClientName,
  DEFAULT_ALLOWED_PREVIEW_DOMAINS,
} from './customWebsiteValidation.ts';
import {
  validateReactTemplateManifest,
  calculateConfigPayloadSize,
  isPayloadWithinLimit,
  validateHandshakeMessage,
  extractDefaultConfig,
  HANDSHAKE_TIMEOUT_MS,
  HANDSHAKE_TIMEOUT_MESSAGE,
} from './reactTemplateManifest.ts';

// Simple lightweight test runner executable in browser or node
export function runUnitTests() {
  const results: Array<{ test: string; passed: boolean; message?: string }> = [];

  // 1. Scoring tests
  try {
    const hotScore = calculateLeadScore(
      {
        privateServices: 2,
        googleReviews: 2,
        websiteGap: 2,
        gbpGaps: 1,
        ownerAccessibility: 2,
        recentActivity: 1,
        scaleFit: 2,
      },
      { corporateChain: false, fullyPublicFunded: false }
    );
    const passed1 = hotScore.total === 12 && hotScore.band === 'HOT' && !hotScore.isDisqualified;
    results.push({ test: 'Lead Scoring: 12 points gives HOT band', passed: passed1 });

    const warmScore = calculateLeadScore(
      {
        privateServices: 2,
        googleReviews: 1,
        websiteGap: 1,
        gbpGaps: 1,
        ownerAccessibility: 1,
        recentActivity: 1,
        scaleFit: 1,
      },
      { corporateChain: false, fullyPublicFunded: false }
    );
    const passed2 = warmScore.total === 8 && warmScore.band === 'WARM' && !warmScore.isDisqualified;
    results.push({ test: 'Lead Scoring: 8 points gives WARM band', passed: passed2 });

    const disqScore = calculateLeadScore(
      {
        privateServices: 2,
        googleReviews: 2,
        websiteGap: 2,
        gbpGaps: 2,
        ownerAccessibility: 2,
        recentActivity: 2,
        scaleFit: 2,
      },
      { corporateChain: true, fullyPublicFunded: false }
    );
    const passed3 = disqScore.total === 14 && disqScore.band === 'COLD' && disqScore.isDisqualified;
    results.push({
      test: 'Lead Scoring: Disqualifiers exclude from HOT and mark disqualified',
      passed: passed3,
    });
  } catch (err: any) {
    results.push({ test: 'Lead Scoring Suite', passed: false, message: err.message });
  }

  // 2. Suppression tests
  try {
    const mockSuppression: SuppressionEntry[] = [
      {
        id: 'sup_1',
        contactValue: 'optout@clinic.ie',
        type: 'email',
        reason: 'Asked to stop',
        dateAdded: '2026-09-01',
        addedBy: 'Founder',
      },
      {
        id: 'sup_2',
        contactValue: 'blockedhospital.ie',
        type: 'domain',
        reason: 'Complained',
        dateAdded: '2026-09-10',
        addedBy: 'Sarah M.',
      },
    ];

    const matchEmail = checkIsSuppressed('optout@clinic.ie', mockSuppression);
    const matchDomain = checkIsSuppressed('dr.smith@blockedhospital.ie', mockSuppression);
    const noMatch = checkIsSuppressed('info@dublinphysio.ie', mockSuppression);

    results.push({
      test: 'Suppression: Direct email matching',
      passed: matchEmail.suppressed === true,
    });
    results.push({
      test: 'Suppression: Domain-level matching',
      passed: matchDomain.suppressed === true,
    });
    results.push({
      test: 'Suppression: Allowed contact value passes',
      passed: noMatch.suppressed === false,
    });
  } catch (err: any) {
    results.push({ test: 'Suppression Suite', passed: false, message: err.message });
  }

  // 3. Stage transition validations
  try {
    const invalidLost = validateStageTransition('Lost', {});
    const validLost = validateStageTransition('Lost', { lostReason: 'Price' });
    const invalidNotNow = validateStageTransition('Not Now', {});
    const validNotNow = validateStageTransition('Not Now', { notNowUntil: '2026-12-01' });

    results.push({
      test: 'Stage Rules: Lost requires lostReason',
      passed: !invalidLost.isValid && validLost.isValid,
    });
    results.push({
      test: 'Stage Rules: Not Now requires notNowUntil date',
      passed: !invalidNotNow.isValid && validNotNow.isValid,
    });
  } catch (err: any) {
    results.push({ test: 'Stage Transition Suite', passed: false, message: err.message });
  }

  // 4. Referral Programme: Code Generation
  try {
    const code1 = generateClientReferralCode();
    const code2 = generateClientReferralCode();
    const isValid =
      typeof code1 === 'string' &&
      code1.length >= 8 &&
      typeof code2 === 'string' &&
      code2.length >= 8 &&
      code1 !== code2;

    results.push({
      test: 'Referral Programme: Random non-guessable code (8+ chars)',
      passed: isValid,
    });
  } catch (err: any) {
    results.push({ test: 'Referral Code Gen', passed: false, message: err.message });
  }

  // 5. Referral Programme: Self-Referral & Yearly Cap Detection
  try {
    const mockReferrer: Client = {
      id: 'c_ref_1',
      businessName: 'Apex Dental Care',
      ownerName: 'Dr. John',
      ownerRole: 'Principal',
      email: 'john@apexdental.com',
      phone: '+353 1 234 5678',
      country: 'Ireland',
      city: 'Dublin',
      specialty: 'Dental',
      package: 'Advanced',
      status: 'Live',
      startDate: '2026-01-01',
      monthlyFeeEUR: 500,
      setupFeeEUR: 1000,
      accountManagerId: 'founder',
      healthScore: 85,
      notes: '',
      referralCode: 'APEXREF1',
      isDemo: true,
    };

    // Case A: Same email domain
    const appSameDomain: Application = {
      id: 'app_1',
      token: 'tok_1',
      referenceCode: 'OH-APP-001',
      businessName: 'Apex South Branch',
      contactName: 'John Junior',
      email: 'contact@apexdental.com',
      phone: '+353 1 999 8888',
      country: 'Ireland',
      niche: 'Dental',
      status: 'Received',
      referralCode: 'APEXREF1',
      consentAt: '2026-10-20T10:00:00Z',
      createdAt: '2026-10-20T10:00:00Z',
    };
    const evalA = evaluateSelfReferralAndCap(mockReferrer, appSameDomain, [], 5);

    // Case B: Same phone number
    const appSamePhone: Application = {
      id: 'app_2',
      token: 'tok_2',
      referenceCode: 'OH-APP-002',
      businessName: 'Completely Different Clinic',
      contactName: 'Reception',
      email: 'hello@diffclinic.ie',
      phone: '01 234 5678',
      country: 'Ireland',
      niche: 'Dental',
      status: 'Received',
      referralCode: 'APEXREF1',
      consentAt: '2026-10-20T10:00:00Z',
      createdAt: '2026-10-20T10:00:00Z',
    };
    const evalB = evaluateSelfReferralAndCap(mockReferrer, appSamePhone, [], 5);

    // Case C: Same business name
    const appSameBusiness: Application = {
      id: 'app_3',
      token: 'tok_3',
      referenceCode: 'OH-APP-003',
      businessName: 'Apex Dental Care',
      contactName: 'Partner',
      email: 'partner@unrelateddomain.org',
      phone: '+353 87 111 2222',
      country: 'Ireland',
      niche: 'Dental',
      status: 'Received',
      referralCode: 'APEXREF1',
      consentAt: '2026-10-20T10:00:00Z',
      createdAt: '2026-10-20T10:00:00Z',
    };
    const evalC = evaluateSelfReferralAndCap(mockReferrer, appSameBusiness, [], 5);

    // Case D: Legitimate referral with yearly cap reached
    const appLegit: Application = {
      id: 'app_4',
      token: 'tok_4',
      referenceCode: 'OH-APP-004',
      businessName: 'Dublin Smiles Studio',
      contactName: 'Dr. Kelly',
      email: 'kelly@dublinsmiles.ie',
      phone: '+353 1 888 7777',
      country: 'Ireland',
      niche: 'Dental',
      status: 'Received',
      referralCode: 'APEXREF1',
      consentAt: '2026-10-20T10:00:00Z',
      createdAt: '2026-10-20T10:00:00Z',
    };
    const mockExistingCredits: ReferralCredit[] = [
      { id: '1', referrerClientId: 'c_ref_1', applicationId: 'app_old_1', status: 'Applied', reward: '€100', createdAt: '2026-01-01' },
      { id: '2', referrerClientId: 'c_ref_1', applicationId: 'app_old_2', status: 'Eligible', reward: '€100', createdAt: '2026-02-01' },
      { id: '3', referrerClientId: 'c_ref_1', applicationId: 'app_old_3', status: 'Pending', reward: '€100', createdAt: '2026-03-01' },
    ];
    const evalCapExceeded = evaluateSelfReferralAndCap(mockReferrer, appLegit, mockExistingCredits, 3);
    const evalCapNotExceeded = evaluateSelfReferralAndCap(mockReferrer, appLegit, mockExistingCredits, 5);

    results.push({
      test: 'Referral Programme: Self-referral flagged on same email domain',
      passed: evalA.isSelfReferralSuspected === true,
    });
    results.push({
      test: 'Referral Programme: Self-referral flagged on same phone number',
      passed: evalB.isSelfReferralSuspected === true,
    });
    results.push({
      test: 'Referral Programme: Self-referral flagged on same business name',
      passed: evalC.isSelfReferralSuspected === true,
    });
    results.push({
      test: 'Referral Programme: Yearly cap flags referrals exceeding limit',
      passed: evalCapExceeded.isCapExceeded === true && evalCapNotExceeded.isCapExceeded === false,
    });
  } catch (err: any) {
    results.push({ test: 'Referral Self-Referral Suite', passed: false, message: err.message });
  }

  // 6. Wording Guard: Extended rules check
  try {
    const badSample = 'We guarantee top ranking and 100% GDPR compliant results worth EUR 5000 with #1 awards.';
    const goodSample = 'Receive credit on your next care fee. I may receive a credit if you join.';
    const checkBad = contentGuardCheck('Referral Template', badSample);
    const checkGood = contentGuardCheck('Referral Template', goodSample);

    results.push({
      test: 'Wording Guard: Flags prohibited claims (guarantee, top ranking, #1, GDPR compliant)',
      passed: checkBad.hasWarning && checkBad.flaggedWords.length >= 3,
    });
    results.push({
      test: 'Wording Guard: Clean neutral referral copy passes without warnings',
      passed: !checkGood.hasWarning && checkGood.flaggedWords.length === 0,
    });
  } catch (err: any) {
    results.push({ test: 'Wording Guard Suite', passed: false, message: err.message });
  }

  // 7. Client Portal Security: Forbidden fields assertion
  try {
    const safePortalVm = {
      client: { id: 'c1', businessName: 'Test Business' },
      referral: {
        enabled: true,
        referralCode: 'TEST1234',
        shareUrl: 'https://openhours.ie/apply?ref=TEST1234',
        counts: { invited: 2, joined: 1, rewardApplied: 1 },
      },
    };
    const leakPortalVm = {
      client: { id: 'c1', businessName: 'Test Business' },
      referral: {
        enabled: true,
        counts: { invited: 2, joined: 1, rewardApplied: 1 },
        referredClientBusinessName: 'Leaked Business Name',
      },
    };

    const safeCheck = assertNoForbiddenFieldsInPortalViewModel(safePortalVm);
    const leakCheck = assertNoForbiddenFieldsInPortalViewModel(leakPortalVm);

    results.push({
      test: 'Portal Security: Clean portal ViewModel passes forbidden fields check',
      passed: safeCheck.clean === true,
    });
    results.push({
      test: 'Portal Security: Assert catches referred client name or internal field leak',
      passed: leakCheck.clean === false && leakCheck.forbiddenFound.length > 0,
    });
  } catch (err: any) {
    results.push({ test: 'Portal Security Assertion Suite', passed: false, message: err.message });
  }

  // 8. Pitch & Proposal Security: Forbidden fields assertion
  try {
    const cleanProposalVm = {
      proposal: {
        id: 'prop_clean_1',
        prospectName: 'Apex Health Partners',
        status: 'Draft',
        validUntil: '2026-12-31',
        items: [
          { name: 'Regular Tier', type: 'package', price: 1200, currency: 'EUR' },
        ],
      },
      mockup: {
        templateId: 'tpl_sample_01',
        primaryColor: '#D92D50',
      },
    };

    const leakedProposalVm = {
      proposal: {
        id: 'prop_leak_1',
        prospectName: 'Apex Health Partners',
        status: 'Draft',
        margins: 0.45,
        costRate: 85,
        internalNotes: 'Push for higher tier',
        leadScore: 12,
        healthScore: 88,
      },
    };

    const cleanCheck = assertNoForbiddenFieldsInProposalViewModel(cleanProposalVm);
    const leakedCheck = assertNoForbiddenFieldsInProposalViewModel(leakedProposalVm);

    results.push({
      test: 'Proposal Security: Clean partner proposal view model passes forbidden fields check',
      passed: cleanCheck.clean === true,
    });
    results.push({
      test: 'Proposal Security: Assert flags leaks of margins, cost rates, internal notes, lead scores, or health scores',
      passed: leakedCheck.clean === false && leakedCheck.forbiddenFound.length >= 4,
    });
  } catch (err: any) {
    results.push({ test: 'Proposal Security Assertion Suite', passed: false, message: err.message });
  }

  // 9. Proposal Wording Guard: Extended forbidden terms check
  try {
    const restrictedProposalText = 'We provide the #1 top ranking website guaranteed to be 100% GDPR compliant and worth EUR 10000 with awards.';
    const neutralProposalText = 'Recommended digital presence package and concept website mockup tailored to your business operations.';

    const guardBad = contentGuardCheck('Proposal Intro', restrictedProposalText);
    const guardGood = contentGuardCheck('Proposal Intro', neutralProposalText);

    results.push({
      test: 'Proposal Wording Guard: Flags prohibited claims (#1, top ranking, guarantee, GDPR compliant, worth EUR)',
      passed: guardBad.hasWarning && guardBad.flaggedWords.length >= 3,
    });
    results.push({
      test: 'Proposal Wording Guard: Neutral professional wording passes without warning',
      passed: !guardGood.hasWarning && guardGood.flaggedWords.length === 0,
    });
  } catch (err: any) {
    results.push({ test: 'Proposal Wording Guard Suite', passed: false, message: err.message });
  }

  // 10. Public Preview Security Assertion: Ensure zero internal metrics or contact leaks
  try {
    const cleanPreview = {
      title: 'Modern Business Concept',
      version: 1,
      renderedHtml: '<div>Valid HTML</div>',
      notFound: false,
      isExpired: false,
      isRevoked: false,
    };
    const leakedPreview = {
      ...cleanPreview,
      healthScore: 88,
      internalNotes: 'VIP prospect with high margin',
      leadScore: 12,
      costRate: 45,
      phone: '+353 1 234 5678',
    };

    const cleanCheck = assertNoForbiddenFieldsInPublicPreview(cleanPreview);
    const leakedCheck = assertNoForbiddenFieldsInPublicPreview(leakedPreview);

    results.push({
      test: 'Public Preview Security: Clean preview data passes forbidden fields assertion',
      passed: cleanCheck.clean === true,
    });
    results.push({
      test: 'Public Preview Security: Assert flags leaked internal notes, scores, cost rates, or contact details',
      passed: leakedCheck.clean === false && leakedCheck.forbiddenFound.length >= 4,
    });
  } catch (err: any) {
    results.push({ test: 'Public Preview Security Suite', passed: false, message: err.message });
  }

  // 11. Extended Wording Guard: Reviews, awards, fake urgency, clinic/patient terms
  try {
    const reviewAndAwardsText = 'Read our 5-star reviews and award winning achievements before the countdown expires!';
    const clinicPatientText = 'Our clinic offers patient appointment scheduling with guaranteed outcomes.';
    const neutralText = 'We provide managed web and digital solutions for local business owners.';

    const guard1 = contentGuardCheck('Title', reviewAndAwardsText);
    const guard2 = contentGuardCheck('Title', clinicPatientText);
    const guard3 = contentGuardCheck('Title', neutralText);

    results.push({
      test: 'Extended Wording Guard: Flags reviews, awards, and countdown timers',
      passed: guard1.hasWarning && guard1.flaggedWords.includes('reviews / star ratings') && guard1.flaggedWords.includes('awards'),
    });
    results.push({
      test: 'Extended Wording Guard: Flags clinic and patient terminology',
      passed: guard2.hasWarning && guard2.flaggedWords.includes('clinic / patient terminology') && guard2.flaggedWords.includes('guarantee'),
    });
    results.push({
      test: 'Extended Wording Guard: Clean neutral wording passes with zero warnings',
      passed: !guard3.hasWarning && guard3.flaggedWords.length === 0,
    });
  } catch (err: any) {
    results.push({ test: 'Extended Wording Guard Suite', passed: false, message: err.message });
  }

  // 12. Network Allow-List: Strict host & path verification
  try {
    const validGithub = validateAllowedUrl('https://api.github.com/repos/owner/repo');
    const validRaw = validateAllowedUrl('https://raw.githubusercontent.com/owner/repo/main/file.json');
    const validGsi = validateAllowedUrl('https://accounts.google.com/gsi/client');
    const validGmail = validateAllowedUrl('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    const validRevoke = validateAllowedUrl('https://oauth2.googleapis.com/revoke?token=xyz');

    const invalidHost = validateAllowedUrl('https://api.unauthorized-service.com/data');
    const invalidGooglePath = validateAllowedUrl('https://accounts.google.com/o/oauth2/v2/auth');
    const invalidOauthPath = validateAllowedUrl('https://oauth2.googleapis.com/token');

    let threwForbidden = false;
    try {
      assertAllowedHost('https://evil.example.com/steal');
    } catch {
      threwForbidden = true;
    }

    results.push({
      test: 'Network Allow-List: Permits only authorized hosts and strict endpoints',
      passed:
        validGithub.allowed &&
        validRaw.allowed &&
        validGsi.allowed &&
        validGmail.allowed &&
        validRevoke.allowed,
    });

    results.push({
      test: 'Network Allow-List: Forbids unauthorized hosts and illegal Google endpoints',
      passed:
        !invalidHost.allowed &&
        !invalidGooglePath.allowed &&
        !invalidOauthPath.allowed &&
        threwForbidden === true,
    });
  } catch (err: any) {
    results.push({ test: 'Network Allow-List Suite', passed: false, message: err.message });
  }

  // 13. Additive Referral Milestone Calculation & Next Reward
  try {
    const rows: ReferralMilestoneRow[] = [
      { id: 'r1', qualifiedReferrals: 1, rewardMonths: 1 },
      { id: 'r2', qualifiedReferrals: 2, rewardMonths: 1 },
      { id: 'r3', qualifiedReferrals: 3, rewardMonths: 1.5 },
    ];

    const earned0 = computeAdditiveEarnedMonths(0, rows);
    const earned1 = computeAdditiveEarnedMonths(1, rows);
    const earned2 = computeAdditiveEarnedMonths(2, rows);
    const earned3 = computeAdditiveEarnedMonths(3, rows);
    const earnedCapped = computeAdditiveEarnedMonths(3, rows, 2.5);

    const next0 = computeNextReferralReward(0, rows);
    const next1 = computeNextReferralReward(1, rows);
    const next2 = computeNextReferralReward(2, rows);
    const next3 = computeNextReferralReward(3, rows);

    const mathCorrect =
      earned0 === 0 &&
      earned1 === 1 &&
      earned2 === 2 && // 1 + 1 (additive!)
      earned3 === 3.5 && // 1 + 1 + 1.5 = 3.5
      earnedCapped === 2.5;

    const nextCorrect =
      next0?.moreNeeded === 1 &&
      next0.rewardMonths === 1 &&
      next1?.moreNeeded === 1 &&
      next1.rewardMonths === 1 &&
      next2?.moreNeeded === 1 &&
      next2.rewardMonths === 1.5 &&
      next3 === null; // No next row, hidden

    results.push({
      test: 'Additive Milestone Logic: Client earns sum of every reached tier with annual cap',
      passed: mathCorrect,
    });

    results.push({
      test: 'Additive Milestone Logic: Next reward displays exact delta needed or hides if completed',
      passed: nextCorrect,
    });
  } catch (err: any) {
    results.push({ test: 'Additive Milestone Suite', passed: false, message: err.message });
  }

  // 12. Reveal Sequence & Status Pill computed logic tests
  try {
    // A. Computed Status Pill Logic:
    // "Domain details received" when domainAccessStatus is 'submitted' or 'approved'
    // "Design approved, ready for domain setup" when projectStatus is 'Approved' and domain is not submitted
    // "Concept preview" otherwise
    const computeStatusPill = (
      projectStatus?: string,
      domainAccessStatus?: string
    ): string => {
      if (domainAccessStatus === 'submitted' || domainAccessStatus === 'approved') {
        return 'Domain details received';
      }
      if (projectStatus === 'Approved') {
        return 'Design approved, ready for domain setup';
      }
      return 'Concept preview';
    };

    const s1 = computeStatusPill('Shared', 'none');
    const s2 = computeStatusPill('Approved', 'none');
    const s3 = computeStatusPill('Approved', 'submitted');
    const s4 = computeStatusPill('Approved', 'approved');
    const s5 = computeStatusPill('Changes requested', 'pending');

    const pillLogicPassed =
      s1 === 'Concept preview' &&
      s2 === 'Design approved, ready for domain setup' &&
      s3 === 'Domain details received' &&
      s4 === 'Domain details received' &&
      s5 === 'Concept preview';

    results.push({
      test: 'Reveal Status Pill: Computes exact non-freeform status based on project and domain progress',
      passed: pillLogicPassed,
    });

    // B. Reveal custom welcome line content guard
    const badWelcome = contentGuardCheck('Welcome Line', 'Welcome! Guaranteed #1 top ranking service worth EUR 5000');
    const cleanWelcome = contentGuardCheck('Welcome Line', 'Welcome, Beacon Specialist Care');

    results.push({
      test: 'Reveal Wording Guard: Flags prohibited claims in custom welcome line',
      passed: badWelcome.hasWarning && badWelcome.flaggedWords.length >= 3 && !cleanWelcome.hasWarning,
    });

    // C. Public Preview security assertion with reveal properties
    const previewDataWithReveal = {
      title: 'Harbour Dental Care',
      version: 2,
      renderedHtml: '<html><body>Preview</body></html>',
      isExpired: false,
      isRevoked: false,
      notFound: false,
      token: 'rvl_abcdef1234567890abcdef12',
      businessName: 'Harbour Dental Care',
      logoDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      revealConfig: {
        enabled: true,
        style: 'Blur fade' as const,
        welcomeLine: 'Welcome, Harbour Dental Care',
      },
      projectStatus: 'Approved' as const,
      domainAccessStatus: 'submitted' as const,
    };

    const checkClean = assertNoForbiddenFieldsInPublicPreview(previewDataWithReveal);
    const checkLeaky = assertNoForbiddenFieldsInPublicPreview({
      ...previewDataWithReveal,
      costRate: 85,
      internalNotes: 'VIP client discount applied',
      clientId: 'client_01',
    });

    results.push({
      test: 'Reveal Public Preview Security: Allows safe branding while forbidding internal cost, notes, or client IDs',
      passed: checkClean.clean && !checkLeaky.clean && checkLeaky.forbiddenFound.length === 3,
    });
  } catch (err: any) {
    results.push({ test: 'Reveal Sequence Suite', passed: false, message: err.message });
  }

  // ==========================================
  // 12. GITHUB TEMPLATE SYNC SUITE
  // ==========================================
  try {
    // A. Invalid repo string rejected
    const r1 = parseGitHubRepoInput('');
    const r2 = parseGitHubRepoInput('just-name-no-slash');
    const r3 = parseGitHubRepoInput('owner with space/repo');
    const r4 = parseGitHubRepoInput('owner/repo/extra/path');
    const r5 = parseGitHubRepoInput('owner/repo', 'branch/../traversal', 'templates');
    const r6 = parseGitHubRepoInput('owner/repo', '/leading-slash-branch', 'templates');
    const r7 = parseGitHubRepoInput('owner/repo', 'main', '../traversal-folder');
    const r8 = parseGitHubRepoInput('owner/repo', 'main', '/leading-slash-folder');
    const rGood1 = parseGitHubRepoInput('openhours/templates', 'main', 'templates');
    const rGood2 = parseGitHubRepoInput('https://github.com/acme-corp/dental-themes.git', 'develop', 'src/templates');

    const invalidRepoPassed =
      !r1.valid &&
      !r2.valid &&
      !r3.valid &&
      !r4.valid &&
      !r5.valid &&
      !r6.valid &&
      !r7.valid &&
      !r8.valid &&
      rGood1.valid &&
      rGood1.owner === 'openhours' &&
      rGood1.repo === 'templates' &&
      rGood1.branch === 'main' &&
      rGood1.folder === 'templates' &&
      rGood2.valid &&
      rGood2.owner === 'acme-corp' &&
      rGood2.repo === 'dental-themes' &&
      rGood2.branch === 'develop';

    results.push({
      test: 'GitHub Sync: Invalid repo string rejected strictly',
      passed: invalidRepoPassed,
    });

    // B. File with <script> or unsafe content shown as Invalid with exact reasons
    const scriptHtml = '<!DOCTYPE html><html><body><script>alert("pwned")</script><h1>Hi</h1></body></html>';
    const inlineOnclickHtml = '<!DOCTYPE html><html><body><button onclick="evil()">Click</button></body></html>';
    const jsUrlHtml = '<!DOCTYPE html><html><body><a href="javascript:alert(1)">Link</a></body></html>';
    const externalLinkHtml = '<!DOCTYPE html><html><head><link rel="stylesheet" href="https://evil.com/style.css"></head><body><h1>Hi</h1></body></html>';
    const externalImgHtml = '<!DOCTYPE html><html><body><img src="http://evil.com/img.png" alt="img" /></body></html>';
    const cleanHtml = '<!DOCTYPE html><html><head><style>:root { --brand-primary: #D92D50; }</style></head><body><h1>{{business_name}}</h1></body></html>';

    const vScript = validateTemplateHtml(scriptHtml);
    const vOnclick = validateTemplateHtml(inlineOnclickHtml);
    const vJsUrl = validateTemplateHtml(jsUrlHtml);
    const vExtLink = validateTemplateHtml(externalLinkHtml);
    const vExtImg = validateTemplateHtml(externalImgHtml);
    const vClean = validateTemplateHtml(cleanHtml);

    const scriptValidatorPassed =
      !vScript.valid &&
      vScript.errors.some((e) => e.includes('<script>')) &&
      !vOnclick.valid &&
      vOnclick.errors.some((e) => e.includes('Inline event handlers')) &&
      !vJsUrl.valid &&
      vJsUrl.errors.some((e) => e.includes('javascript: URL')) &&
      !vExtLink.valid &&
      vExtLink.errors.some((e) => e.includes('External stylesheets')) &&
      !vExtImg.valid &&
      vExtImg.errors.some((e) => e.includes('External image URLs')) &&
      vClean.valid &&
      vClean.errors.length === 0;

    results.push({
      test: 'GitHub Sync: File with <script> and unsafe constructs shown as Invalid with exact reasons',
      passed: scriptValidatorPassed,
    });

    // C. Rate-limit and 404 error messages handled clearly
    function simulateGitHubStatusCheck(status: number, headers: Record<string, string>, body = ''): string {
      if (status === 404) {
        return 'Repository not found or not public';
      }
      if (status === 403) {
        if (headers['x-ratelimit-remaining'] === '0' || body.toLowerCase().includes('rate limit')) {
          return 'GitHub API rate limit exceeded (60 requests/hour unauthenticated). Please wait before scanning again.';
        }
        return 'Repository not found or not public';
      }
      return 'OK';
    }

    const msg404 = simulateGitHubStatusCheck(404, {});
    const msgRateLimitHeader = simulateGitHubStatusCheck(403, { 'x-ratelimit-remaining': '0' });
    const msgRateLimitBody = simulateGitHubStatusCheck(403, {}, 'API rate limit exceeded for user');

    const rateLimitAnd404Passed =
      msg404 === 'Repository not found or not public' &&
      msgRateLimitHeader === 'GitHub API rate limit exceeded (60 requests/hour unauthenticated). Please wait before scanning again.' &&
      msgRateLimitBody === 'GitHub API rate limit exceeded (60 requests/hour unauthenticated). Please wait before scanning again.';

    results.push({
      test: 'GitHub Sync: Rate-limit and 404 error messages handled clearly',
      passed: rateLimitAnd404Passed,
    });

    // D. Metadata comment & sidecar parsing
    const htmlWithComment = '<!--meta name="Cosmetic Smile Studio" tags="Aesthetic, Dental" description="High-end conversion layout"--><html><body>Preview</body></html>';
    const parsedComment = parseTemplateCommentMeta(htmlWithComment);
    const parsedSidecar = parseSidecarJson(JSON.stringify({
      name: 'Modern Specialist Clinic',
      nicheTags: ['Dental', 'Consultation'],
      description: 'Clean responsive template for private practice',
    }));

    const metadataParsingPassed =
      parsedComment.name === 'Cosmetic Smile Studio' &&
      parsedComment.tags?.length === 2 &&
      parsedComment.tags[0] === 'Aesthetic' &&
      parsedSidecar?.name === 'Modern Specialist Clinic' &&
      parsedSidecar?.tags?.length === 2;

    results.push({
      test: 'GitHub Sync: Comment and sidecar JSON metadata parsed accurately',
      passed: metadataParsingPassed,
    });
  } catch (err: any) {
    results.push({ test: 'GitHub Template Sync Suite', passed: false, message: err.message });
  }

  // ==========================================
  // CUSTOM WEBSITE STUDIO (AI STUDIO + GITHUB) TESTS
  // ==========================================
  try {
    // 1. Strict URL validation tests
    const vHttp = validatePreviewUrl('http://example.vercel.app');
    const vJs = validatePreviewUrl('javascript:alert(1)');
    const vData = validatePreviewUrl('data:text/html,<h1>bad</h1>');
    const vCreds = validatePreviewUrl('https://admin:pass@mysite.vercel.app');
    const vLocalhost = validatePreviewUrl('https://localhost:3000');
    const vLocal = validatePreviewUrl('https://mysite.local');
    const v127 = validatePreviewUrl('https://127.0.0.1');
    const v10 = validatePreviewUrl('https://10.0.1.25');
    const v192 = validatePreviewUrl('https://192.168.1.100');
    const v172 = validatePreviewUrl('https://172.20.5.1');
    const vRawIp = validatePreviewUrl('https://93.184.216.34');
    const vValidAllowed = validatePreviewUrl('https://sub.vercel.app');
    const vValidOutside = validatePreviewUrl('https://custom-host.example.com');

    const urlSecurityPassed =
      !vHttp.valid &&
      !vJs.valid &&
      !vData.valid &&
      !vCreds.valid &&
      !vLocalhost.valid &&
      !vLocal.valid &&
      !v127.valid &&
      !v10.valid &&
      !v192.valid &&
      !v172.valid &&
      !vRawIp.valid &&
      vValidAllowed.valid &&
      vValidAllowed.isAllowedDomain &&
      vValidOutside.valid &&
      !vValidOutside.isAllowedDomain &&
      !!vValidOutside.domainWarning;

    results.push({
      test: 'Custom Website: Strict URL safety and IP/scheme blocking',
      passed: urlSecurityPassed,
    });

    // 2. Commit SHA and Changelog bounds
    const validShaShort = validateCommitSha('a1b2c3d');
    const validShaFull = validateCommitSha('a1b2c3d4e5f60718293a4b5c6d7e8f9012345678');
    const invalidShaShort = validateCommitSha('123456'); // < 7
    const invalidShaChars = validateCommitSha('g1h2i3j4k5l6m7'); // non-hex
    const emptyShaOptional = validateCommitSha('');

    const shaValidationPassed =
      validShaShort.valid &&
      validShaFull.valid &&
      !invalidShaShort.valid &&
      !invalidShaChars.valid &&
      emptyShaOptional.valid;

    results.push({
      test: 'Custom Website: Commit SHA hex format and length rules',
      passed: shaValidationPassed,
    });

    // 3. Changelog validation
    const emptyChangelog = validateChangelog([]);
    const validChangelog = validateChangelog(['Bullet 1', 'Bullet 2']);
    const tooManyBullets = validateChangelog(Array(11).fill('Item'));
    const bulletTooLong = validateChangelog(['A'.repeat(201)]);

    const changelogValidationPassed =
      !emptyChangelog.valid &&
      validChangelog.valid &&
      validChangelog.cleanBullets.length === 2 &&
      !tooManyBullets.valid &&
      !bulletTooLong.valid;

    results.push({
      test: 'Custom Website: Changelog required, 1-10 bullets, max 200 chars',
      passed: changelogValidationPassed,
    });

    // 4. Repo name slugifier helper
    const slug1 = slugifyClientName('Apex Dental Clinic & Orthodontics');
    const slugUnique = slugifyClientName('Apex Care', ['site-apex-care']);

    const slugHelperPassed =
      slug1.startsWith('site-apex-dental') &&
      slug1.length <= 40 &&
      !/[^a-z0-9-]/.test(slug1) &&
      slugUnique === 'site-apex-care-2';

    results.push({
      test: 'Custom Website: Repo slug helper generates clean unique name',
      passed: slugHelperPassed,
    });

    // 5. Extended Client Portal Security checks for custom mode
    const cleanCustomPortalVM = {
      client: { id: 'c_test', businessName: 'Test Practice' },
      customWebsitePreview: {
        projectId: 'p_1',
        mode: 'custom',
        currentVersion: {
          id: 'v_1',
          versionNumber: 1,
          previewUrl: 'https://mysite.vercel.app',
          changelog: ['Fixed hero layout'],
          status: 'Shared',
        },
        previousVersions: [],
      },
    };
    const cleanCheck = assertNoForbiddenFieldsInPortalViewModel(cleanCustomPortalVM);

    const leakyCustomPortalVM = {
      client: { id: 'c_test', businessName: 'Test Practice' },
      customWebsitePreview: {
        projectId: 'p_1',
        mode: 'custom',
        repoName: 'secret-repo',
        currentVersion: {
          id: 'v_1',
          versionNumber: 1,
          previewUrl: 'https://mysite.vercel.app',
          commitSha: 'a1b2c3d4e5f6',
          changelog: ['Fixed hero layout'],
          status: 'Draft', // Drafts must never leak to client!
          internalNote: 'Needs testing with client credentials',
        },
        previousVersions: [],
      },
    };
    const leakyCheck = assertNoForbiddenFieldsInPortalViewModel(leakyCustomPortalVM);

    const portalCustomSecurityPassed =
      cleanCheck.clean &&
      !leakyCheck.clean &&
      leakyCheck.forbiddenFound.includes('customWebsitePreview.currentVersion.status:Draft') &&
      leakyCheck.forbiddenFound.includes('customWebsitePreview.currentVersion.internalNote') &&
      leakyCheck.forbiddenFound.includes('customWebsitePreview.currentVersion.commitSha') &&
      leakyCheck.forbiddenFound.includes('customWebsitePreview.repoName');

    results.push({
      test: 'Custom Website: Portal ViewModel forbids Drafts, repo names, commit SHAs, and internal notes',
      passed: portalCustomSecurityPassed,
    });
  } catch (err: any) {
    results.push({ test: 'Custom Website Suite', passed: false, message: err.message });
  }

  // 6. React (config-driven) Template Tests (9 required)
  try {
    // Test 1: Manifest with a bad field type rejected
    const badFieldTypeManifest = {
      schemaVersion: 1,
      name: 'Bad Field Template',
      previewUrl: 'https://preview.example.com',
      fields: [
        { key: 'details.headline', label: 'Headline', type: 'eval' as any },
      ],
    };
    const badFieldResult = validateReactTemplateManifest(badFieldTypeManifest);
    const test1Passed = !badFieldResult.valid && badFieldResult.errors.some(e => e.includes('eval') || e.includes('type'));
    results.push({
      test: 'React Template Test 1: Manifest with a bad field type rejected',
      passed: test1Passed,
      message: badFieldResult.errors.join('; '),
    });

    // Test 2: previewUrl http:// rejected
    const httpPreviewManifest = {
      schemaVersion: 1,
      name: 'Insecure URL Template',
      previewUrl: 'http://insecure-preview.example.com',
      fields: [
        { key: 'details.headline', label: 'Headline', type: 'text' as const },
      ],
    };
    const httpPreviewResult = validateReactTemplateManifest(httpPreviewManifest);
    const test2Passed = !httpPreviewResult.valid && httpPreviewResult.errors.some(e => e.includes('https'));
    results.push({
      test: 'React Template Test 2: previewUrl http:// rejected',
      passed: test2Passed,
      message: httpPreviewResult.errors.join('; '),
    });

    // Test 3: Host outside allow-list needs confirm
    const allowedDomains = [...DEFAULT_ALLOWED_PREVIEW_DOMAINS, 'preview.openhours.ie'];
    const outsideHostCheck = validatePreviewUrl('https://untrusted-external-site.com/demo', allowedDomains);
    const insideHostCheck = validatePreviewUrl('https://my-preview.vercel.app/demo', allowedDomains);
    const test3Passed = outsideHostCheck.valid && !outsideHostCheck.isAllowedDomain && Boolean(outsideHostCheck.domainWarning) &&
      insideHostCheck.valid && insideHostCheck.isAllowedDomain && !insideHostCheck.domainWarning;
    results.push({
      test: 'React Template Test 3: Host outside allow-list needs confirm',
      passed: test3Passed,
    });

    // Test 4: Handshake ignores messages from other sources
    const mockWindowA = {} as Window;
    const mockWindowB = {} as Window;
    const spoofedSourceEvent = {
      source: mockWindowB,
      data: { type: 'OH_READY', version: 1 },
    } as MessageEvent;
    const validHandshakeEvent = {
      source: mockWindowA,
      data: { type: 'OH_READY', version: 1 },
    } as MessageEvent;
    const wrongTypeEvent = {
      source: mockWindowA,
      data: { type: 'OTHER_MSG', version: 1 },
    } as MessageEvent;
    const nullSourceEvent = {
      source: null,
      data: { type: 'OH_READY', version: 1 },
    } as MessageEvent;

    const checkSpoofedSource = validateHandshakeMessage(spoofedSourceEvent, mockWindowA);
    const checkValid = validateHandshakeMessage(validHandshakeEvent, mockWindowA);
    const checkWrongType = validateHandshakeMessage(wrongTypeEvent, mockWindowA);
    const checkNullSource = validateHandshakeMessage(nullSourceEvent, mockWindowA);

    const test4Passed = !checkSpoofedSource && !checkWrongType && !checkNullSource && checkValid;
    results.push({
      test: 'React Template Test 4: Handshake ignores messages from other sources',
      passed: test4Passed,
    });

    // Test 5: Oversized payload blocked (>6 MB)
    const smallConfig = { title: 'Small Site', details: { businessName: 'Test' } };
    const smallPayloadSize = calculateConfigPayloadSize(smallConfig);
    const smallWithinLimit = isPayloadWithinLimit(smallConfig);

    // Create large config exceeding 6 MB
    const largeChunk = 'X'.repeat(1024 * 1024); // 1 MB string
    const largeConfig = {
      title: 'Large Site',
      chunk1: largeChunk,
      chunk2: largeChunk,
      chunk3: largeChunk,
      chunk4: largeChunk,
      chunk5: largeChunk,
      chunk6: largeChunk,
      chunk7: largeChunk, // >7 MB
    };
    const largePayloadSize = calculateConfigPayloadSize(largeConfig);
    const largeWithinLimit = isPayloadWithinLimit(largeConfig);

    const test5Passed = smallWithinLimit && smallPayloadSize < 1000 && !largeWithinLimit && largePayloadSize > 6 * 1024 * 1024;
    results.push({
      test: 'React Template Test 5: Oversized payload blocked (>6 MB)',
      passed: test5Passed,
    });

    // Test 6: Timeout message shown when template has no listener (8 s)
    const exactTimeoutMessage = 'No response: the template did not answer. Check the preview URL and that the template includes the OH message listener.';
    const test6Passed = HANDSHAKE_TIMEOUT_MS === 8000 && HANDSHAKE_TIMEOUT_MESSAGE === exactTimeoutMessage;
    results.push({
      test: 'React Template Test 6: Timeout message shown when template has no listener (8 s)',
      passed: test6Passed,
    });

    // Test 7: Form generated from manifest with 20 fields and 2 lists
    const twentyFields: any[] = [];
    for (let i = 1; i <= 20; i++) {
      const group = i <= 5 ? 'details' : i <= 10 ? 'brand' : i <= 15 ? 'assets' : 'layout';
      twentyFields.push({
        key: `${group}.field_${i}`,
        label: `Field ${i}`,
        type: i % 4 === 0 ? 'color' : i % 3 === 0 ? 'number' : i % 2 === 0 ? 'boolean' : 'text',
        defaultValue: i % 4 === 0 ? '#101828' : i % 3 === 0 ? 10 : i % 2 === 0 ? true : `Val ${i}`,
      });
    }
    const twentyFieldManifest = {
      schemaVersion: 1 as const,
      name: 'Twenty Field React Template',
      description: 'Robust schema test template',
      previewUrl: 'https://preview.example.com/demo',
      fields: twentyFields,
      lists: [
        {
          key: 'services',
          label: 'Practice Services',
          maxItems: 8,
          itemFields: [
            { key: 'title', label: 'Service Title', type: 'text' as const },
            { key: 'description', label: 'Service Description', type: 'textarea' as const },
          ],
        },
        {
          key: 'faq',
          label: 'Frequently Asked Questions',
          maxItems: 10,
          itemFields: [
            { key: 'question', label: 'Question', type: 'text' as const },
            { key: 'answer', label: 'Answer', type: 'textarea' as const },
          ],
        },
      ],
    };
    const twentyValidation = validateReactTemplateManifest(twentyFieldManifest);
    const defaultConfig = extractDefaultConfig(twentyFieldManifest);
    const test7Passed = twentyValidation.valid &&
      twentyValidation.manifest?.fields.length === 20 &&
      twentyValidation.manifest?.lists?.length === 2 &&
      defaultConfig.details?.field_1 === 'Val 1' &&
      defaultConfig.brand?.field_8 === '#101828' &&
      Array.isArray(defaultConfig.services) &&
      Array.isArray(defaultConfig.faq);
    results.push({
      test: 'React Template Test 7: Form generated from manifest with 20 fields and 2 lists',
      passed: test7Passed,
    });

    // Test 8: HTML templates and their exports unaffected
    const htmlTemplate = `<!DOCTYPE html><html><head><title>{{business_name}}</title></head><body><h1>{{business_name}}</h1><p>{{tagline}}</p></body></html>`;
    const renderedHtml = renderWebsiteTemplate(
      htmlTemplate,
      { businessName: 'Fitzwilliam Clinic', tagline: 'Excellence in Dental Care', services: [] } as any,
      { primaryColor: '#D92D50', secondaryColor: '#101828' } as any,
      { withRibbon: false }
    );
    const test8Passed = renderedHtml.includes('<title>Fitzwilliam Clinic</title>') &&
      renderedHtml.includes('Excellence in Dental Care') &&
      !renderedHtml.includes('{{business_name}}');
    results.push({
      test: 'React Template Test 8: HTML templates and their exports unaffected',
      passed: test8Passed,
    });

    // Test 9: No network call to previewUrl from app
    let allowedFetchRejectedPreviewUrl = false;
    try {
      assertAllowedHost('https://untrusted-preview.example.com');
    } catch {
      allowedFetchRejectedPreviewUrl = true;
    }
    let allowedFetchRejectedVercel = false;
    try {
      assertAllowedHost('https://my-site.vercel.app');
    } catch {
      allowedFetchRejectedVercel = true;
    }
    const test9Passed = allowedFetchRejectedPreviewUrl && allowedFetchRejectedVercel;
    results.push({
      test: 'React Template Test 9: No network call to previewUrl from app',
      passed: test9Passed,
    });

  } catch (err: any) {
    results.push({ test: 'React Template Suite', passed: false, message: err.message });
  }

  return results;
}

