'use strict';
/* Deploy as a 2nd-gen Cloud Function with an Eventarc Firestore trigger on
 * forward_links/{slug} (create/update/delete) and GITHUB_TOKEN set from
 * Secret Manager. Each event bumps data/forward-links-trigger.json in
 * CJHQinfo/CJHQ through the GitHub Contents API; the push path filter on the
 * "Generate per-page share previews" workflow then regenerates and publishes
 * the share cards within minutes instead of waiting for the 15-minute
 * schedule. Writes nothing to Firestore and always acks, so Eventarc never
 * redelivers in a loop; on failure the schedule remains the backstop. */
const functions = require('@google-cloud/functions-framework');
const REPO = 'CJHQinfo/CJHQ';
const TRIGGER_PATH = 'data/forward-links-trigger.json';

async function bumpTriggerFile(token) {
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'cjhq-forward-link-dispatch',
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const get = await fetch(`https://api.github.com/repos/${REPO}/contents/${TRIGGER_PATH}`, { headers });
    if (!get.ok && get.status !== 404) throw new Error(`contents GET ${get.status}`);
    const sha = get.ok ? (await get.json()).sha : undefined;
    const body = {
      message: 'chore: forward-link change trigger',
      content: Buffer.from(JSON.stringify({ at: new Date().toISOString(), n: Date.now() }) + '\n').toString('base64'),
    };
    if (sha) body.sha = sha;
    const put = await fetch(`https://api.github.com/repos/${REPO}/contents/${TRIGGER_PATH}`, {
      method: 'PUT', headers, body: JSON.stringify(body),
    });
    if (put.ok) return;
    if (put.status === 409) continue; // sha raced a parallel event; retry once
    throw new Error(`contents PUT ${put.status}`);
  }
  throw new Error('contents PUT conflicted twice');
}

functions.cloudEvent('forwardLinkDispatch', async (event) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN unset');
    console.log('forward_links event:', event.type || '', event.subject || '');
    await bumpTriggerFile(token);
    console.log('trigger commit pushed; generator workflow starts from the push');
  } catch (e) {
    console.error('dispatch failed (schedule backstop still applies):', e.message);
  }
});
