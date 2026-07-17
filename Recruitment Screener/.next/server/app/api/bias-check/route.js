"use strict";(()=>{var e={};e.id=42,e.ids=[42],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2008:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>f,patchFetch:()=>v,requestAsyncStorage:()=>m,routeModule:()=>g,serverHooks:()=>y,staticGenerationAsyncStorage:()=>h});var i={};r.r(i),r.d(i,{POST:()=>p,runtime:()=>d});var a=r(9303),n=r(8716),s=r(670),o=r(7070),c=r(4385);let l={type:"object",properties:{flags:{type:"array",items:{type:"object",properties:{type:{type:"string",enum:["age","gender_coded_language","educational_prestige","name_ethnicity_inference","employment_gap_penalty","other"]},severity:{type:"string",enum:["low","medium","high"]},detail:{type:"string"},recommendation:{type:"string"}},required:["type","severity","detail","recommendation"]}},overall_risk:{type:"string",enum:["low","medium","high"]}},required:["flags","overall_risk"]};async function u(e,t,r,i){return(0,c.gY)(`You are a fairness auditor reviewing an AI-generated candidate screening report for potential hiring bias. You are NOT re-scoring the candidate — you are checking whether the assessment itself shows bias signals.

Review the screening report (and the source documents for context) for these specific bias categories:

1. "age" — age indicators influencing the assessment (graduation years, "digital native", "overqualified", career length used against the candidate)
2. "gender_coded_language" — gendered or gender-coded language in the rationale, verdict, or summary (e.g. "aggressive", "nurturing", "rockstar", "ninja")
3. "educational_prestige" — weight given to institution prestige rather than demonstrated skills or the JD's actual requirements
4. "name_ethnicity_inference" — any sign the candidate's name, or inferred ethnicity/nationality, coloured the assessment
5. "employment_gap_penalty" — career gaps penalized without job-relevant justification
6. "other" — any other fairness concern (parental status, location, accent/language proxies, etc.)

RULES:
- Only raise a flag when there is concrete evidence in the report's text. Quote or paraphrase the offending passage in "detail".
- For each flag give a practical "recommendation" the recruiter can act on (e.g. re-run scoring with names redacted, ignore a criterion, verify a claim in interview).
- severity: "low" = worth awareness, "medium" = likely influenced a score, "high" = materially unfair assessment.
- overall_risk reflects the worst credible flag: no flags or trivial ones = "low".
- An empty flags array with overall_risk "low" is the CORRECT output for a clean report. Do not invent flags.

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
"""`,l,{temperature:.1,...i})}let d="nodejs";async function p(e){let t;try{t=await e.json()}catch{return o.NextResponse.json({error:"Request body must be JSON."},{status:400})}let{report:r,jobDescription:i,resumeText:a,model:n,ollamaUrl:s}=t;if(!r||"number"!=typeof r.overall_score)return o.NextResponse.json({error:"A scoring report is required. Provide the /api/score result as `report`."},{status:400});if(!i?.trim()||!a?.trim())return o.NextResponse.json({error:"Both jobDescription and resumeText are required for context."},{status:400});try{let e=await u(r,i,a,{model:n,ollamaUrl:s});return o.NextResponse.json(e)}catch(t){let e=t instanceof Error?t.message:String(t);return o.NextResponse.json({error:e},{status:500})}}let g=new a.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/bias-check/route",pathname:"/api/bias-check",filename:"route",bundlePath:"app/api/bias-check/route"},resolvedPagePath:"/home/user/minis/Recruitment Screener/app/api/bias-check/route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:m,staticGenerationAsyncStorage:h,serverHooks:y}=g,f="/api/bias-check/route";function v(){return(0,s.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:h})}},4385:(e,t,r)=>{r.d(t,{gY:()=>n,Wv:()=>s});let i=["Technical skills","Experience & seniority","Education & certifications","Domain / industry experience","Responsibilities & scope alignment"],a={type:"object",properties:{overall_score:{type:"integer",minimum:0,maximum:100},verdict:{type:"string"},summary:{type:"string"},criteria:{type:"array",items:{type:"object",properties:{name:{type:"string"},score:{type:"integer",minimum:0,maximum:100},rationale:{type:"string"}},required:["name","score","rationale"]}},strengths:{type:"array",items:{type:"string"}},gaps:{type:"array",items:{type:"string"}}},required:["overall_score","verdict","summary","criteria","strengths","gaps"]};async function n(e,t,r){let i;let a=r?.ollamaUrl??"http://localhost:11434",n=r?.model??"llama3.1:8b",s=r?.temperature??.1;try{i=await fetch(`${a}/api/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:n,prompt:e,stream:!1,format:t,options:{temperature:s}})})}catch(t){let e=t instanceof Error?t.message:String(t);if(e.includes("fetch failed")||e.includes("ECONNREFUSED"))throw Error(`Could not reach Ollama at ${a}. Make sure Ollama is running (hint: run \`ollama serve\`). Original error: ${e}`);throw Error(`Network error contacting Ollama: ${e}`)}if(!i.ok){let e=await i.text().catch(()=>"(no body)");throw Error(`Ollama returned HTTP ${i.status}: ${e}`)}let o=await i.json();try{return JSON.parse(o.response)}catch{throw Error(`Failed to parse Ollama response as JSON. Raw response: ${o.response}`)}}async function s(e,t,r){return n(function(e,t){let r=i.map((e,t)=>`  ${t+1}. ${e}`).join("\n");return`You are an experienced technical recruiter with deep engineering knowledge. Your task is to evaluate a candidate's resume against a job description and produce a structured JSON assessment.

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
"""`}(e,t),a,r)}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[948,972],()=>r(2008));module.exports=i})();