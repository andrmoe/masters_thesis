// AI-written: outcome semantics, safe links, filtering and imperfect logs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {status,safePath,parseLog,matches} from '../reproductions/model.mjs';
test('execution exit codes do not assert scientific agreement',()=>{
  assert.equal(status(null),'pending');assert.equal(status({exit_code:null}),'incomplete');assert.equal(status({exit_code:0}),'executed');assert.equal(status({exit_code:137}),'failed');assert.equal(status(null,true),'unavailable');assert.equal(status({exit_code:'0'}),'unavailable');assert.equal(status({}),'unavailable');
});
test('artifact links stay relative and cannot execute a scheme or traverse parents',()=>{
  assert.equal(safePath('results/figure 1.csv'),'results/figure%201.csv');
  for(const path of ['../secret','/etc/passwd','results/../../secret','https://host','javascript:alert(1)','a\\b','a?x','a#x','a//b','a/./b'])assert.throws(()=>safePath(path));
});
test('a malformed repair-log entry remains visible',()=>{
  const rows=parseLog('{"action":"first"}\nBROKEN\n{"action":"third"}\n');assert.equal(rows.length,3);assert.equal(rows[1].reason,'BROKEN');assert.equal(rows[2].action,'third');
});
test('search spans domains and languages, status remains an independent filter',()=>{
  const p={title:'Graph paper',domain:'Databases',dataset:'CompRep',languages:['C++'],status:'failed'};
  assert.equal(matches(p,'DATABASE','all'),true);assert.equal(matches(p,'c++','failed'),true);assert.equal(matches(p,'c++','executed'),false);
});
import {parseDiff} from '../reproductions/diff.mjs';
test('unified diffs preserve filenames, changed text and original/repaired line numbers',()=>{
  const files=parseDiff('diff --git a/a file.R b/a file.R\n--- a/a file.R\t\n+++ b/a file.R\t\n@@ -9,2 +9,2 @@\n same\r\n-old()\r\n+new()\n');
  assert.equal(files[0].name,'a file.R');assert.equal(files[0].removed,1);assert.equal(files[0].added,1);
  assert.deepEqual(files[0].rows.at(-1),{type:'added',old:'',next:10,text:'new()'});
  assert.equal(files[0].rows[1].text,'same');assert.equal(files[0].rows[2].old,10);
});
test('code resembling file headers is retained within a hunk',()=>{
  const [file]=parseDiff('diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n--- original\n+++ submitted\n');
  assert.equal(file.name,'x');assert.equal(file.rows[1].text,'-- original');assert.equal(file.rows[2].text,'++ submitted');
});
import {chooseAttempt} from '../reproductions/model.mjs';
test('default selects latest successful execution, while explicit failed links remain inspectable',()=>{
  const attempts=[{id:'one',status:'failed'},{id:'two',status:'executed'},{id:'three',status:'executed'},{id:'four',status:'failed'}];
  assert.equal(chooseAttempt(attempts).id,'three');assert.equal(chooseAttempt(attempts,'one').id,'one');assert.equal(chooseAttempt(attempts,'missing').id,'three');
  assert.equal(chooseAttempt([{id:'failed',status:'failed'},{id:'incomplete',status:'incomplete'}]).id,'incomplete');assert.equal(chooseAttempt([]),null);
});
