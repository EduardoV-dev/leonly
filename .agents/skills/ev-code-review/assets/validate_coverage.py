#!/usr/bin/env python3
"""Validate review results against the coordinator's declared plan."""

import argparse
import json
import sys
from pathlib import Path


STATUSES = {"PASS", "FAIL", "NOT_APPLICABLE", "UNVERIFIED"}


def _read_object(path):
    try:
        value = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"{path}: {error}") from error
    if not isinstance(value, dict):
        raise ValueError(f"{path}: top-level JSON value must be an object")
    return value


def _unique_ids(items, key, label, errors):
    ids = []
    for index, item in enumerate(items):
        if not isinstance(item, dict) or not isinstance(item.get(key), str) or not item[key]:
            errors.append(f"{label}[{index}] requires non-empty string {key!r}")
            continue
        ids.append(item[key])
    duplicates = {value for value in ids if ids.count(value) > 1}
    errors.extend(f"duplicate {label} ID: {value}" for value in sorted(duplicates))
    return set(ids)


def validate(plan, results):
    errors = []
    planned_reviewers = plan.get("reviewers")
    actual_reviewers = results.get("reviewers")
    checks = results.get("checks")
    findings = results.get("findings")
    for name, value in (("plan.reviewers", planned_reviewers),
                        ("results.reviewers", actual_reviewers),
                        ("results.checks", checks), ("results.findings", findings)):
        if not isinstance(value, list):
            errors.append(f"{name} must be an array")
    if errors:
        return errors

    plan_reviewer_ids = _unique_ids(planned_reviewers, "id", "planned reviewer", errors)
    result_reviewer_ids = _unique_ids(actual_reviewers, "id", "result reviewer", errors)
    finding_ids = _unique_ids(findings, "id", "finding", errors)
    for reviewer_id in sorted(plan_reviewer_ids - result_reviewer_ids):
        errors.append(f"missing reviewer result: {reviewer_id}")
    for reviewer_id in sorted(result_reviewer_ids - plan_reviewer_ids):
        errors.append(f"unplanned reviewer result: {reviewer_id}")

    planned = {}
    for index, reviewer in enumerate(planned_reviewers):
        if not isinstance(reviewer, dict) or not isinstance(reviewer.get("id"), str):
            continue
        check_ids = reviewer.get("check_ids")
        if not isinstance(check_ids, list) or not check_ids or any(
            not isinstance(check_id, str) or not check_id for check_id in check_ids
        ):
            errors.append(f"planned reviewer {reviewer['id']}: check_ids must be a non-empty string array")
            continue
        if len(check_ids) != len(set(check_ids)):
            errors.append(f"planned reviewer {reviewer['id']}: duplicate check IDs")
        for check_id in check_ids:
            if check_id in planned:
                errors.append(f"check ID planned more than once: {check_id}")
            planned[check_id] = reviewer["id"]

    for reviewer in actual_reviewers:
        if not isinstance(reviewer, dict) or not isinstance(reviewer.get("id"), str):
            continue
        files = reviewer.get("files_reviewed")
        if not isinstance(files, list) or any(not isinstance(path, str) for path in files):
            errors.append(f"reviewer {reviewer['id']}: files_reviewed must be a string array")

    seen_checks = set()
    for index, check in enumerate(checks):
        if not isinstance(check, dict):
            errors.append(f"checks[{index}] must be an object")
            continue
        check_id = check.get("id")
        reviewer_id = check.get("reviewer_id")
        if not isinstance(check_id, str) or not isinstance(reviewer_id, str):
            errors.append(f"checks[{index}] requires string id and reviewer_id")
            continue
        if check_id in seen_checks:
            errors.append(f"duplicate check result: {check_id}")
        seen_checks.add(check_id)
        if check_id not in planned:
            errors.append(f"unplanned check result: {check_id}")
        elif planned[check_id] != reviewer_id:
            errors.append(f"check {check_id} assigned to {planned[check_id]}, returned by {reviewer_id}")
        if reviewer_id not in result_reviewer_ids:
            errors.append(f"check {check_id} returned by missing reviewer: {reviewer_id}")

        status = check.get("status")
        if not isinstance(status, str) or status not in STATUSES:
            errors.append(f"check {check_id}: invalid status {status!r}")
        elif status in {"PASS", "FAIL"} and not _nonempty(check.get("evidence")):
            errors.append(f"check {check_id}: {status} requires evidence")
        elif status in {"NOT_APPLICABLE", "UNVERIFIED"} and not _nonempty(check.get("reason")):
            errors.append(f"check {check_id}: {status} requires a reason")

        refs = check.get("finding_ids", [])
        if not isinstance(refs, list) or any(not isinstance(ref, str) for ref in refs):
            errors.append(f"check {check_id}: finding_ids must be a string array")
        elif status == "FAIL" and not refs:
            errors.append(f"check {check_id}: FAIL requires at least one finding ID")
        elif status != "FAIL" and refs:
            errors.append(f"check {check_id}: only FAIL may reference finding IDs")
        else:
            for ref in refs:
                if ref not in finding_ids:
                    errors.append(f"check {check_id}: unknown finding ID {ref}")

    for check_id in sorted(set(planned) - seen_checks):
        errors.append(f"missing check result: {check_id}")
    return errors


def _nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", required=True, help="review plan JSON")
    parser.add_argument("--results", required=True, help="review results JSON")
    args = parser.parse_args()
    try:
        errors = validate(_read_object(args.plan), _read_object(args.results))
    except ValueError as error:
        print(error, file=sys.stderr)
        return 2
    if errors:
        print("Coverage validation failed:")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print("Coverage validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
