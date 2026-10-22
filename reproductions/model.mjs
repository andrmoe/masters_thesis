// AI-written. Pure helpers shared by the browser and Node tests.
export function status(record, error = false) {
  if (error) return 'unavailable';
  if (!record) return 'pending';
  if (record.exit_code === null) return 'incomplete';
  if (!Number.isInteger(record.exit_code)) return 'unavailable';
  return record.exit_code === 0 ? 'executed' : 'failed';
}
export const statusLabels = {pending:'No submitted attempt', incomplete:'Incomplete · no container exit', executed:'Executed · exit 0', failed:'Executed · nonzero exit', unavailable:'Artifact unavailable'};
export function safePath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') || /[?#:]/.test(path)) throw Error('Invalid artifact path');
  if (path.split('/').some(part => part === '..' || part === '.' || !part)) throw Error('Invalid artifact path');
  return path.split('/').map(encodeURIComponent).join('/');
}
export function parseLog(text) {
  return text.split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
    try { return JSON.parse(line); }
    catch { return {time:'', action:`Unreadable log entry ${index + 1}`, reason:line}; }
  });
}
export function matches(paper, query, filter) {
  return (filter === 'all' || paper.status === filter) && [paper.title,paper.domain,paper.dataset,...paper.languages].join(' ').toLowerCase().includes(query.toLowerCase());
}
export function bytes(size) {
  return size >= 1048576 ? `${(size/1048576).toFixed(1)} MiB` : size >= 1024 ? `${(size/1024).toFixed(1)} KiB` : `${size} B`;
}

export function chooseAttempt(attempts, requested) {
  return attempts.find(attempt=>attempt.id===requested)
    ?? [...attempts].reverse().find(attempt=>attempt.status==='executed' || attempt.record?.exit_code===0)
    ?? attempts.at(-1)
    ?? null;
}
