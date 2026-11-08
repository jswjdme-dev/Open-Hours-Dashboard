import { runSequenceAndTaskTests } from '../src/lib/sequenceTests.ts';

async function main() {
  console.log('--- RUNNING SEQUENCE AND AUTOMATIC TASK TESTS ---');
  const results = await runSequenceAndTaskTests();
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
    console.log(`       ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log('------------------------------------------------');
  if (allPassed) {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('SOME TESTS FAILED!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
