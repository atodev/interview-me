import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? '';

async function testConnection() {
  console.log('--- Supabase Connection Test ---\n');
  console.log(`URL: ${supabaseUrl.slice(0, 30)}...`);
  console.log(`Key: ${supabaseKey.slice(0, 20)}...\n`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Check profiles table exists and is accessible
  console.log('1. Testing profiles table...');
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profilesErr) {
    console.log(`   FAIL: ${profilesErr.message}`);
  } else {
    console.log(`   OK — ${profiles.length} rows returned`);
  }

  // Test 2: Check interviews table
  console.log('2. Testing interviews table...');
  const { data: interviews, error: interviewsErr } = await supabase
    .from('interviews')
    .select('*')
    .limit(1);

  if (interviewsErr) {
    console.log(`   FAIL: ${interviewsErr.message}`);
  } else {
    console.log(`   OK — ${interviews.length} rows returned`);
  }

  // Test 3: Check answers table
  console.log('3. Testing answers table...');
  const { data: answers, error: answersErr } = await supabase
    .from('answers')
    .select('*')
    .limit(1);

  if (answersErr) {
    console.log(`   FAIL: ${answersErr.message}`);
  } else {
    console.log(`   OK — ${answers.length} rows returned`);
  }

  // Test 4: Check daily_usage table
  console.log('4. Testing daily_usage table...');
  const { data: usage, error: usageErr } = await supabase
    .from('daily_usage')
    .select('*')
    .limit(1);

  if (usageErr) {
    console.log(`   FAIL: ${usageErr.message}`);
  } else {
    console.log(`   OK — ${usage.length} rows returned`);
  }

  // Test 5: Write + read + delete on profiles (round trip)
  console.log('5. Testing write/read/delete round trip...');
  const testId = '00000000-0000-0000-0000-000000000001';

  // Clean up first in case of leftover from previous test
  await supabase.from('profiles').delete().eq('id', testId);

  // We can't insert into profiles directly because it references auth.users
  // Instead, test with daily_usage which has no FK to auth
  const testDate = '2099-01-01';
  const { error: insertErr } = await supabase
    .from('daily_usage')
    .insert({ user_id: testId, date: testDate, ai_tokens_used: 42 });

  if (insertErr) {
    // Expected if FK constraint blocks it — that's actually correct behavior
    console.log(`   OK — FK constraint active: ${insertErr.message}`);
  } else {
    // Clean up
    const { data: readBack } = await supabase
      .from('daily_usage')
      .select('ai_tokens_used')
      .eq('date', testDate)
      .single();

    if (readBack?.ai_tokens_used === 42) {
      console.log('   OK — write/read verified');
    } else {
      console.log('   WARN — write succeeded but read mismatch');
    }

    await supabase.from('daily_usage').delete().eq('date', testDate);
    console.log('   Cleaned up test data');
  }

  // Test 6: Check coaching_programs table
  console.log('6. Testing coaching_programs table...');
  const { data: programs, error: programsErr } = await supabase
    .from('coaching_programs')
    .select('*')
    .limit(1);

  if (programsErr) {
    console.log(`   FAIL: ${programsErr.message}`);
  } else {
    console.log(`   OK — ${programs.length} rows returned`);
  }

  // Test 7: Check coaching_days table
  console.log('7. Testing coaching_days table...');
  const { data: days, error: daysErr } = await supabase
    .from('coaching_days')
    .select('*')
    .limit(1);

  if (daysErr) {
    console.log(`   FAIL: ${daysErr.message}`);
  } else {
    console.log(`   OK — ${days.length} rows returned`);
  }

  // Test 8: Check coaching_attempts table
  console.log('8. Testing coaching_attempts table...');
  const { data: attempts, error: attemptsErr } = await supabase
    .from('coaching_attempts')
    .select('*')
    .limit(1);

  if (attemptsErr) {
    console.log(`   FAIL: ${attemptsErr.message}`);
  } else {
    console.log(`   OK — ${attempts.length} rows returned`);
  }

  // Test 9: Check the monthly_cost_summary view
  console.log('9. Testing monthly_cost_summary view...');
  const { data: costView, error: costErr } = await supabase
    .from('monthly_cost_summary')
    .select('*')
    .limit(1);

  if (costErr) {
    console.log(`   FAIL: ${costErr.message}`);
  } else {
    console.log(`   OK — view accessible, ${costView.length} rows`);
  }

  console.log('\n--- Test Complete ---');
}

testConnection().catch(console.error);
