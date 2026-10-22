// AI-written: the selection table shares the viewer's catalog.
const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const link=(title,url)=>{const a=element('a',title);if(['http:','https:'].includes(new URL(url,location.href).protocol))a.href=url;return a;};
try {
  const response=await fetch('papers.json');if(!response.ok)throw Error(`HTTP ${response.status}`);
  const catalog=await response.json();const rows=catalog.papers.map(p=>{
    const row=element('tr');row.append(element('td',String(p.rank).padStart(2,'0')));
    const title=element('td');title.append(link(`${p.title} (${p.year})`,`./#${encodeURIComponent(p.id)}`),element('p'));title.lastChild.append(link('Original code / archive ↗',p.source_url));
    const field=element('td');field.append(link(p.dataset,p.dataset_url),element('p',p.domain),element('p',p.languages.join(' / ')));
    const difficulty=element('td');difficulty.append(element('strong',p.difficulty),element('p',p.reason));
    row.append(title,field,difficulty,element('td',p.scope));return row;
  });document.getElementById('selection-rows').replaceChildren(...rows);
}catch(error){document.getElementById('selection-rows').textContent=`Selection unavailable: ${error.message}. Read PAPERS.md or papers.json directly.`;}
