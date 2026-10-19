// Browser smoke test for the V3 draft; checks a real WebGL startup.
// Run with a local static server on port 8765 after installing playwright.
import {chromium} from 'playwright';
const browser=await chromium.launch({
 headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const errors=[],failed=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('Console: '+m.text())});
page.on('requestfailed',r=>failed.push(r.url()+' '+r.failure()?.errorText));
try{
 await page.goto('http://127.0.0.1:8765/?debug=1',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__game && window.__player,{timeout:90000});
 if(await page.locator('#begin-btn').count()!==1)throw Error('Start button missing');
 await page.locator('#begin-btn').click();
 await page.waitForFunction(()=>!document.getElementById('hud').classList.contains('hidden'),null,{timeout:30000});
 await page.waitForTimeout(500);
 const details=await page.evaluate(()=>({
   camMode:window.__player.camMode,
   canvas:document.getElementById('game')?.width,
   visibleHud:!document.getElementById('hud').classList.contains('hidden'),
   found:document.getElementById('found-count').textContent,
   npcs:window.__game.npcCount(),
   markers:window.__game.hitCount(),
   nineZones:['tower','forest','tavern','cave','village','castle','dark','sundrop','lake'].length===9
 }));
 console.log('V3 MOBILE SMOKE',JSON.stringify(details));
 if(!details.visibleHud||details.camMode!=='third'||details.found!=='0'||details.npcs<30)throw Error('Game did not enter the expected V3 state');
 await page.locator('#map-toggle').click();
 if(!await page.locator('#map-overlay').isVisible())throw Error('Map did not open');
 if(await page.locator('#map-destinations button').count()!==9)throw Error('Nine location buttons missing');
 await page.locator('#map-close').click();
 // Hide debug-only red clue probes in the visual screenshot.
 await page.evaluate(()=>window.__player.group.parent.traverse(o=>{if(o.userData.debugId)o.visible=false;}));
 await page.screenshot({path:'v3-mobile-preview.png'});
 // Swing the follow camera around the heroine to inspect the face and outfit.
 await page.evaluate(()=>{window.__player.orbit.yaw=Math.PI;window.__player.orbit.pitch=0;window.__player.updateCamera(window.__game.camera,1);});
 await page.waitForTimeout(700);
 await page.screenshot({path:'v3-character-front.png'});
 if(errors.length||failed.length)throw Error('Browser errors: '+JSON.stringify({errors,failed}));
 console.log('V3 smoke PASS');
}catch(e){
 console.error('V3 smoke FAILED:',e.message);
 console.error('Console/page errors:',errors,'Failed network requests:',failed);
 await page.screenshot({path:'v3-mobile-preview-failure.png'}).catch(()=>{});
 process.exitCode=1;
}finally{await browser.close()}
