#!/usr/bin/env python3
"""AI-written: export an observed reproduction for the buildless Pages viewer."""
import argparse
import hashlib
import json
import re
import shutil
import tempfile
from pathlib import Path

REQUIRED = ('study.json', 'reproduction.json', 'Dockerfile', 'repair.diff', 'repair_log.jsonl')

def export(site, paper_id, artifact):
    site, artifact = Path(site).resolve(), Path(artifact).resolve()
    catalog_path = site / 'papers.json'
    catalog = json.loads(catalog_path.read_text())
    paper = next((p for p in catalog['papers'] if p['id'] == paper_id), None)
    if paper is None:
        raise ValueError(f'Unknown paper: {paper_id}')
    attempt_id = artifact.name
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', attempt_id):
        raise ValueError('Artifact directory name must contain only letters, numbers, underscores or hyphens')
    for name in REQUIRED:
        if not (artifact / name).is_file():
            raise ValueError(f'Missing required artifact file: {name}')
    record = json.loads((artifact / 'reproduction.json').read_text())
    json.loads((artifact / 'study.json').read_text())
    if record.get('format') != 3:
        raise ValueError('Expected format 3')
    paths = []
    for path in sorted(artifact.rglob('*')):
        if path.is_symlink():
            raise ValueError(f'Symlink cannot be published: {path}')
        relative = path.relative_to(artifact)
        if any(part.startswith('.') for part in relative.parts):
            continue
        if path.is_file():
            paths.append((path, relative, path.stat().st_size))
    if sum(size for _, _, size in paths) > 100 * 1024**2:
        raise ValueError('Artifact exceeds 100 MiB publication limit; review its contents before publishing')
    destination = site / 'artifacts' / paper_id / attempt_id
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as temp:
        staging = Path(temp) / 'artifact'
        staging.mkdir()
        inventory = []
        for path, relative, size in paths:
            target = staging / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)
            inventory.append({'path':relative.as_posix(), 'bytes':size, 'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
        # Kept separate from canonical reproduction.json; the viewer parses the originals.
        (staging / 'files.json').write_text(json.dumps(inventory, indent=2)+'\n')
        if destination.exists():
            shutil.rmtree(destination)
        staging.rename(destination)
    attempt = {'id': attempt_id, 'path': destination.relative_to(site).as_posix() + '/'}
    paper['attempts'] = [a for a in paper['attempts'] if a['id'] != attempt_id] + [attempt]
    catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False)+'\n')
    return destination

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('paper', help='ID in reproductions/papers.json')
    parser.add_argument('artifact', type=Path)
    parser.add_argument('--site', type=Path, default=Path(__file__).resolve().parents[1] / 'reproductions')
    args = parser.parse_args()
    try:
        print(export(args.site, args.paper, args.artifact))
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f'export-artifacts: {error}\n')

if __name__ == '__main__':
    main()
