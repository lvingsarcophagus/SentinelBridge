(()=>{var a={};a.id=144,a.ids=[144],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},2743:()=>{},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},14415:()=>{},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},28354:a=>{"use strict";a.exports=require("util")},29021:a=>{"use strict";a.exports=require("fs")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:a=>{"use strict";a.exports=require("path")},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66664:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>I,patchFetch:()=>H,routeModule:()=>D,serverHooks:()=>G,workAsyncStorage:()=>E,workUnitAsyncStorage:()=>F});var d={};c.r(d),c.d(d,{GET:()=>C});var e=c(27134),f=c(19511),g=c(79886),h=c(19520),i=c(68446),j=c(261),k=c(28384),l=c(9298),m=c(62834),n=c(6289),o=c(47039),p=c(67509),q=c(86419),r=c(81796),s=c(86439),t=c(67418),u=c(94015),v=c(79646),w=c(28354),x=c(29021),y=c.n(x),z=c(33873),A=c.n(z);let B=(0,w.promisify)(v.exec);async function C(){try{let a,b=A().join(process.cwd(),"tmp/bridge-address.json");if(!y().existsSync(b))return u.NextResponse.json({error:"Contract not deployed"},{status:400});let{address:c}=JSON.parse(y().readFileSync(b,"utf-8")),d=A().join(process.cwd(),"artifacts/contracts/SourceBridge.sol/SourceBridge.json");if(!y().existsSync(d))return u.NextResponse.json({error:"ABI not found"},{status:400});let e=`
import { ethers } from "ethers";
import fs from "fs";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const abi = JSON.parse(fs.readFileSync("${d.replace(/\\/g,"/")}"))["abi"];
  const contract = new ethers.Contract("${c}", abi, provider);
  const riskRatio = await contract.getRiskRatio();
  const source = await contract.getSourceReserves();
  const dest = await contract.getDestReserves();
  const locked = await contract.getLockedAmount();
  const paused = await contract.isPaused();
  const govCompromised = await contract.governanceCompromised();
  const proofFailed = await contract.failedProof();
  console.log(JSON.stringify({
    ok: true,
    isPaused: paused,
    riskRatio: Number(riskRatio),
    sourceReserve: ethers.formatEther(source),
    destReserve: ethers.formatEther(dest),
    targetLocked: ethers.formatEther(locked),
    lastCheck: new Date().toISOString(),
    lastTransactionHash: null,
    governanceCompromised: govCompromised,
    failedProof: proofFailed
  }));
}
main();
    `,f=A().join(process.cwd(),"tmp/fetch-status-tmp.js");y().writeFileSync(f,e);try{let{stdout:b}=await B(`node ${f}`);a=JSON.parse(b)}catch(a){return console.error("fetch-status script failed:",a.message),u.NextResponse.json({error:"Failed to read state"},{status:500})}finally{y().existsSync(f)&&y().unlinkSync(f)}let g=A().join(process.cwd(),"src/workflows/sentinel-bridge/config.json"),h={assessment:"SYSTEM OFFLINE",confidence:0,details:"No active AI config found.",recommendation:"MONITOR"};if(y().existsSync(g)){let b=JSON.parse(y().readFileSync(g,"utf-8")).groqApiKey;if(b&&"gsk_..."!==b){let c=parseFloat(a.targetLocked)-200,d="NORMAL";c>=500?d="SINGLE_BLOCK_SPIKE":c>=50&&(d="GRADUAL_INCREASE");let e=`You are SentinelBridge AI, an advanced on-chain risk analyst. 
Analyze the following live bridge state and provide a JSON response exactly matching this structure, no markdown:
{
  "assessment": "A short max 3-word title",
  "confidence": 95,
  "details": "A 1-2 sentence explanation of WHAT is happening based on the metrics.",
  "recommendation": "MONITOR"
}

CRITICAL CLASSIFICATION RULES:
- If Velocity Indicator is "SINGLE_BLOCK_SPIKE" (delta >= 500 ETH in one observation): assessment MUST be "FLASH LOAN CRISIS" or "FLASH CRISIS"
- If Velocity Indicator is "GRADUAL_INCREASE" (delta 50-500 ETH over multiple observations): assessment should be "STEALTH DRAIN" 
- If Governance Event is CRITICAL_DETECTED: assessment should be "GOVERNANCE HIJACK"
- If Proof Failure is CRITICAL_DETECTED: assessment should be "PROOF FRAUD"
- If Risk < 30% and velocity is NORMAL: assessment should be "NORMAL CLEAR"

Baseline normal Risk Ratio is ~20% (200 ETH locked / 1000 ETH reserves). Hard pause is at 80%.

Live Telemetry:
- Risk Ratio: ${a.riskRatio}%
- Locked Amount: ${a.targetLocked} ETH
- Source Reserves: ${a.sourceReserve} ETH
- Destination Reserves: ${a.destReserve} ETH
- Locked Delta from Baseline: ${c.toFixed(1)} ETH
- Velocity Indicator: ${d}
- Circuit Breaker Status: ${a.isPaused?"ACTIVATED":"INACTIVE"}
- Unauthorized Governance Event: ${a.governanceCompromised?"CRITICAL_DETECTED":"None"}
- Proof Verification Failure: ${a.failedProof?"CRITICAL_DETECTED":"None"}`;try{let a=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${b}`,"Content-Type":"application/json"},body:JSON.stringify({model:"llama-3.1-8b-instant",messages:[{role:"user",content:e}],temperature:.1})});if(a.ok){let b=await a.json();h=JSON.parse(b.choices[0].message.content)}}catch(a){console.error("Groq status integration failed:",a)}}}return u.NextResponse.json({...a,ai:h})}catch(a){return u.NextResponse.json({error:String(a)},{status:500})}}let D=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/status/route",pathname:"/api/status",filename:"route",bundlePath:"app/api/status/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\nayan\\OneDrive\\Desktop\\NJ_PROJ_2026\\SentinelBridge\\app\\api\\status\\route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:E,workUnitAsyncStorage:F,serverHooks:G}=D;function H(){return(0,g.patchFetch)({workAsyncStorage:E,workUnitAsyncStorage:F})}async function I(a,b,c){var d;let e="/api/status/route";"/index"===e&&(e="/");let g=await D.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,E=(0,j.normalizeAppPath)(e),F=!!(y.dynamicRoutes[E]||y.routes[C]);if(F&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||D.isDev||x||(G="/index"===(G=C)?"/":G);let H=!0===D.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>D.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>D.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await D.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})},z),b}},l=await D.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await D.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},79646:a=>{"use strict";a.exports=require("child_process")},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[879,332],()=>b(b.s=66664));module.exports=c})();