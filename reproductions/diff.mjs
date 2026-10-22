// AI-written: parse the recorded unified patch without executing or rewriting it.
export function parseDiff(patch) {
  const files=[]; let file, oldLine=0, newLine=0, inHunk=false;
  for (const raw of patch.split('\n')) {
    const line=raw.replace(/\r$/,'');
    if(line.startsWith('diff --git ')) {file={name:line.slice(11),kind:'Modified',rows:[],added:0,removed:0};files.push(file);inHunk=false;continue;}
    if(!file)continue;
    if(line.startsWith('new file mode')){file.kind='New file';continue;}
    if(line.startsWith('deleted file mode')){file.kind='Deleted file';continue;}
    if(!inHunk&&line.startsWith('--- ')){if(file.kind==='Deleted file')file.name=line.slice(4).replace(/^a\//,'').split('\t')[0];continue;}
    if(!inHunk&&line.startsWith('+++ ')){if(line.slice(4)!=='/dev/null')file.name=line.slice(4).replace(/^b\//,'').split('\t')[0];continue;}
    const hunk=line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if(hunk){inHunk=true;oldLine=Number(hunk[1]);newLine=Number(hunk[2]);file.rows.push({type:'hunk',text:line});continue;}
    if(line.startsWith('+')){file.rows.push({type:'added',old:'',next:newLine++,text:line.slice(1)});file.added++;}
    else if(line.startsWith('-')){file.rows.push({type:'removed',old:oldLine++,next:'',text:line.slice(1)});file.removed++;}
    else if(line.startsWith(' ')){file.rows.push({type:'context',old:oldLine++,next:newLine++,text:line.slice(1)});}
    else if(line.startsWith('\\')||line.startsWith('Binary files')||line==='GIT binary patch')file.rows.push({type:'meta',text:line});
  }
  return files;
}
