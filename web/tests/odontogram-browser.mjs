import {expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {root} from './local-stack.mjs';

export async function verifyDrawingTools(page,form) {
  const surface=form.getByRole('img',{name:'Odontograma para dibujar'});
  const strokes=surface.locator('[data-stroke]');
  const tool=name=>form.getByRole('button',{name,exact:true});
  async function drag(from,to) {
    await surface.scrollIntoViewIfNeeded();
    const box=await surface.boundingBox();
    await page.mouse.move(box.x+box.width*from[0],box.y+box.height*from[1]);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width*to[0],box.y+box.height*to[1],{steps:8});
    await page.mouse.up();
  }
  await form.getByLabel('Color').selectOption('#2563eb');
  await form.getByLabel('Grosor').selectOption('4');
  await drag([.25,.32],[.4,.37]);
  await expect(strokes).toHaveCount(1);
  await expect(strokes.first()).toHaveAttribute('stroke','#2563eb');
  await expect(strokes.first()).toHaveAttribute('stroke-width','4');
  await tool('Deshacer').click();
  await expect(strokes).toHaveCount(0);
  await drag([.25,.32],[.4,.37]);
  await tool('Borrar trazos').click();
  await drag([.32,.343],[.33,.347]);
  await expect(strokes).toHaveCount(0);
  await tool('Deshacer').click();
  await expect(strokes).toHaveCount(1);
  await tool('Ampliar odontograma').click();
  await expect(form.getByLabel('Ampliación',{exact:true})).toHaveText('150 %');
  const before=await surface.getAttribute('viewBox');
  await tool('Desplazar').click();
  await drag([.5,.5],[.6,.6]);
  assert.notEqual(await surface.getAttribute('viewBox'),before);
  await tool('Ajustar imagen').click();
  await expect(surface).toHaveAttribute('viewBox','0 0 643 511');
  await tool('Dibujar').click();

  // Browser-native pen and touch events exercise Pointer Events and pointer capture.
  const cdp=await page.context().newCDPSession(page);
  await surface.scrollIntoViewIfNeeded();
  let box=await surface.boundingBox();
  const pen={x:box.x+box.width*.65,y:box.y+box.height*.35,pointerType:'pen'};
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...pen,button:'left',buttons:1,clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...pen,x:pen.x+30,y:pen.y+10,button:'left',buttons:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...pen,x:pen.x+30,y:pen.y+10,button:'left',buttons:0,clickCount:1});
  await expect(strokes).toHaveCount(2);
  await page.setViewportSize({width:390,height:844});
  const hideMenu=page.getByRole('button',{name:'Ocultar menú',exact:true});
  if(await hideMenu.isVisible()) await hideMenu.click();
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await surface.scrollIntoViewIfNeeded();
  box=await surface.boundingBox();
  const touch={x:box.x+box.width*.3,y:box.y+box.height*.7,id:1};
  assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('svg')?.classList.contains('odontogram-surface'),touch),true,'touch hits canvas');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touch,x:touch.x+35,y:touch.y+8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(strokes).toHaveCount(3);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await mkdir(path.join(root,'.local'),{recursive:true});
  await form.locator('.odontogram-drawing').screenshot({path:path.join(root,'.local','odontogram-mobile.png')});
  await page.setViewportSize({width:1440,height:1100});
  await form.locator('.odontogram-drawing').screenshot({path:path.join(root,'.local','odontogram-desktop.png')});
  await cdp.detach();
  console.log('PASS odontograma: ratón, lápiz y tacto mediante eventos nativos de navegador; color, grosor, deshacer, borrar, ampliar, desplazar y móvil.');
}
