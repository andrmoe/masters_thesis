"""AI-written: publication preserves raw evidence and rejects unsafe artifacts."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('export_artifacts', Path(__file__).resolve().parents[1] / 'tools/export_artifacts.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.site, self.artifact = root / 'site', root / 'attempt-0001'
        self.site.mkdir(); self.artifact.mkdir()
        (self.site/'papers.json').write_text(json.dumps({'papers':[{'id':'paper','attempts':[]}]}))
        for name in module.REQUIRED:
            (self.artifact/name).write_text('')
        (self.artifact/'study.json').write_text('{}')
        (self.artifact/'reproduction.json').write_text('{"format":3,"exit_code":9}')
        (self.artifact/'results').mkdir()
        (self.artifact/'results/output.txt').write_text('Observed difference: 12 ≠ 13\n')

    def test_preserves_failed_outcome_bytes_and_deduplicates_exports(self):
        destination = module.export(self.site,'paper',self.artifact)
        self.assertEqual((destination/'reproduction.json').read_bytes(),(self.artifact/'reproduction.json').read_bytes())
        self.assertEqual((destination/'results/output.txt').read_bytes(),(self.artifact/'results/output.txt').read_bytes())
        inventory = json.loads((destination/'files.json').read_text())
        self.assertTrue(any(f['path']=='results/output.txt' and len(f['sha256'])==64 for f in inventory))
        module.export(self.site,'paper',self.artifact)
        self.assertEqual(len(json.loads((self.site/'papers.json').read_text())['papers'][0]['attempts']),1)

    def test_rejects_symlink_without_changing_catalog(self):
        before=(self.site/'papers.json').read_bytes()
        (self.artifact/'results/leak.txt').symlink_to('/etc/passwd')
        with self.assertRaisesRegex(ValueError,'Symlink'):
            module.export(self.site,'paper',self.artifact)
        self.assertEqual(before,(self.site/'papers.json').read_bytes())

    def test_rejects_unknown_paper_and_old_format(self):
        with self.assertRaisesRegex(ValueError,'Unknown paper'):
            module.export(self.site,'other',self.artifact)
        (self.artifact/'reproduction.json').write_text('{"format":2}')
        with self.assertRaisesRegex(ValueError,'format 3'):
            module.export(self.site,'paper',self.artifact)
