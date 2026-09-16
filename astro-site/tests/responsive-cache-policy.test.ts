import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const config=JSON.parse(readFileSync(join(__dirname,'../../vercel.json'),'utf8'));
describe('Cache policy is scoped to content-hashed derivatives',()=>{
  it('makes generated derivatives immutable without extending original-image TTL',()=>{
    const rules=config.headers as {source:string;headers:{key:string;value:string}[]}[];
    const cache=(source:string)=>rules.find(r=>r.source===source)?.headers.find(h=>h.key==='Cache-Control')?.value;
    expect(cache('/generated-images/(.*)')).toBe('public, max-age=31536000, immutable');
    expect(cache('/images/(.*)')).toBe('public, max-age=86400, stale-while-revalidate=604800');
    expect(cache('/(.*)')).toBeUndefined();
  });
});
