// Opt-in system/API smoke. Creates a test account and request; no automatic deletion.
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
async function main() {
  const {M3_API_URL, M3_TEST_EMAIL, M3_TEST_PASSWORD, M3_ALLOW_TEST_WRITES} = process.env;
  assert.equal(M3_ALLOW_TEST_WRITES, 'yes', 'Use an isolated test environment and set M3_ALLOW_TEST_WRITES=yes');
  assert.ok(M3_API_URL && M3_TEST_EMAIL && M3_TEST_PASSWORD, 'Set M3_API_URL (ending /api/v1), M3_TEST_EMAIL and M3_TEST_PASSWORD');
  const base = new URL(M3_API_URL);
  assert.ok(['http:','https:'].includes(base.protocol), 'Use HTTP(S)');
  const marker = 'M3-test-' + randomUUID();
  let token;
  async function call(path, method, body, expected) {
    const response = await fetch(base.href.replace(/\/$/,'')+path, {
      method, headers:{'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {})},
      ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(15000)
    });
    assert.equal(response.status,expected,`${method} ${path}: expected ${expected}, received ${response.status}`);
    return response.json();
  }
  console.log('TC-016-R API journey; test marker:',marker);
  await call('/auth/register','POST',{name:marker,email:M3_TEST_EMAIL,password:M3_TEST_PASSWORD},201);
  console.log('PASS registration (test account retained for cleanup)');
  const login = await call('/auth/login','POST',{email:M3_TEST_EMAIL,password:M3_TEST_PASSWORD},200);
  token = login.data.token; assert.ok(token);
  console.log('PASS sign in');
  await call('/requests','POST',{title:marker,description:'Milestone 3 isolated test',street_address:'Test location',category:'IT support'},201);
  const list = await call('/requests/my','GET',null,200);
  assert.ok(Array.isArray(list.data));
  const created = list.data.find(row=>row.title===marker);
  assert.ok(created,'Created request must appear in My Requests');
  assert.equal(created.status,'Pending');
  console.log('PASS request appears as Pending; request ID:',created.service_request_id);
  console.log('PASS revised API journey only. Original verification journey and browser E2E remain unproven.');
}
main().catch(error=>{console.error('FAIL:',error.message);process.exitCode=1;});
