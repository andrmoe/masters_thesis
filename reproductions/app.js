// AI-written. Reads artifacts as data; it never executes their commands or HTML.
import {status, statusLabels, safePath, parseLog, matches, bytes, chooseAttempt} from './model.mjs';
import {parseDiff} from './diff.mjs';
const $ = id => document.getElementById(id);
const el = (tag, text, className) => { const node=document.createElement(tag); if(text!==undefined)node.textContent=text; if(className)node.className=className; return node; };
const append = (parent,...children) => { parent.append(...children.filter(Boolean)); return parent; };
let papers=[], selected, selectedAttempt, generation=0;
const json = async url => {const response=await fetch(url);if(!response.ok)throw Error(`${response.status}: ${url}`);return response.json();};
const text = async url => {const response=await fetch(url);if(!response.ok)throw Error(`${response.status}: ${url}`);return response.text();};
function link(label, href) {const a=el('a',label);a.href=href;return a;}
function external(label, href) {try {if(!['https:','http:'].includes(new URL(href).protocol))return el('span',label);} catch{return el('span',label);}return link(label,href);}
function fileURL(base,path) {return base+safePath(path);}
function badge(label, type='') {return el('span',label,`badge ${type}`);}
function rawDetails(title,value) {const details=el('details');append(details,el('summary',title),el('pre',typeof value==='string'?value:JSON.stringify(value,null,2)));return details;}
function fact(list,label,value) {append(list,el('dt',label),el('dd',typeof value==='string'?value:JSON.stringify(value)));}
function queue() {
  const shown=papers.filter(p=>matches(p,$('search').value,'all'));
  const select=$('run-select');select.replaceChildren(...shown.map(p=>{
    const attempt=chooseAttempt(p.attempts);
    const option=el('option',`${String(p.rank).padStart(2,'0')} · ${p.title} · ${statusLabels[attempt?.status??'pending']}`);
    option.value=p.id;option.selected=p.id===selected;return option;
  }));
  if(!shown.length){const option=el('option','No matching papers');option.disabled=true;select.append(option);}
  const index=papers.findIndex(p=>p.id===selected);
  $('previous-paper').disabled=index<=0;$('next-paper').disabled=index<0||index===papers.length-1;
  $('paper-position').textContent=`${index+1} / ${papers.length}`;
}
function navigatePaper(offset) {
  const next=papers[papers.findIndex(p=>p.id===selected)+offset];
  if(next){$('search').value='';location.hash=next.id;}
}
function renderDiff(container,patch,base) {
  const files=parseDiff(patch);
  const header=append(el('div',undefined,'diff-heading'),el('h3','Submitted code diff'),link('Download exact repair.diff ↗',base+'repair.diff'));
  container.append(header,el('p','Red lines come from the original source; green lines are the agent’s submitted additions. Line numbers refer to the original and repaired files.','muted'));
  if(!patch.trim()){container.append(el('p','No source-code changes were submitted. See the environment and execution plan below.','notice'));return;}
  if(!files.length){container.append(el('pre',patch));return;}
  const navigation=el('div',undefined,'diff-file-links');
  files.forEach((file,index)=>{const a=link(file.name,`#diff-file-${index}`);a.addEventListener('click',event=>{event.preventDefault();document.getElementById(`diff-file-${index}`)?.scrollIntoView({behavior:'smooth',block:'start'});});navigation.append(a);});container.append(navigation);
  for(const [index,file]of files.entries()) {
    const section=el('section',undefined,'diff-file');section.id=`diff-file-${index}`;
    const title=append(el('div',undefined,'diff-file-heading'),el('h4',file.name),el('span',`${file.kind} · AI-submitted · +${file.added} −${file.removed}`));section.append(title);
    const code=el('div',undefined,'diff-code');code.tabIndex=0;code.setAttribute('role','region');code.setAttribute('aria-label',`Code diff for ${file.name}`);
    for(const row of file.rows) {
      const line=el('div',undefined,`diff-line ${row.type}`);
      append(line,el('span',row.old===undefined?'':String(row.old),'diff-number'),el('span',row.next===undefined?'':String(row.next),'diff-number'),el('span',row.type==='added'?'+':row.type==='removed'?'−':'','diff-sign'),el('code',row.text||' '));code.append(line);
    }
    section.append(code);container.append(section);
  }
}
function renderEnvironmentAndResults(container,dockerfile,files,record,base) {
  const top=el('div',undefined,'artifact-overview');
  const environment=el('section',undefined,'environment-section');
  append(environment,append(el('div',undefined,'diff-heading'),el('h3','Dockerfile'),link('Download Dockerfile ↗',base+'Dockerfile')),el('p','Agent-submitted environment · AI-written','muted'));
  const source=el('pre',undefined,'dockerfile-source');const code=el('code',dockerfile);source.append(code);environment.append(source);
  const results=el('section',undefined,'results-section');
  append(results,el('h3','Results'),el('p','Recorded files under results/. File trees are preserved; result files are retained locally and excluded from Git. Links work when the local results are available.','muted'));
  const paths=files.filter(file=>file.path.startsWith('results/'));
  const tree={children:new Map()};
  for(const file of paths) {
    const parts=file.path.split('/');let node=tree;
    for(const part of parts){if(!node.children.has(part))node.children.set(part,{name:part,children:new Map()});node=node.children.get(part);}
    node.file=file;
  }
  const assessments=new Set([...record.assessments.map(a=>a.path),'results/assessment.md']);
  function branch(node) {
    const list=el('ul',undefined,'file-tree');
    for(const child of [...node.children.values()].sort((a,b)=>Boolean(a.file)-Boolean(b.file)||a.name.localeCompare(b.name))) {
      const item=el('li');
      if(child.file) {
        const row=el('div',undefined,`tree-file ${assessments.has(child.file.path)?'agent-result':''}`);
        try {const a=link(child.name,fileURL(base,child.file.path));a.target='_blank';a.rel='noopener';row.append(a,el('span',bytes(child.file.bytes),'tree-size'));if(assessments.has(child.file.path))row.append(el('span','AI-written','tree-origin'));}catch{row.append(el('span',child.name+' · invalid path'));}
        item.append(row);
      } else {const folder=el('details');folder.open=true;append(folder,el('summary',child.name+'/'),branch(child));item.append(folder);}
      list.append(item);
    }
    return list;
  }
  if(paths.length)results.append(branch(tree));else results.append(el('p','No result files have been published.','muted'));
  append(top,environment,results);container.append(top);
}
async function preview(container, base, path, label=path) {
  try {
    const url=fileURL(base,path);
    const details=el('details');append(details,el('summary',label),link('Download original file ↗',url));container.append(details);
    let loaded=false; details.addEventListener('toggle',async()=>{
      if(!details.open||loaded)return;loaded=true;
      if(/\.(png|jpe?g|gif|webp)$/i.test(path)) {const img=el('img',undefined,'preview-image');img.src=url;img.alt=label;details.append(img);}
      else if(/\.(txt|md|json|jsonl|csv|tsv|log|diff|r|py|sh)$/i.test(path)||/Dockerfile$/.test(path)) {
        try {const response=await fetch(url);if(!response.ok)throw Error(`HTTP ${response.status}`);const size=Number(response.headers.get('content-length'));if(size>1048576){details.append(el('p','Large file: use the download link.','muted'));return;}const body=await response.text();details.append(el('pre',body.length>500000?body.slice(0,500000)+'\n[Preview truncated; download the original above.]':body));}
        catch(error){details.append(el('p',`Preview unavailable: ${error.message}`,'muted'));}
      } else details.append(el('p','Use the link to open or download this file.','muted'));
    });
  } catch(error) {container.append(el('p',`Rejected output reference: ${String(path)} (${error.message})`,'notice'));}
}
async function show() {
  const token=++generation;
  const [paperId,attemptId]=decodeURIComponent(location.hash.slice(1)).split('/');
  selected=paperId||papers[0]?.id;
  const p=papers.find(x=>x.id===selected)||papers[0];if(!p)return;selected=p.id;
  selectedAttempt=chooseAttempt(p.attempts,attemptId)?.id??null;queue();
  const detail=$('detail');detail.replaceChildren();
  append(detail,el('h2',p.title),append(el('div',undefined,'diff-meta'),el('span',`${p.year} · ${p.dataset} · ${p.languages.join(' / ')}`,'subtitle'),badge(statusLabels[p.attempts.find(a=>a.id===selectedAttempt)?.status??'pending'],p.attempts.find(a=>a.id===selectedAttempt)?.status??'pending'),external('Original code ↗',p.source_url)));
  if(!p.attempts.length) {append(detail,append(el('div',undefined,'notice'),el('strong','No submitted attempt'),el('p','No reproduction artifact was submitted for this paper. Its selection and planned scope do not constitute execution evidence.')));return;}
  const attempts=el('div',undefined,'attempt-tabs');attempts.setAttribute('role','tablist');attempts.setAttribute('aria-label','Reproduction attempts');
  const ordered=[...p.attempts].sort((a,b)=>(b.status==='executed')-(a.status==='executed'));
  for(const attempt of ordered) {
    const button=el('button',`${attempt.status==='executed'?'Successful execution':attempt.status==='failed'?'Unsuccessful':statusLabels[attempt.status]} · ${attempt.id}`);
    button.type='button';button.className=attempt.status;button.id='attempt-'+attempt.id;button.setAttribute('role','tab');button.setAttribute('aria-selected',String(attempt.id===selectedAttempt));button.setAttribute('aria-controls','attempt-content');button.tabIndex=attempt.id===selectedAttempt?0:-1;
    button.addEventListener('click',()=>{location.hash=p.id+'/'+attempt.id;});
    button.addEventListener('keydown',event=>{
      let index=ordered.findIndex(a=>a.id===attempt.id);
      if(event.key==='ArrowRight')index=(index+1)%ordered.length;else if(event.key==='ArrowLeft')index=(index+ordered.length-1)%ordered.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=ordered.length-1;else return;
      event.preventDefault();location.hash=p.id+'/'+ordered[index].id;
      requestAnimationFrame(()=>document.getElementById('attempt-'+ordered[index].id)?.focus());
    });attempts.append(button);
  }
  detail.append(attempts);
  const content=el('div');content.id='attempt-content';content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby','attempt-'+selectedAttempt);detail.append(content);
  const render=async()=>{
    content.replaceChildren(el('p','Reading artifact…','muted'));
    const attempt=p.attempts.find(a=>a.id===selectedAttempt);
    let base;
    try {
      base=safePath(attempt.path.replace(/\/$/,''))+'/';
      const [record,study,files,log,patch,dockerfile]=await Promise.all([json(base+'reproduction.json'),json(base+'study.json'),json(base+'files.json'),text(base+'repair_log.jsonl'),text(base+'repair.diff'),text(base+'Dockerfile')]);
      if(token!==generation)return;
      content.replaceChildren();
      append(content,el('p',`Original source commit: ${record.repository.commit}`,'source-commit'));
      renderEnvironmentAndResults(content,dockerfile,files,record,base);
      const diff=el('div',undefined,'primary-diff');content.append(diff);renderDiff(diff,patch,base);
      const recorded=append(el('div',undefined,'runner-highlight'),el('span','Runner recorded','label'));
      const facts=el('dl',undefined,'facts');fact(facts,'Image',record.image??'Not built');fact(facts,'Container exit',record.exit_code===null?'Not recorded':String(record.exit_code));fact(facts,'Output files',record.outputs?String(record.outputs.files.length+2):'No execution output inventory');recorded.append(facts);content.append(recorded);
      const tabs=el('div',undefined,'tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Artifact evidence');content.append(tabs);
      const sections=['Agent submission','Execution evidence','Study & coverage','Repair history','Files'];const panels=[];
      sections.forEach((name,i)=>{
        const button=el('button',name);button.type='button';button.id=`tab-${i}`;button.setAttribute('role','tab');button.setAttribute('aria-selected',String(i===0));button.setAttribute('aria-controls',`panel-${i}`);button.tabIndex=i===0?0:-1;
        const panel=el('section',undefined,'panel');panel.id=`panel-${i}`;panel.hidden=i!==0;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panels.push(panel);
        const activate=()=>{[...tabs.children].forEach((b,j)=>{b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1;panels[j].hidden=i!==j;});};button.addEventListener('click',activate);button.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(i+1)%sections.length;else if(event.key==='ArrowLeft')next=(i+sections.length-1)%sections.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=sections.length-1;else return;event.preventDefault();tabs.children[next].click();tabs.children[next].focus();});tabs.append(button);content.append(panel);
      });
      const [submission,evidence,coverage,history,downloads]=panels;
      submission.classList.add('agent-panel');
      append(submission,el('h3','Agent submission · AI-written'),el('p','The agent chose the workload and submitted the study extraction, plan, environment, patch, and assessments. The runner independently filled the image ID, exit code, and output inventory.','muted'));
      const submittedFacts=el('dl',undefined,'facts');fact(submittedFacts,'Source',record.repository.url);fact(submittedFacts,'Commit',record.repository.commit);fact(submittedFacts,'Command',record.command);fact(submittedFacts,'Working dir',record.working_directory);submission.append(submittedFacts);
      const agentPlan=Object.fromEntries(Object.entries(record).filter(([key])=>!['image','exit_code','outputs'].includes(key)));
      submission.append(rawDetails('Submitted execution plan · agent-owned fields',agentPlan));
      preview(submission,base,'study.json','Study extraction · study.json');preview(submission,base,'Dockerfile','Submitted environment · Dockerfile');preview(submission,base,'repair.diff','Submitted code changes · repair.diff');
      if(files.some(f=>f.path==='README.md'))preview(submission,base,'README.md','Submitted scope and repair notes · README.md');
      const submittedAssessments=[...new Set(record.assessments.map(a=>a.path))];
      if(!submittedAssessments.length && files.some(f=>f.path==='results/assessment.md'))submittedAssessments.push('results/assessment.md');
      for(const path of submittedAssessments) {
        const block=append(el('div',undefined,'submitted-assessment'),el('span','Submitted assessment · AI-written','label'));submission.append(block);
        try {const body=await text(fileURL(base,path));if(/\.(md|txt)$/i.test(path))block.append(el('pre',body));else block.append(el('p','Open the assessment below.','muted'));}catch(error){block.append(el('p',`Assessment unavailable: ${error.message}`,'muted'));}
        preview(block,base,path,path);
      }
      if(!submittedAssessments.length)submission.append(el('p','No assessment was submitted.','muted'));
      append(evidence,el('h3','Assessment'),el('p','AI-written interpretation is separate from captured program output. Read each assessment for scope, comparisons, and limitations.','muted'));
      const assessments=new Map();for(const a of record.assessments)assessments.set(a.path,[...(assessments.get(a.path)||[]),a.analysis]);
      if(assessments.size)for(const [path,analyses] of assessments)preview(evidence,base,path,`${analyses.join(', ')} · ${path}`);else evidence.append(el('p','No analysis assessment is recorded.','muted'));
      if(files.some(f=>f.path==='README.md'))preview(evidence,base,'README.md','Scope and repair notes · AI-written');
      evidence.append(el('h3','Captured output'));
      if(record.outputs){preview(evidence,base,record.outputs.stdout,'Standard output · captured');preview(evidence,base,record.outputs.stderr,'Standard error · captured');for(const path of record.outputs.files)if(!assessments.has(path))preview(evidence,base,path);}
      else evidence.append(el('p','No completed container execution is recorded. Build or runner failures may appear in the repair history and files.','notice'));
      coverage.append(el('h3','Scheduled order'));
      const ordered=el('ol');for(const id of record.experiments)ordered.append(el('li',`${id}: ${study.Experiments?.[id]?.experiment_description??'See study.json'}`));coverage.append(ordered);
      coverage.append(el('p','The schedule does not prove every step ran. Consult skipped experiments and captured output.','muted'),el('h3','Unattempted experiments'));
      if(record.unattempted_experiments.length)for(const item of record.unattempted_experiments)append(coverage,el('p',`${item.experiment}: ${item.reason}`));else coverage.append(el('p','None declared.','muted'));
      coverage.append(el('h3','Recorded analyses'),el('p',record.analyses.join(', ')||'None declared.','muted'),rawDetails('Full Snelleman-compatible study.json',study),rawDetails('Canonical reproduction.json',record));
      history.append(el('h3','Repair history · agent and runner entries'));
      for(const item of parseLog(log))append(history,append(el('div',undefined,'log-entry'),el('time',item.time),el('p',item.action),el('p',item.reason,'muted')));
      preview(history,base,'repair.diff','Code changes · repair.diff');preview(history,base,'Dockerfile','Environment · Dockerfile');
      downloads.append(el('h3','Original artifact files'),el('p','Files are served as recorded. The publication inventory includes file sizes and SHA-256 hashes.','muted'),link('Download publication inventory ↗',base+'files.json'));
      for(const f of files) {try {
        const agentFiles=['study.json','Dockerfile','repair.diff','README.md','provenance.json',...submittedAssessments];
        const submitted=agentFiles.includes(f.path), mixed=['reproduction.json','repair_log.jsonl'].includes(f.path);
        const category=submitted?'Agent submitted':mixed?'Agent + runner':f.path==='source.bundle'?'Original source':'Supporting / captured file';
        const label=append(el('span'),link(f.path,fileURL(base,f.path)),el('small',category,'file-origin'));
        append(downloads,append(el('div',undefined,`file-row ${submitted?'agent-file':mixed?'mixed-file':''}`),label,el('span',bytes(f.bytes))));
      } catch {downloads.append(el('p',`Invalid file path: ${f.path}`,'notice'));}}
    }catch(error){if(token===generation)content.replaceChildren(el('p',`Artifact could not be read: ${error.message}. The paper remains listed; no execution outcome is inferred.`,'notice'));}
  };await render();
}
async function boot(){
  try{
    const catalog=await json('papers.json');papers=catalog.papers;
    await Promise.all(papers.map(async p=>{
      await Promise.all(p.attempts.map(async a=>{
        try {
          const base=safePath(a.path.replace(/\/$/,''))+'/';a.record=await json(base+'reproduction.json');a.status=status(a.record);
        }catch{a.status='unavailable';}
      }));p.status=p.attempts.at(-1)?.status??'pending';
    }));
    $('search').addEventListener('input',queue);$('run-select').addEventListener('change',()=>{location.hash=$('run-select').value;});$('previous-paper').addEventListener('click',()=>navigatePaper(-1));$('next-paper').addEventListener('click',()=>navigatePaper(1));window.addEventListener('hashchange',show);await show();
  }catch(error){$('detail').replaceChildren(el('p',`Unable to load the catalog: ${error.message}. Serve this directory over HTTP, or read PAPERS.md directly.`,'notice'));}
}
boot();
