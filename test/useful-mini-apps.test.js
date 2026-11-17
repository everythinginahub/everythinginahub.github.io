import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {assessmentPlannerView,mountAssessmentPlanner,calculateAssessmentTarget,unitPriceComparerView,mountUnitPriceComparer,compareUnitPrices,markdownPreviewView,mountMarkdownPreview,renderSimpleMarkdown} from '../public/useful-mini-apps.js';

test('study score planner calculates whole-mark targets and describes boundary cases',()=>{
 assert.deepEqual(calculateAssessmentTarget('32','40','40','80'),{status:'possible',exact:32,required:32,nextPossible:40,target:80});
 const fractional=calculateAssessmentTarget('2','3','10','75');assert.equal(fractional.exact,7.75);assert.equal(fractional.required,8);
 assert.equal(calculateAssessmentTarget('90','100','10','80').status,'already');
 assert.equal(calculateAssessmentTarget('20','40','20','80').status,'unreachable');
 assert.equal(calculateAssessmentTarget('0','10','10','0').required,0);
 for(const args of [['','40','40','80'],['41','40','40','80'],['0','0','40','80'],['0','40','0','80'],['0','40','2.5','80'],['0','40','40','101']])assert.throws(()=>calculateAssessmentTarget(...args));
});

test('unit-price comparison converts compatible pack sizes and rejects misleading comparisons',()=>{
 const comparison=compareUnitPrices('2','500','g','3.50','1','kg');assert.equal(comparison.perA,.4);assert.equal(comparison.perB,.35);assert.equal(comparison.unitLabel,'100 g');assert.equal(comparison.better,'b');assert.ok(Math.abs(comparison.difference-.05)<1e-12);
 assert.equal(compareUnitPrices('1','500','ml','2','1','l').better,'tie');assert.equal(compareUnitPrices('6','6','each','1','1','each').unitLabel,'item');assert.equal(compareUnitPrices('0','2','each','1','1','each').better,'a');
 for(const args of [['','1','g','1','1','g'],['1','0','g','1','1','g'],['-1','1','g','1','1','g'],['1','1','g','1','1','ml'],['1','1','cups','1','1','cups']])assert.throws(()=>compareUnitPrices(...args));
});

test('Markdown preview supports useful formatting but escapes markup and blocks unsafe links',()=>{
 const markup=renderSimpleMarkdown('# Notes\n\nA **bold** and *clear* line with `a < b`.\n\n- first\n- second\n\n> a short quote\n\n[Safe](https://example.com) [unsafe](javascript:alert(1)) <img src=x onerror=alert(1)>\n\n```html\n</code><script>alert(1)</script>\n```');
 const doc=new JSDOM(`<main>${markup}</main>`).window.document;
 assert.equal(doc.querySelectorAll('h2').length,1);assert.equal(doc.querySelector('strong').textContent,'bold');assert.equal(doc.querySelector('em').textContent,'clear');assert.equal(doc.querySelectorAll('ul li').length,2);assert.equal(doc.querySelector('blockquote').textContent,'a short quote');
 assert.equal(doc.querySelector('a').getAttribute('href'),'https://example.com/');assert.equal(doc.querySelector('a').getAttribute('rel'),'noopener noreferrer');assert.equal(doc.querySelectorAll('a').length,1);
 assert.equal(doc.querySelector('img'),null);assert.equal(doc.querySelector('script'),null);assert.match(doc.body.textContent,/unsafe\]\(javascript:alert\(1\)/);assert.match(doc.body.textContent,/<img src=x onerror=alert\(1\)>/);assert.match(doc.querySelector('pre').textContent,/<script>alert\(1\)<\/script>/);
 assert.match(renderSimpleMarkdown(''),/markdown-empty/);
});

test('the new standalone tool views mount, update safely and detach their listeners',()=>{
 const open=html=>{const dom=new JSDOM(`<main>${html}</main>`,{url:'https://example.test'});return{dom,win:dom.window,root:dom.window.document.querySelector('main')};};
 {
  const {dom,win,root}=open(assessmentPlannerView()),controller=mountAssessmentPlanner({root,win}),form=root.querySelector('#assessmentPlanForm');form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert.match(root.querySelector('#assessmentPlanResult').textContent,/32 of 40 whole marks/);form.elements.earned.value='41';form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert.match(root.querySelector('#assessmentPlanResult').textContent,/cannot exceed/);controller.destroy();form.elements.earned.value='32';form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert.match(root.querySelector('#assessmentPlanResult').textContent,/cannot exceed/);dom.window.close();
 }
 {
  const {dom,win,root}=open(unitPriceComparerView()),controller=mountUnitPriceComparer({root,win}),form=root.querySelector('#unitPriceForm');form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert.match(root.querySelector('#unitPriceResult').textContent,/Bulk pack is better value/);form.elements.nameA.value='<img>';form.elements.unitB.value='ml';form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert.match(root.querySelector('#unitPriceResult').textContent,/same kind of unit/);assert.equal(root.querySelector('#unitPriceResult img'),null);controller.destroy();dom.window.close();
 }
 {
  const {dom,win,root}=open(markdownPreviewView()),controller=mountMarkdownPreview({root}),input=root.querySelector('#markdownSource'),preview=root.querySelector('#markdownPreview');input.value='<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))';input.dispatchEvent(new win.Event('input',{bubbles:true}));assert.equal(preview.querySelector('img'),null);assert.equal(preview.querySelectorAll('a').length,0);assert.match(preview.textContent,/<img src=x/);controller.destroy();input.value='**no longer updates**';input.dispatchEvent(new win.Event('input',{bubbles:true}));assert.equal(preview.querySelector('strong'),null);dom.window.close();
 }
});
