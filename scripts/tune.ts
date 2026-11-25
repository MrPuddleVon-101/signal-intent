import { runTrial } from '../src/model/trial'
import { DEFAULT_DECODER, BASE_TEMPLATES, collectExamples, calibrateTemplates } from '../src/model/templates'
import { GESTURES } from '../src/model/types'
const N=60
const row=(label:string,p:any,d=DEFAULT_DECODER)=>{ const o=GESTURES.map(g=>{const c:any={};let sc=0;for(let s=1;s<=N;s++){const t=runTrial({...p,requestedGesture:g,seed:s},d);c[t.decision.event??'none']=(c[t.decision.event??'none']||0)+1;sc+=t.decision.scores[g]}return g+' '+JSON.stringify(c)+' '+(sc/N).toFixed(2)}).join(' | ');console.log(label.padEnd(14),o)}
row('normal',{});for(const a of [10,20,30,38,45])row('shift'+a,{placementAngle:a});for(const q of [.7,.5,.3,.15])row('contact'+q,{contactQuality:q})
for(const i of [.7,.5,.35])row('int'+i,{intensity:i});row('noise2',{noiseLevel:2});row('noise3',{noiseLevel:3})
row('user1',{userProfile:1});row('user2',{userProfile:2})
row('reversed',{}, {...DEFAULT_DECODER,windowOrder:[3,2,1,0]})
for(const s of [{placementAngle:40,contactQuality:1},{placementAngle:0,contactQuality:.3}]){const e=collectExamples({noiseLevel:1,userProfile:0,...s} as any,3);row('cal'+s.placementAngle,s,{...DEFAULT_DECODER,templates:calibrateTemplates(BASE_TEMPLATES,e)})}
row('onechan',{}, {...DEFAULT_DECODER,channelMask:[0,0,1,0,0,0,0,0].map(Boolean)})
row('thr .35',{}, {...DEFAULT_DECODER,threshold:.3,margin:.02,gate:.02}); row('rest n3',{noiseLevel:3},{...DEFAULT_DECODER,threshold:.3,margin:.02,gate:.02})
for(const g of GESTURES){console.log(g);const v=BASE_TEMPLATES.vectors[g];for(let c=0;c<8;c++)console.log('S'+(c+1),[0,1,2,3].map(k=>v[c*4+k].toFixed(2)).join(' '))}
