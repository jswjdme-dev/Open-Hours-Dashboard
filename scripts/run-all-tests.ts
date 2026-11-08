import { runUnitTests } from '../src/lib/logic.test.ts';
import {
  getPackagesSettings,
  updatePackagesSettings,
  getProposals,
  getProposalById,
  saveProposal,
  updateProposalStatus,
  getPartnerPitchesAndProposals,
  assertNoForbiddenFieldsInProposalViewModel,
  addDemoPin,
  getDemoPins,
  addPinReply,
  updatePinStatus,
  createTasksFromOpenPins,
  generateProjectRevealToken,
  getPublicPreviewByToken,
  revokeProjectRevealToken,
  updateProjectRevealConfig,
  assertNoForbiddenFieldsInPublicPreview,
  getClientReferralDetails,
  recordReferralLedgerEntry,
  updateClientReferralOverride,
  getClientsWithRemainingReferralMonths,
  getClientPortalViewModel,
  updateClientPortalFeatureOverrides,
  getPortalPresets,
  applyPresetToClient,
  submitPartnerClient,
  saveTemplateSource,
  importTemplatesFromGitHub,
  saveWebsiteProject,
  getWebsiteProjectById,
  reRenderProjectWithLatestTemplate,
  getWebsiteTemplateById,
  updateWebsiteProjectMode,
  updateWebsiteProjectCustomSetup,
  saveCustomVersion,
  shareCustomVersion,
  approveCustomVersion,
  requestChangesCustomVersion,
  getCustomVersions,
  getCustomWebsiteAttentionItems,
  updateWebsiteProjectReactConfig,
} from '../src/data/repo.ts';

async function main() {
  console.log('--- RUNNING LOGIC & SECURITY UNIT TESTS ---');
  const unitResults = runUnitTests();
  let failures = 0;
  for (const r of unitResults) {
    if (r.passed) {
      console.log(`[PASS] ${r.test}`);
    } else {
      console.error(`[FAIL] ${r.test} - ${r.message || ''}`);
      failures++;
    }
  }

  console.log('\n--- RUNNING PACKAGES & PROPOSALS ASYNC REPO TESTS ---');

  // Test 1: getPackagesSettings returns 3 package tiers with "starting from" default prices
  try {
    const pkg = await getPackagesSettings();
    const hasPackages = pkg.packages && pkg.packages.length === 3;
    const tierNames = pkg.packages.map((t) => t.id);
    const hasCorrectTiers = tierNames.includes('regular') && tierNames.includes('advanced') && tierNames.includes('premium');
    const hasPrices = pkg.packages.every((t) => typeof t.startingPriceEUR === 'number' && t.startingPriceEUR > 0);
    const isStartingFrom = pkg.packages.every((t) => t.isStartingFrom === true);
    if (hasPackages && hasCorrectTiers && hasPrices && isStartingFrom) {
      console.log('[PASS] Repo: getPackagesSettings returns 3 valid tiers with default starting prices labelled "starting from"');
    } else {
      console.error('[FAIL] Repo: getPackagesSettings failed tier checks');
      failures++;
    }
  } catch (err: any) {
    console.error(`[FAIL] Repo: getPackagesSettings error: ${err.message}`);
    failures++;
  }

  // Test 2: updatePackagesSettings modifies tier feature lists and prices
  try {
    const existing = await getPackagesSettings();
    const updated = await updatePackagesSettings({
      ...existing,
      packages: existing.packages.map((t) =>
        t.id === 'regular'
          ? { ...t, startingPriceEUR: 1250, featureList: [...t.featureList, 'SEO baseline audit'] }
          : t
      ),
    });
    const regular = updated.packages.find((t) => t.id === 'regular');
    if (regular?.startingPriceEUR === 1250 && regular.featureList.includes('SEO baseline audit')) {
      console.log('[PASS] Repo: updatePackagesSettings updates tier pricing and feature lists');
    } else {
      console.error('[FAIL] Repo: updatePackagesSettings failed to persist updates');
      failures++;
    }
  } catch (err: any) {
    console.error(`[FAIL] Repo: updatePackagesSettings error: ${err.message}`);
    failures++;
  }

  // Test 3: saveProposal & getProposalById
  let createdPropId = '';
  try {
    const newProp = await saveProposal({
      prospectName: 'Test Medical Diagnostics Ltd',
      partnerId: 'partner_01',
      projectId: 'wp_test_1',
      items: [
        { id: 'regular', title: 'Regular Tier', type: 'package', price: 1250, currency: 'EUR' },
        { id: 'custom_1', title: 'Custom Domain Setup', type: 'custom', price: 200, currency: 'EUR' },
      ],
      validUntil: '2026-11-30',
      introText: 'Tailored proposal for digital clinic system.',
      status: 'Draft',
    });
    createdPropId = newProp.id;
    const retrieved = await getProposalById(createdPropId);
    if (retrieved && retrieved.prospectName === 'Test Medical Diagnostics Ltd' && retrieved.status === 'Draft') {
      console.log('[PASS] Repo: saveProposal successfully stores proposal and retrieves via getProposalById');
    } else {
      console.error('[FAIL] Repo: saveProposal or getProposalById failed');
      failures++;
    }
  } catch (err: any) {
    console.error(`[FAIL] Repo: saveProposal error: ${err.message}`);
    failures++;
  }

  // Test 4: updateProposalStatus lifecycle (Draft -> Shared -> Won)
  try {
    const shared = await updateProposalStatus(createdPropId, 'Shared', { sharedAt: new Date().toISOString() });
    if (!shared.sharedAt || shared.status !== 'Shared') {
      throw new Error('Shared transition failed');
    }

    const won = await updateProposalStatus(createdPropId, 'Won', { decidedAt: new Date().toISOString() });
    if (!won.decidedAt || won.status !== 'Won') {
      throw new Error('Won transition failed');
    }
    console.log('[PASS] Repo: updateProposalStatus correctly records lifecycle timestamps (Shared, Won)');
  } catch (err: any) {
    console.error(`[FAIL] Repo: updateProposalStatus error: ${err.message}`);
    failures++;
  }

  // Test 5: Partner privacy - getPartnerPitchesAndProposals returns only partner's own proposals
  try {
    const partnerData = await getPartnerPitchesAndProposals('partner_01');
    const allBelong = partnerData.proposals.every((p) => p.partnerId === 'partner_01');
    const forbiddenCheck = assertNoForbiddenFieldsInProposalViewModel(partnerData);
    if (allBelong && forbiddenCheck.clean) {
      console.log('[PASS] Repo: getPartnerPitchesAndProposals isolates partner data with zero forbidden fields leaked');
    } else {
      console.error('[FAIL] Repo: getPartnerPitchesAndProposals leaked data or failed partner isolation');
      failures++;
    }
  } catch (err: any) {
    console.error(`[FAIL] Repo: getPartnerPitchesAndProposals error: ${err.message}`);
    failures++;
  }

  // Test 6: Demo Pin Feedback Lifecycle (add pin, reply, resolve)
  try {
    const newPin = await addDemoPin({
      projectId: 'proj_demo_harbour_01',
      version: 1,
      devicePreset: 'desktop',
      xPercent: 55.4,
      yPercent: 32.1,
      sectionId: 'about',
      snippet: 'Dedicated practitioners serving the community',
      comment: 'Please adjust typography to 16px for better legibility.',
      authorRole: 'client',
      authorName: 'Liam Murphy',
    });

    if (!newPin.id || newPin.pinNumber < 1 || newPin.status !== 'Open' || newPin.xPercent !== 55.4) {
      throw new Error('Pin creation failed verification');
    }

    const reply = await addPinReply(newPin.id, 'Typography updated in stylesheet.', 'admin', 'Founder');
    if (reply.replies.length === 0 || reply.replies[0].comment !== 'Typography updated in stylesheet.') {
      throw new Error('Reply creation failed');
    }

    const resolved = await updatePinStatus(newPin.id, 'Resolved', 'Founder');
    if (resolved.status !== 'Resolved' || !resolved.resolvedAt) {
      throw new Error('Status resolution failed');
    }

    console.log('[PASS] Repo: Pin Feedback lifecycle (addDemoPin, addPinReply, updatePinStatus) operates cleanly');
  } catch (err: any) {
    console.error(`[FAIL] Repo: Pin Feedback lifecycle error: ${err.message}`);
    failures++;
  }

  // Test 7: Idempotent task creation from open pins
  try {
    const openPin = await addDemoPin({
      projectId: 'proj_demo_harbour_01',
      version: 1,
      devicePreset: 'mobile',
      xPercent: 20,
      yPercent: 60,
      sectionId: 'contact',
      snippet: 'Get in touch for consultation',
      comment: 'Ensure phone number link works on mobile devices.',
      authorRole: 'client',
      authorName: 'Liam Murphy',
    });

    const run1 = await createTasksFromOpenPins('proj_demo_harbour_01', 1, 'Admin');
    const run2 = await createTasksFromOpenPins('proj_demo_harbour_01', 1, 'Admin');

    if (run1.createdTasks.length >= 1 && run2.createdTasks.length === 0 && run2.skippedCount >= 1) {
      console.log('[PASS] Repo: createTasksFromOpenPins is fully idempotent (no duplicate tasks on repeated execution)');
    } else {
      console.error(`[FAIL] Repo: createTasksFromOpenPins failed idempotency: run1=${run1.createdTasks.length}, run2=${run2.createdTasks.length}, skipped=${run2.skippedCount}`);
      failures++;
    }
  } catch (err: any) {
    console.error(`[FAIL] Repo: createTasksFromOpenPins error: ${err.message}`);
    failures++;
  }

  // Test 8: Reveal Link Generation & Public Isolation
  try {
    // Configure reveal sequence on project
    await updateProjectRevealConfig('proj_demo_harbour_01', {
      enabled: true,
      style: 'Curtain split',
      welcomeLine: 'Welcome, Harbour Dental Care',
    }, 'Admin');

    const tokenObj = await generateProjectRevealToken('proj_demo_harbour_01', 30, 'Admin');
    if (!tokenObj.token || tokenObj.token.length < 24) {
      throw new Error(`Token too short or missing: ${tokenObj.token}`);
    }

    const previewData = await getPublicPreviewByToken(tokenObj.token);
    const forbiddenCheck = assertNoForbiddenFieldsInPublicPreview(previewData);

    if (previewData.notFound || previewData.isExpired || previewData.isRevoked || !previewData.renderedHtml) {
      throw new Error('Public preview failed to load valid website render');
    }

    if (previewData.revealConfig?.style !== 'Curtain split' || !previewData.revealConfig.enabled) {
      throw new Error(`Reveal configuration not loaded in public preview: ${JSON.stringify(previewData.revealConfig)}`);
    }

    if (!previewData.businessName) {
      throw new Error('Business name missing from public preview branding');
    }

    if (!forbiddenCheck.clean) {
      throw new Error(`Public preview leaked forbidden fields: ${forbiddenCheck.forbiddenFound.join(', ')}`);
    }

    // Revoke token
    await revokeProjectRevealToken(tokenObj.id, 'Admin');
    const revokedCheck = await getPublicPreviewByToken(tokenObj.token);
    if (!revokedCheck.isRevoked || revokedCheck.renderedHtml !== '') {
      throw new Error('Revoked token still accessible');
    }

    console.log('[PASS] Repo: Reveal Sequence (configure, token generate, public read, zero data leaks, revocation) fully verified');
  } catch (err: any) {
    console.error(`[FAIL] Repo: Reveal Link error: ${err.message}`);
    failures++;
  }

  // Test 9: Referral Ledger & Additive Computation
  try {
    const details = await getClientReferralDetails('client_01');
    if (!details.referralCode || details.referralCode.length < 8) {
      throw new Error('Missing or short referral code');
    }
    if (typeof details.earnedMonths !== 'number' || typeof details.remainingMonths !== 'number') {
      throw new Error('Invalid months calculation');
    }
    if (details.estimatedCostEUR !== details.remainingMonths * details.monthlyFeeEUR) {
      throw new Error('Estimated cost calculation mismatch');
    }

    // Record an adjustment
    const initialRemaining = details.remainingMonths;
    await recordReferralLedgerEntry('client_01', 'adjustment', 1.5, 'Special promotion credit', 'Admin');
    const updatedDetails = await getClientReferralDetails('client_01');
    if (updatedDetails.remainingMonths !== initialRemaining + 1.5) {
      throw new Error(`Adjustment failed to reflect in remaining months: expected ${initialRemaining + 1.5}, got ${updatedDetails.remainingMonths}`);
    }

    console.log('[PASS] Repo: Referral Ledger & Additive Calculation operates with verified integrity');
  } catch (err: any) {
    console.error(`[FAIL] Repo: Referral Ledger error: ${err.message}`);
    failures++;
  }

  // Test 10: Portal Feature Filtering & View Model Exclusion
  try {
    // Turn off 'files' and 'websitePreview' for client_01
    await updateClientPortalFeatureOverrides('client_01', {
      files: 'off',
      websitePreview: 'off',
      roiEstimator: 'off',
    }, 'Admin');

    const vmFiltered = await getClientPortalViewModel('client_01');
    if (!vmFiltered) throw new Error('Failed to load portal view model');

    if (vmFiltered.files.length !== 0) {
      throw new Error('Hidden feature "files" was not excluded from portal view model payload');
    }
    if (vmFiltered.websiteDemo !== null) {
      throw new Error('Hidden feature "websitePreview" was not excluded from portal view model payload');
    }
    if (vmFiltered.client.roiEstimatorEnabled !== false) {
      throw new Error('Hidden feature "roiEstimator" was not excluded from portal view model');
    }

    // Reset back to default
    await updateClientPortalFeatureOverrides('client_01', {
      files: 'default',
      websitePreview: 'default',
      roiEstimator: 'default',
    }, 'Admin');

    const vmRestored = await getClientPortalViewModel('client_01');
    if (!vmRestored || vmRestored.files.length === 0) {
      throw new Error('Restoring portal defaults failed');
    }

    console.log('[PASS] Repo: Portal Feature Control excludes hidden features from View Model payload');
  } catch (err: any) {
    console.error(`[FAIL] Repo: Portal Feature Control error: ${err.message}`);
    failures++;
  }

  // Test 11: Partner Add Client - Email Optional & Duplicate Detection
  try {
    const timestamp = Date.now().toString(36);
    const testBizName = `Apex Orthodontics ${timestamp}`;

    // Submission with NO email
    const createdNoEmail = await submitPartnerClient('part_01', {
      businessName: testBizName,
      contactName: 'Dr. Sarah Connor',
      email: '', // Optional empty email!
      country: 'Ireland',
      specialty: 'Dental',
      package: 'Regular',
    });

    if (createdNoEmail.portalUserEmail !== '' || !createdNoEmail.referralCode) {
      throw new Error('Client created without email had unexpected email or missing referral code');
    }

    // Duplicate detection on business name when email is empty
    let threwDuplicate = false;
    try {
      await submitPartnerClient('part_01', {
        businessName: testBizName,
        contactName: 'Another Name',
        email: '',
        country: 'Ireland',
        specialty: 'Dental',
        package: 'Regular',
      });
    } catch {
      threwDuplicate = true;
    }

    if (!threwDuplicate) {
      throw new Error('Duplicate business name was not blocked when email was empty');
    }

    console.log('[PASS] Repo: Partner Add Client accepts optional email and enforces duplicate fallback');
  } catch (err: any) {
    console.error(`[FAIL] Repo: Partner Add Client error: ${err.message}`);
    failures++;
  }

  // 12. Repo: GitHub Sync update creates a new version without changing existing projects
  try {
    // A. Create a template source
    const source = await saveTemplateSource({
      owner: 'test-org',
      repo: 'test-templates',
      branch: 'main',
      folder: 'templates',
    });

    // B. Import v1 of a template
    const importV1 = await importTemplatesFromGitHub(source.id, [
      {
        path: 'templates/aesthetic.html',
        name: 'Aesthetic Studio v1',
        description: 'First version',
        nicheTags: ['Dental'],
        html: '<!DOCTYPE html><html><head><style>:root{--brand-primary:#D92D50;}</style></head><body><h1>{{business_name}}</h1><p>V1 Content</p></body></html>',
        blobSha: 'sha_blob_v1',
        commitSha: 'commit_sha_111111',
      },
    ]);

    const templateId = importV1.templates[0].id;
    const tplV1 = await getWebsiteTemplateById(templateId);
    if (!tplV1 || tplV1.version !== 1) {
      throw new Error(`Expected template version 1, got ${tplV1?.version}`);
    }

    // C. Create a project using this template v1
    const testProject = await saveWebsiteProject({
      title: 'Smile Clinic Website',
      templateId: templateId,
      details: {
        businessName: 'Smile Clinic',
        tagline: 'Premier cosmetic care',
        about: 'About text',
        services: [{ title: 'Implants', text: 'Top service' }],
        phone: '+353 1 234 5678',
        email: 'info@smile.ie',
        address: 'Dublin',
        openingHours: 'Mon-Fri',
        ctaText: 'Book',
        ctaLink: 'https://smile.ie',
      },
      brand: {
        primaryColor: '#D92D50',
        secondaryColor: '#101828',
        fontStack: 'sans-serif',
        radius: 12,
        density: 'normal',
      },
      variation: {
        sectionOrder: ['hero'],
        sectionsOn: { hero: true },
        variants: {},
        seed: 1,
      },
      status: 'Draft',
    });

    if (testProject.templateVersion !== 1) {
      throw new Error(`Project expected templateVersion 1, got ${testProject.templateVersion}`);
    }

    // D. Update the template to v2 via GitHub import (blobSha differs)
    const importV2 = await importTemplatesFromGitHub(source.id, [
      {
        path: 'templates/aesthetic.html',
        name: 'Aesthetic Studio v2',
        description: 'Second version updated',
        nicheTags: ['Dental', 'Aesthetic'],
        html: '<!DOCTYPE html><html><head><style>:root{--brand-primary:#D92D50;}</style></head><body><h1>{{business_name}}</h1><p>V2 Enhanced Content</p></body></html>',
        blobSha: 'sha_blob_v2',
        commitSha: 'commit_sha_222222',
      },
    ]);

    const tplV2 = await getWebsiteTemplateById(templateId);
    if (!tplV2 || tplV2.version !== 2) {
      throw new Error(`Expected template version 2, got ${tplV2?.version}`);
    }

    // E. CRITICAL CHECK: Existing project templateVersion MUST REMAIN 1!
    const projectAfterUpdate = await getWebsiteProjectById(testProject.id);
    if (!projectAfterUpdate || projectAfterUpdate.templateVersion !== 1) {
      throw new Error(
        `Template update must NOT modify existing project version automatically! Expected 1, got ${projectAfterUpdate?.templateVersion}`
      );
    }

    // F. Project is upgraded ONLY when user clicks re-render
    const reRendered = await reRenderProjectWithLatestTemplate(testProject.id);
    if (reRendered.templateVersion !== 2) {
      throw new Error(`After re-render, project expected templateVersion 2, got ${reRendered.templateVersion}`);
    }
    if (!reRendered.renderedHtml.includes('V2 Enhanced Content')) {
      throw new Error('Re-rendered HTML does not reflect new template v2 markup');
    }

    console.log('[PASS] Repo: GitHub Sync update creates new template version without changing existing projects until re-rendered');
  } catch (err: any) {
    console.error(`[FAIL] Repo: GitHub Sync test error: ${err.message}`);
    failures++;
  }

  // 13. Repo: Custom Website Studio Mode Lifecycle, Versioning & Security
  try {
    // A. Create project and switch to Custom mode
    const proj = await saveWebsiteProject({
      clientId: 'client_01',
      title: 'Apex Orthodontics Custom Build',
      templateId: 'tpl_sample_01',
      details: {
        businessName: 'Apex Orthodontics',
        services: [{ title: 'Braces', text: 'Specialist care' }],
        phone: '+353 1 987 6543',
        email: 'info@apexortho.ie',
      },
      brand: {
        primaryColor: '#D92D50',
        secondaryColor: '#101828',
        fontStack: 'sans-serif',
        radius: 12,
        density: 'normal',
      },
      variation: {
        sectionOrder: ['hero'],
        sectionsOn: { hero: true },
        variants: {},
        seed: 1,
      },
      status: 'Draft',
    });

    const customProj = await updateWebsiteProjectMode(proj.id, 'custom');
    if (customProj.mode !== 'custom') {
      throw new Error(`Expected project mode 'custom', got '${customProj.mode}'`);
    }

    // Template data preserved untouched
    if (!customProj.templateId || !customProj.renderedHtml) {
      throw new Error('Template data was unexpectedly deleted upon switching to Custom mode');
    }

    // B. Update custom setup
    await updateWebsiteProjectCustomSetup(proj.id, {
      repoName: 'site-apex-ortho',
      repoOwner: 'openhours-client-sites',
      branch: 'main',
      hostingProvider: 'Vercel',
      notes: 'Custom AI Studio build',
      checklist: {
        repoCreated: true,
        aiStudioConnected: true,
        hostingLinked: true,
        previewWorking: true,
      },
    });

    // C. Add Version 1 (Draft)
    const v1 = await saveCustomVersion(proj.id, {
      previewUrl: 'https://apex-ortho-v1.vercel.app',
      commitSha: 'a1b2c3d4e5f6',
      changelog: ['Custom navbar and mobile menu redesign'],
      internalNote: 'Internal notes should never leak to client',
    });

    if (v1.versionNumber !== 1 || v1.status !== 'Draft') {
      throw new Error(`Expected v1 with status 'Draft', got v${v1.versionNumber} with '${v1.status}'`);
    }

    // Draft MUST NOT be exposed in portal view model
    const portalVmDraft = await getClientPortalViewModel('client_01');
    if (portalVmDraft?.customWebsitePreview !== null) {
      throw new Error('Draft custom version was leaked to client portal view model');
    }

    // D. Share Version 1
    const sharedV1 = await shareCustomVersion(v1.id);
    if (sharedV1.status !== 'Shared') {
      throw new Error(`Expected status 'Shared', got '${sharedV1.status}'`);
    }

    const portalVmShared = await getClientPortalViewModel('client_01');
    if (!portalVmShared?.customWebsitePreview) {
      throw new Error('Shared custom version missing from client portal view model');
    }
    if (portalVmShared.customWebsitePreview.currentVersion.versionNumber !== 1) {
      throw new Error('Shared custom version number mismatch');
    }
    // Verify no forbidden fields leaked
    if ((portalVmShared.customWebsitePreview.currentVersion as any).internalNote ||
        (portalVmShared.customWebsitePreview as any).repoName) {
      throw new Error('Forbidden internal fields leaked into client custom website view model');
    }

    // E. Client requests changes on v1
    const changesV1 = await requestChangesCustomVersion(v1.id, 'Please increase logo size in header.', 'Client User');
    if (changesV1.status !== 'Changes requested' || changesV1.clientFeedback !== 'Please increase logo size in header.') {
      throw new Error('Request changes failed to record feedback and status');
    }

    // Verify attention items reflect requested changes
    const attItems = await getCustomWebsiteAttentionItems();
    const hasChangeAtt = attItems.some((a) => a.title.includes('Website changes requested'));
    if (!hasChangeAtt) {
      throw new Error('Attention items did not flag website changes requested');
    }

    // F. Add Version 2 and Share
    const v2 = await saveCustomVersion(proj.id, {
      previewUrl: 'https://apex-ortho-v2.vercel.app',
      commitSha: 'b2c3d4e5f6a7',
      changelog: ['Increased logo size by 20% in header'],
    });

    const sharedV2 = await shareCustomVersion(v2.id);
    if (sharedV2.versionNumber !== 2 || sharedV2.status !== 'Shared') {
      throw new Error('Failed to create and share version 2');
    }

    // G. Verify Previous Version 1 is now Superseded
    const allVersions = await getCustomVersions(proj.id);
    const prevV1 = allVersions.find((v) => v.id === v1.id);
    if (prevV1?.status !== 'Superseded') {
      throw new Error(`Expected v1 to be 'Superseded' after sharing v2, got '${prevV1?.status}'`);
    }

    // H. Client approves Version 2
    const approvedV2 = await approveCustomVersion(v2.id, 'Looks perfect, approved!', 'Client User');
    if (approvedV2.status !== 'Approved') {
      throw new Error(`Expected status 'Approved', got '${approvedV2.status}'`);
    }

    const portalVmApproved = await getClientPortalViewModel('client_01');
    if (portalVmApproved?.customWebsitePreview?.currentVersion.status !== 'Approved') {
      throw new Error('Approved status not reflected in client portal view model');
    }

    // I. Switch project back to Template mode - all custom versions preserved
    const switchedBack = await updateWebsiteProjectMode(proj.id, 'template');
    if (switchedBack.mode !== 'template') {
      throw new Error('Failed to switch back to template mode');
    }
    const retainedVersions = await getCustomVersions(proj.id);
    if (retainedVersions.length !== 2) {
      throw new Error('Custom versions were lost after switching back to template mode');
    }

    console.log('[PASS] Repo: Custom Website Studio lifecycle (mode switch, versioning, superseding, approvals, attention items) operates cleanly');
  } catch (err: any) {
    console.error(`[FAIL] Repo: Custom Website Studio error: ${err.message}`);
    failures++;
  }

  // J. React (config-driven) Template Repo Integration
  try {
    // 1. Save React template project
    const reactProject = await saveWebsiteProject({
      clientId: 'client_01',
      title: 'React Dental Applet Concept',
      templateId: 'tpl_react_01',
      templateVersion: 1,
      templateType: 'react',
      reactConfig: {
        details: { businessName: 'Fitzwilliam Specialist Care', tagline: 'Leading orthodontic care' },
        brand: { primaryColor: '#2563EB', radius: 8 },
        services: [{ title: 'Invisalign Consultation', description: 'Comprehensive 3D scan' }],
      },
      details: {
        businessName: 'Fitzwilliam Specialist Care',
        tagline: 'Leading orthodontic care',
        about: 'Specialist care clinic in Dublin',
        services: [],
        phone: '+353 1 234 5678',
        email: 'info@fitzwilliam.ie',
        address: 'Dublin',
        openingHours: 'Mon-Fri 9-5',
        ctaText: 'Book',
        ctaLink: '#',
      },
      brand: {
        primaryColor: '#2563EB',
        secondaryColor: '#101828',
        fontStack: 'system-ui',
        radius: 8,
        density: 'normal',
      },
      variation: { sectionOrder: ['hero', 'services'], sectionsOn: { hero: true, services: true }, variants: {}, seed: 101 },
      status: 'Draft',
    });

    if (reactProject.templateType !== 'react' || !reactProject.reactConfig) {
      throw new Error('Failed to create website project with templateType=react and reactConfig');
    }

    // 2. Additive update reactConfig
    const updatedReactProject = await updateWebsiteProjectReactConfig(
      reactProject.id,
      {
        ...reactProject.reactConfig,
        brand: { primaryColor: '#1D4ED8', radius: 12 },
      },
      'Admin User'
    );

    if (updatedReactProject.reactConfig?.brand?.radius !== 12) {
      throw new Error('updateWebsiteProjectReactConfig failed to update config values');
    }

    // 3. Client portal view model includes React template and config without forbidden fields
    const portalVm = await getClientPortalViewModel('client_01');
    if (portalVm?.websiteDemo) {
      if (portalVm.websiteDemo.templateType === 'react') {
        if (!portalVm.websiteDemo.reactConfig) {
          throw new Error('portalVm.websiteDemo missing reactConfig for react template');
        }
      }
    }

    console.log('[PASS] Repo: React (config-driven) Website Project lifecycle and portal integration operates cleanly');
  } catch (err: any) {
    console.error(`[FAIL] Repo: React Template error: ${err.message}`);
    failures++;
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error(`${failures} TEST(S) FAILED.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
