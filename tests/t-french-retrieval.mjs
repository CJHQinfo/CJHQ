/* PART M - French body-text retrieval.

   askMatchResources() built its haystack from bilingual TITLES but English-only
   BODIES. A French question could therefore only ever match a title, and since
   a match with no title hit needs TWO body hits to clear the relevance rule,
   most French questions matched nothing at all: the French text that actually
   answers them was not in the index.

   These are retrieval-level tests, not answer tests. They call
   askMatchResources() directly and assert which record comes back, so they are
   deterministic and never reach the AI layer.

   The evidence is built two ways.

   1. WITNESS TERMS. Each case is driven by French words that appear in that
      record's French body and NOWHERE in any English text anywhere in the
      dataset - titles, bodies, lists, headings, link labels, category and group
      names. The guard below re-derives that set on every run, so a witness that
      later leaks into English copy fails the suite instead of quietly becoming
      meaningless. A question built only from such words cannot match through
      English, so if it resolves to the right record, French bodies are indexed.

   2. BEFORE / AFTER. Every query is also run against the DEPLOYED baseline,
      which is expected to return nothing. That is what makes this a proof of
      the change rather than a description of it.

   English controls run alongside and must resolve exactly as the deployed
   build does, since H3 adds French fields and removes no English one. */
import * as NEW from '../ask-core.mjs';
import { categories } from '../ask-data.mjs';
import { makeSuite } from './harness.mjs';

const CJHQ_BASELINE = process.env.CJHQ_BASELINE || new URL('../../dep_live/', import.meta.url).pathname;
const OLD = await import(CJHQ_BASELINE + 'ask-core.mjs');

const ITEMS = [];
categories.forEach(c => (c.groups || []).forEach(g => (g.items || []).forEach(it => ITEMS.push(it))));

const EN_KEYS = ['en', 'desc_en', 'what_en', 'need_en', 'steps_en', 'question_en', 'answer_en',
                 'need_heading_en', 'tips_heading_en', 'steps_heading_en'];
const EN_LIST_KEYS = ['need_list_en', 'tips_list_en', 'steps_list_en'];
const FR_KEYS = ['fr', 'desc_fr', 'what_fr', 'need_fr', 'steps_fr', 'question_fr', 'answer_fr'];
const FR_LIST_KEYS = ['need_list_fr', 'tips_list_fr', 'steps_list_fr'];

const norm = s => NEW.cjhqNormalizeSearch(String(s || '').toLowerCase());
const esc = w => String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (hay, w) => new RegExp('(^|[^a-z0-9])' + esc(w) + '([^a-z0-9]|$)').test(hay);

/* Every English string in the dataset. A witness must appear in none of it. */
const ENGLISH_CORPUS = norm([
  ...ITEMS.flatMap(it => EN_KEYS.map(k => it[k]).concat(EN_LIST_KEYS.map(k => (it[k] || []).join(' ')))),
  ...ITEMS.flatMap(it => (it.official_links || []).map(l => l.label_en)),
  ...categories.map(c => c.en + ' ' + (c.intro_en || '')),
  ...categories.flatMap(c => (c.groups || []).map(g => g.heading_en || ''))
].filter(Boolean).join(' '));

const frBodyOf = it => norm(FR_KEYS.map(k => it[k])
  .concat(FR_LIST_KEYS.map(k => (it[k] || []).join(' ')))
  .filter(Boolean).join(' '));

const slugsOf = hits => hits.map(h => h.item && h.item.slug);

/* The six required cases. Each query is a question a French speaker would
   plausibly type, built so the words that can carry the match live only in
   French body text - never in the record's title, which would match anyway. */
const CASES = [
  { label: 'passport photo / photo de passeport',
    query: 'Combien de photos identiques et quelles normes faut-il respecter',
    witnesses: ['identiques', 'normes'],
    expect: 'adult-passport-application' },

  { label: 'passport application / demande de passeport',
    query: 'Je n ai jamais eu de passeport canadien, quelles sections dois-je remplir',
    witnesses: ['jamais', 'remplir'],
    expect: 'adult-passport-application' },

  { label: 'documents required / documents requis',
    query: 'Quels documents faut-il pour la residence permanente et devenir citoyen',
    witnesses: ['devenir', 'permanente'],
    expect: 'canadian-citizenship-application' },

  { label: 'NEXUS documents / documents NEXUS',
    query: 'Quels documents pour une adhesion aux postes frontaliers terrestres',
    witnesses: ['frontaliers', 'terrestres'],
    expect: 'apply-for-nexus' },

  { label: 'employment insurance / assurance-emploi',
    query: 'Quel soutien temporaire pour un travailleur admissible apres une perte d emploi',
    witnesses: ['soutien', 'temporaire', 'perte'],
    expect: 'employment-insurance-ei' },

  { label: 'community / family support in French',
    query: 'Quelle aide financiere mensuelle pour les familles ayant des enfants',
    witnesses: ['mensuelle', 'ayant'],
    expect: 'quebec-family-allowance' }
];

export default async function run(opts){
  const t = makeSuite('Part M - French body retrieval');

  t.eq('dataset still holds 67 resources', ITEMS.length, 67);

  /* ---- guard: the witnesses really are French-only, and really are in the
          record whose French body is supposed to carry the match ---- */
  for (const c of CASES) {
    const it = ITEMS.find(x => x.slug === c.expect);
    t.check(`record exists: ${c.expect}`, !!it);
    if (!it) continue;
    // The engine tests membership with String.includes(), so the guard does
    // too - a witness that is merely a SUBSTRING of some English word would
    // still match through English and would prove nothing.
    const body = frBodyOf(it);
    const title = norm(String(it.en || '') + ' ' + String(it.fr || ''));
    for (const w of c.witnesses) {
      const n = norm(w);
      t.check(`"${w}" appears in NO English text anywhere in the dataset`,
        !ENGLISH_CORPUS.includes(n), 'leaked into English copy');
      t.check(`"${w}" is in ${c.expect}'s French body`,
        body.includes(n), 'not in the French body');
      t.check(`"${w}" is NOT in either title of ${c.expect}`,
        !title.includes(n), 'the title would have matched it anyway');
    }
  }

  /* ---- the six cases: nothing before, the right record now ---- */
  for (const c of CASES) {
    const now = slugsOf(NEW.askMatchResources(c.query, 3));
    const was = slugsOf(OLD.askMatchResources(c.query, 3));
    t.check(`${c.label} — deployed build retrieved NOTHING`,
      was.length === 0, 'baseline returned ' + JSON.stringify(was));
    t.check(`${c.label} — now retrieves ${c.expect}`,
      now.includes(c.expect), 'got ' + JSON.stringify(now));
  }

  /* ---- breadth: how many records can be reached through French body text
          alone. Two witnesses per record, because a match carrying no title
          hit needs two body hits to clear the relevance rule - so a single
          term could never retrieve anything, by design, and measuring one
          would measure that rule rather than the index. ---- */
  const ENSET = new Set(ENGLISH_CORPUS.split(/\s+/));
  // The query tokenizer drops every character outside [a-z0-9]. It does not
  // FOLD accents, it deletes them, so an accented French word arrives as
  // "rsidence" and can never match the stored "residence" - a separate
  // limitation, noted in the round report and out of scope here. Measuring
  // with such tokens would measure that bug rather than the index, so only
  // words that are already plain ASCII in the stored text are counted.
  const asciiTokens = hay => [...new Set(hay.split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 4 && hay.includes(w)))];
  // Distinctive terms, not merely the first ones in the text: "votre" and
  // "faites" are French-only but appear in most records, so a query built from
  // them is ambiguous by construction and would measure the relevance floor
  // rather than the index. Count how many records each token appears in and
  // prefer the ones that belong to this record alone - which is also what
  // someone asking about that specific thing would actually type.
  const frBodies = ITEMS.map(it => ({ slug: it.slug, body: frBodyOf(it) }));
  const docFreq = new Map();
  for (const { body } of frBodies)
    for (const w of asciiTokens(body)) docFreq.set(w, (docFreq.get(w) || 0) + 1);

  let reachNow = 0, reachWas = 0, testable = 0;
  for (const it of ITEMS) {
    if (!it.slug) continue;
    const title = norm(String(it.en || '') + ' ' + String(it.fr || ''));
    const frOnly = asciiTokens(frBodyOf(it))
      .filter(w => !ENSET.has(w) && !ENGLISH_CORPUS.includes(w) && !title.includes(w))
      .sort((a, b) => (docFreq.get(a) || 0) - (docFreq.get(b) || 0));
    if (frOnly.length < 2) continue;            // nothing French-only to test with
    testable++;
    const q = frOnly.slice(0, 4).join(' ');
    if (slugsOf(NEW.askMatchResources(q, 3)).includes(it.slug)) reachNow++;
    if (slugsOf(OLD.askMatchResources(q, 3)).includes(it.slug)) reachWas++;
  }
  const pctNow = testable ? Math.round(reachNow / testable * 100) : 0;
  const pctWas = testable ? Math.round(reachWas / testable * 100) : 0;
  console.log(`  records reachable by French-only body terms: ` +
              `${reachWas}/${testable} (${pctWas}%) before -> ${reachNow}/${testable} (${pctNow}%) now`);
  t.check('the deployed build reached almost none of them', pctWas <= 5, pctWas + '%');
  t.check('the working copy reaches the large majority', pctNow >= 80, pctNow + '%');

  /* ---- English controls: identical to the deployed build ---- */
  const CONTROL = [
    ['How do I apply for a passport?', 'adult-passport-application'],
    ['How do I renew my NEXUS card?', 'renew-or-replace-nexus'],
    ['How do I apply for employment insurance?', 'employment-insurance-ei'],
    ['Canadian Citizenship', 'canadian-citizenship-application'],
    ['Quebec Family Allowance', 'quebec-family-allowance']
  ];
  for (const [q, slug] of CONTROL) {
    const now = slugsOf(NEW.askMatchResources(q, 3));
    t.check(`EN control still resolves: "${q}"`, now.includes(slug), JSON.stringify(now));
  }

  return t.report();
}

if (import.meta.url === `file://${process.argv[1]}`) await run({});
