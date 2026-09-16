import {test,expect} from '@playwright/test';
import history from '../fixtures/legacy-dated-routes.json';
import {startEdgePreview} from '../helpers/edge-preview.mjs';
let edge:Awaited<ReturnType<typeof startEdgePreview>>;
test.beforeAll(async({baseURL})=>{edge=await startEdgePreview(baseURL);});
test.afterAll(async()=>{edge.server.closeAllConnections();await new Promise<void>(resolve=>edge.server.close(()=>resolve()));});
test('all 38 old dated URLs send a real HTTP308 to a working successor',async({request})=>{
 for(const [old,target] of Object.entries(history.routes))for(const source of [old,old.replace(/\.html$/,'/')]){
  const response=await request.get(edge.origin+source+'?utm_source=legacy&keep=1',{maxRedirects:0});
  expect(response.status(),source).toBe(308);expect(response.headers().location).toBe(target+'?utm_source=legacy&keep=1');
  const dest=await request.get(edge.origin+response.headers().location);expect(dest.status()).toBe(200);
  expect(await dest.text()).toContain(`href="https://www.misstravel.me${target}"`);
 }
});
test('unknown truncated URLs remain true404, not redirected to irrelevant pages',async({request})=>{
 for(const raw of history.unmapped){const response=await request.get(edge.origin+raw);expect(response.status()).toBe(404);expect(await response.text()).toContain('noindex');}
});
test('a real browser follows the historical room link and can read original booking copy',async({page})=>{
 await page.goto(edge.origin+'/rooms/2022-10-07-suite_1.html?utm_source=legacy');
 await expect(page).toHaveURL(edge.origin+'/rooms/suite_1/?utm_source=legacy');
 await expect(page.locator('h1')).toContainText('密式之眼');
 await expect(page.locator('.room-content')).toContainText('此房型平日無附早餐');
});
