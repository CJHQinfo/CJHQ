// Build-time resource data only. Keep a single source of truth in site-core.js.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
export function resourceItems(root){
  const source = readFileSync(join(root, 'assets/site-core.js'), 'utf8');
  const start = source.indexOf('const categories = [');
  const end = source.indexOf('const contactCats = [', start);
  if(start < 0 || end < 0) throw new Error('Resource category boundaries missing');
  const categories = Function('"use strict"; ' + source.slice(start, end) + ' return categories;')();
  const items = categories.flatMap(c => c.groups.flatMap(g => g.items));
  if(items.length !== 67 || new Set(items.map(i => i.slug)).size !== items.length ||
    items.some(i => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(i.slug)))
    throw new Error('Resource slug set changed; review routes before publishing');
  return items;
}
