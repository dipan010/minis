"use strict";(()=>{var e={};e.id=330,e.ids=[330],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3262:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>v,patchFetch:()=>b,requestAsyncStorage:()=>g,routeModule:()=>h,serverHooks:()=>f,staticGenerationAsyncStorage:()=>y});var i={};r.r(i),r.d(i,{POST:()=>d,runtime:()=>m});var s=r(9303),a=r(8716),n=r(670),o=r(7070),c=r(4385);let u={type:"object",properties:{question:{type:"string"},rationale:{type:"string"},what_to_look_for:{type:"string"}},required:["question","rationale","what_to_look_for"]},l={type:"object",properties:{technical:{type:"array",items:u,minItems:4,maxItems:4},behavioural:{type:"array",items:u,minItems:4,maxItems:4},culture:{type:"array",items:u,minItems:4,maxItems:4}},required:["technical","behavioural","culture"]};async function p(e,t,r,i){return(0,c.gY)(`You are a senior technical interviewer designing a tailored interview kit for a specific candidate. You have the job description, the candidate's resume, and a structured screening report that already scored the candidate against the role.

Generate EXACTLY 12 interview questions in three categories of 4 questions each:

1. "technical" — 4 questions that probe the SPECIFIC skill gaps identified in the screening report below. Each question should target a concrete gap or unverified claim, not generic trivia.
2. "behavioural" — 4 STAR-format questions (Situation, Task, Action, Result) tied to the role's actual responsibilities from the job description. Phrase them as "Tell me about a time…" style prompts.
3. "culture" — 4 culture-fit questions grounded in the company values and working style that can be inferred from the job description (collaboration style, pace, ownership, customer focus, etc.).

For every question provide:
- question: the exact wording the interviewer should ask
- rationale: 1-2 sentences on WHY this question matters for THIS candidate (reference the specific gap, resume claim, or JD requirement it probes)
- what_to_look_for: 1-2 sentences describing what a strong answer looks like, so a non-expert interviewer can evaluate the response

---

SCREENING REPORT (JSON):
"""
${JSON.stringify(e,null,2)}
"""

JOB DESCRIPTION:
"""
${t}
"""

RESUME:
"""
${r}
"""`,l,{temperature:.4,...i})}let m="nodejs";async function d(e){let t;try{t=await e.json()}catch{return o.NextResponse.json({error:"Request body must be JSON."},{status:400})}let{report:r,jobDescription:i,resumeText:s,model:a,ollamaUrl:n}=t;if(!r||"number"!=typeof r.overall_score)return o.NextResponse.json({error:"A scoring report is required. Provide the /api/score result as `report`."},{status:400});if(!i?.trim()||!s?.trim())return o.NextResponse.json({error:"Both jobDescription and resumeText are required for context."},{status:400});try{let e=await p(r,i,s,{model:a,ollamaUrl:n});return o.NextResponse.json(e)}catch(t){let e=t instanceof Error?t.message:String(t);return o.NextResponse.json({error:e},{status:500})}}let h=new s.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/questions/route",pathname:"/api/questions",filename:"route",bundlePath:"app/api/questions/route"},resolvedPagePath:"/home/user/minis/Recruitment Screener/app/api/questions/route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:g,staticGenerationAsyncStorage:y,serverHooks:f}=h,v="/api/questions/route";function b(){return(0,n.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:y})}},4385:(e,t,r)=>{r.d(t,{gY:()=>a,Wv:()=>n});let i=["Technical skills","Experience & seniority","Education & certifications","Domain / industry experience","Responsibilities & scope alignment"],s={type:"object",properties:{overall_score:{type:"integer",minimum:0,maximum:100},verdict:{type:"string"},summary:{type:"string"},criteria:{type:"array",items:{type:"object",properties:{name:{type:"string"},score:{type:"integer",minimum:0,maximum:100},rationale:{type:"string"}},required:["name","score","rationale"]}},strengths:{type:"array",items:{type:"string"}},gaps:{type:"array",items:{type:"string"}}},required:["overall_score","verdict","summary","criteria","strengths","gaps"]};async function a(e,t,r){let i;let s=r?.ollamaUrl??"http://localhost:11434",a=r?.model??"llama3.1:8b",n=r?.temperature??.1;try{i=await fetch(`${s}/api/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:a,prompt:e,stream:!1,format:t,options:{temperature:n}})})}catch(t){let e=t instanceof Error?t.message:String(t);if(e.includes("fetch failed")||e.includes("ECONNREFUSED"))throw Error(`Could not reach Ollama at ${s}. Make sure Ollama is running (hint: run \`ollama serve\`). Original error: ${e}`);throw Error(`Network error contacting Ollama: ${e}`)}if(!i.ok){let e=await i.text().catch(()=>"(no body)");throw Error(`Ollama returned HTTP ${i.status}: ${e}`)}let o=await i.json();try{return JSON.parse(o.response)}catch{throw Error(`Failed to parse Ollama response as JSON. Raw response: ${o.response}`)}}async function n(e,t,r){return a(function(e,t){let r=i.map((e,t)=>`  ${t+1}. ${e}`).join("\n");return`You are an experienced technical recruiter with deep engineering knowledge. Your task is to evaluate a candidate's resume against a job description and produce a structured JSON assessment.

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
"""`}(e,t),s,r)}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[948,972],()=>r(3262));module.exports=i})();