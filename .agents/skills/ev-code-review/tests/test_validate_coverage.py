import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "assets"))
from validate_coverage import validate


class CoverageValidatorTests(unittest.TestCase):
    def setUp(self):
        self.plan = {"reviewers": [{
            "id": "core", "check_ids": ["general-errors-trust-boundaries-security"]
        }]}
        self.results = {
            "reviewers": [{"id": "core", "files_reviewed": ["src/auth.ts"]}],
            "checks": [{
                "reviewer_id": "core",
                "id": "general-errors-trust-boundaries-security",
                "status": "PASS",
                "evidence": "src/auth.ts:10-20",
            }],
            "findings": [],
        }

    def test_accepts_complete_evidenced_result(self):
        self.assertEqual(validate(self.plan, self.results), [])

    def test_reports_missing_check_result(self):
        self.results["checks"] = []
        self.assertIn(
            "missing check result: general-errors-trust-boundaries-security",
            validate(self.plan, self.results),
        )

    def test_pass_requires_evidence(self):
        self.results["checks"] = [{
            "reviewer_id": "core", "id": "general-errors-trust-boundaries-security", "status": "PASS"
        }]
        errors = validate(self.plan, self.results)
        self.assertIn("check general-errors-trust-boundaries-security: PASS requires evidence", errors)

    def test_fail_requires_a_known_finding(self):
        check = self.results["checks"][0]
        check.update(status="FAIL", finding_ids=["missing-resource-ownership"])
        errors = validate(self.plan, self.results)
        self.assertIn(
            "check general-errors-trust-boundaries-security: "
            "unknown finding ID missing-resource-ownership",
            errors,
        )


if __name__ == "__main__":
    unittest.main()
