"use strict";(()=>{var e={};e.id=645,e.ids=[645],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},9242:e=>{e.exports=require("pdf-parse/lib/pdf-parse.js")},5013:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>f,patchFetch:()=>y,requestAsyncStorage:()=>d,routeModule:()=>m,serverHooks:()=>h,staticGenerationAsyncStorage:()=>g});var i={};r.r(i),r.d(i,{POST:()=>p,runtime:()=>u});var s=r(9303),a=r(8716),n=r(670),o=r(7070),c=r(4385),l=r(9336);let u="nodejs";async function p(e){let t,r,i;try{t=await e.formData()}catch{return o.NextResponse.json({error:"Request must be multipart/form-data."},{status:400})}let s=t.get("jobDescriptionFile"),a=t.get("resumeFile"),n=t.get("model")??void 0,u=t.get("ollamaUrl")??void 0;if(s instanceof File&&s.size>0?r=await (0,l.b)(s):r=(t.get("jobDescriptionText")??"").trim(),a instanceof File&&a.size>0?i=await (0,l.b)(a):i=(t.get("resumeText")??"").trim(),!r)return o.NextResponse.json({error:"Job description is required. Provide jobDescriptionText or a jobDescriptionFile PDF."},{status:400});if(!i)return o.NextResponse.json({error:"Resume is required. Provide resumeText or a resumeFile PDF."},{status:400});try{let e=await (0,c.Wv)(r,i,{model:n,ollamaUrl:u});return o.NextResponse.json({...e,inputs:{jobDescription:r,resumeText:i}})}catch(r){let e=r instanceof Error?r.message:String(r),t=e.includes("fetch failed")?" Is Ollama running? Try: ollama serve":"";return o.NextResponse.json({error:`${e}${t}`},{status:500})}}let m=new s.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/score/route",pathname:"/api/score",filename:"route",bundlePath:"app/api/score/route"},resolvedPagePath:"/home/user/minis/Recruitment Screener/app/api/score/route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:d,staticGenerationAsyncStorage:g,serverHooks:h}=m,f="/api/score/route";function y(){return(0,n.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:g})}},4385:(e,t,r)=>{r.d(t,{gY:()=>a,Wv:()=>n});let i=["Technical skills","Experience & seniority","Education & certifications","Domain / industry experience","Responsibilities & scope alignment"],s={type:"object",properties:{overall_score:{type:"integer",minimum:0,maximum:100},verdict:{type:"string"},summary:{type:"string"},criteria:{type:"array",items:{type:"object",properties:{name:{type:"string"},score:{type:"integer",minimum:0,maximum:100},rationale:{type:"string"}},required:["name","score","rationale"]}},strengths:{type:"array",items:{type:"string"}},gaps:{type:"array",items:{type:"string"}}},required:["overall_score","verdict","summary","criteria","strengths","gaps"]};async function a(e,t,r){let i;let s=r?.ollamaUrl??"http://localhost:11434",a=r?.model??"llama3.1:8b",n=r?.temperature??.1;try{i=await fetch(`${s}/api/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:a,prompt:e,stream:!1,format:t,options:{temperature:n}})})}catch(t){let e=t instanceof Error?t.message:String(t);if(e.includes("fetch failed")||e.includes("ECONNREFUSED"))throw Error(`Could not reach Ollama at ${s}. Make sure Ollama is running (hint: run \`ollama serve\`). Original error: ${e}`);throw Error(`Network error contacting Ollama: ${e}`)}if(!i.ok){let e=await i.text().catch(()=>"(no body)");throw Error(`Ollama returned HTTP ${i.status}: ${e}`)}let o=await i.json();try{return JSON.parse(o.response)}catch{throw Error(`Failed to parse Ollama response as JSON. Raw response: ${o.response}`)}}async function n(e,t,r){return a(function(e,t){let r=i.map((e,t)=>`  ${t+1}. ${e}`).join("\n");return`You are an experienced technical recruiter with deep engineering knowledge. Your task is to evaluate a candidate's resume against a job description and produce a structured JSON assessment.

SCORING RULES:
- Score strictly on evidence present in the resume. Do not assume unstated skills, infer experience, or give benefit of the doubt for missing information.
- Each score is an integer from 0 to 100.
- overall_score is a holistic assessment, NOT a simple average of criterion scores.

CRITERIA:
Evaluate the candidate on exactly these 5 dimensions, in this exact order, using these exact names in the criteria array:
${r}

For each dimension provide:
- score (0-100 integer)
- rationale (1-2 sentences referencing specific details from the resume and/or job description)

OUTPUT FIELDS:
- overall_score: holistic integer 0-100 reflecting the candidate's fit for the role
- verdict: a short phrase (e.g. "Strong match", "Partial match", "Weak match")
- summary: 2-4 sentences describing the candidate's overall fit
- criteria: array of exactly 5 objects in the order listed above
- strengths: 2-4 bullet strings highlighting the candidate's strongest relevant qualities
- gaps: 2-4 bullet strings identifying the most significant missing requirements or weaknesses

---

JOB DESCRIPTION:
"""
${e}
"""

RESUME:
"""
${t}
"""`}(e,t),s,r)}},9336:(e,t,r)=>{r.d(t,{G:()=>a,b:()=>s});let i=r(9242);async function s(e){return a(Buffer.from(await e.arrayBuffer()))}async function a(e){return(await i(e)).text}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[948,972],()=>r(5013));module.exports=i})();