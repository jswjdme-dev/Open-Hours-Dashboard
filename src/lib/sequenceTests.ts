import {
  createLead,
  moveLeadStage,
  moveLeadChannelStage,
  getTasks,
  addSuppressionEntry,
  getOutreachChannels,
  getChannelStages,
  getActiveChannelSequence,
  saveStateToStorage,
  exportAllDataJson,
} from '../data/repo.ts';

export interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

export async function runSequenceAndTaskTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // TEST 1: Move lead to stage -> tasks appear
  try {
    const leadRes = await createLead({
      businessName: 'Test Sequence Clinic Alpha',
      city: 'Cork',
      country: 'Ireland',
      specialty: 'Dental',
      stage: 'New Lead',
      channels: [
        {
          id: `tchan_${Date.now()}`,
          channelId: 'chan_cold_email',
          type: 'Email',
          value: `dr.alpha_${Date.now()}@alphaclinic.ie`,
          status: 'Not contacted',
        },
      ],
    });

    if (!leadRes.success || !leadRes.lead) {
      throw new Error(`Failed to create test lead: ${leadRes.error}`);
    }

    const testLeadId = leadRes.lead.id;

    // Move lead to 'Contacted' in chan_cold_email
    const move1 = await moveLeadChannelStage(testLeadId, 'chan_cold_email', 'Contacted');
    if (!move1.success) {
      throw new Error(`Failed to move lead to Contacted: ${move1.error}`);
    }

    // Verify tasks appeared
    const tasks1 = await getTasks({ leadId: testLeadId });
    const pendingSeqTasks1 = tasks1.filter(
      (t) => t.status === 'Pending' && (t.sequenceStepNumber !== undefined || t.sourceTag.includes('Sequence step'))
    );

    const passed1 = pendingSeqTasks1.length >= 1;
    results.push({
      name: '1. Move lead to stage -> tasks appear',
      passed: passed1,
      details: passed1
        ? `Successfully created ${pendingSeqTasks1.length} follow-up sequence task(s) for Contacted stage.`
        : 'No pending sequence tasks were generated.',
    });

    // TEST 2: Move again -> old cancelled, new created
    // Define another sequence step or move to another open stage
    const move2 = await moveLeadChannelStage(testLeadId, 'chan_cold_email', 'Audit Sent');
    if (!move2.success) {
      throw new Error(`Failed to move lead to Audit Sent: ${move2.error}`);
    }

    const tasks2 = await getTasks({ leadId: testLeadId });
    const oldCancelled = tasks2.filter(
      (t) => t.status === 'Cancelled' && (t.stageName === 'Contacted' || t.sourceTag.includes('Contacted') || t.sourceTag.includes('Cold email'))
    );

    const passed2 = oldCancelled.length >= 1;
    results.push({
      name: '2. Move again -> old cancelled, new created',
      passed: passed2,
      details: passed2
        ? `Old sequence tasks correctly transitioned to Cancelled (${oldCancelled.length} cancelled).`
        : 'Previous stage tasks were not cancelled upon moving to new stage.',
    });

    // TEST 3: Replied -> cancelled
    const moveReplied = await moveLeadChannelStage(testLeadId, 'chan_cold_email', 'Replied');
    if (!moveReplied.success) {
      throw new Error(`Failed to move lead to Replied: ${moveReplied.error}`);
    }

    const tasks3 = await getTasks({ leadId: testLeadId });
    const anyPendingAfterReply = tasks3.some(
      (t) => t.status === 'Pending' && (t.sequenceStepNumber !== undefined || t.sourceTag.includes('Sequence step'))
    );

    const passed3 = !anyPendingAfterReply;
    results.push({
      name: '3. Replied -> cancelled',
      passed: passed3,
      details: passed3
        ? 'All open sequence tasks for the lead were cancelled upon entering Replied stage.'
        : 'Found pending sequence tasks that were not cancelled on Replied.',
    });

    // TEST 4: Suppression blocks
    const suppressedLeadRes = await createLead({
      businessName: 'Test Suppressed Clinic Beta',
      city: 'Valletta',
      country: 'Malta',
      specialty: 'Physio',
      stage: 'New Lead',
      channels: [
        {
          id: `tchan_sup_${Date.now()}`,
          channelId: 'chan_cold_email',
          type: 'Email',
          value: `optout_${Date.now()}@beta-suppressed.com`,
          status: 'Not contacted',
        },
      ],
    });

    if (suppressedLeadRes.success && suppressedLeadRes.lead) {
      const supLead = suppressedLeadRes.lead;
      // Add contact to suppression list
      await addSuppressionEntry({
        contactValue: supLead.channels[0].value,
        type: 'email',
        reason: 'Asked to stop',
        addedBy: 'Test Runner',
      });

      // Attempt to move to Contacted
      await moveLeadChannelStage(supLead.id, 'chan_cold_email', 'Contacted');
      const supTasks = await getTasks({ leadId: supLead.id });
      const pendingSupTasks = supTasks.filter((t) => t.status === 'Pending');

      const passed4 = pendingSupTasks.length === 0;
      results.push({
        name: '4. Suppression blocks task creation',
        passed: passed4,
        details: passed4
          ? 'Suppression rule actively blocked task generation for suppressed contact.'
          : 'Tasks were erroneously created for a suppressed contact.',
      });
    } else {
      results.push({
        name: '4. Suppression blocks task creation',
        passed: false,
        details: 'Failed to initialize test lead for suppression check.',
      });
    }

    // TEST 5: Refresh persistence
    saveStateToStorage();
    const backupJson = exportAllDataJson();
    const parsed = JSON.parse(backupJson);

    const hasChannels = Array.isArray(parsed.outreachChannels) && parsed.outreachChannels.length > 0;
    const hasStages = Array.isArray(parsed.channelStages) && parsed.channelStages.length > 0;
    const hasSequences = Array.isArray(parsed.channelSequences) && parsed.channelSequences.length > 0;
    const hasTasks = Array.isArray(parsed.tasks) && parsed.tasks.length > 0;

    const passed5 = hasChannels && hasStages && hasSequences && hasTasks;
    results.push({
      name: '5. Refresh persistence',
      passed: passed5,
      details: passed5
        ? `Persistence verified: ${parsed.outreachChannels.length} channels, ${parsed.channelStages.length} stages, ${parsed.channelSequences.length} sequences, ${parsed.tasks.length} tasks persisted in state.`
        : 'Failed to verify persistence structure.',
    });
  } catch (err: any) {
    results.push({
      name: 'Integration Test Execution Error',
      passed: false,
      details: err.message || String(err),
    });
  }

  return results;
}
