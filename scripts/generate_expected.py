"""Generates the expected results for the StallAlert sample CSVs (the answer key for tests).

Written separately from the app (Python, standard library only) so the app's TypeScript
rules engine can be checked against it. It reads a hiring-board CSV and prints counts,
row errors, the ranked queue and bottlenecks for a given reference date and stage setup.

Usage (run from the repo root; --write also works from any folder with the full path):
  python3 scripts/generate_expected.py data/sample-b.csv 2026-11-13 default
  python3 scripts/generate_expected.py data/sample-b.csv 2026-11-13 all7
  python3 scripts/generate_expected.py --write   # regenerates data/expected/*.json
"""
import csv
import datetime as dt
import io
import json
import re
import sys
from collections import Counter
from pathlib import Path

REQUIRED = ["candidate_id", "name", "role", "stage", "stage_entered_at", "recruiter"]
OPTIONAL_DATES = ["last_activity_at", "last_contacted_at"]

# Default hiring stages (position = order in the pipeline; later = more urgent).
DEFAULT_STAGES = [
    {"name": "Applied", "type": "watched", "threshold": 5, "aliases": ["New", "Sourced"], "action": "REVIEW_APPLICATION"},
    {"name": "Screening", "type": "watched", "threshold": 7, "aliases": ["Phone screen", "HR screen"], "action": "SCHEDULE_SCREEN"},
    {"name": "Interview", "type": "watched", "threshold": 14, "aliases": ["Onsite", "Panel interview"], "action": "REQUEST_FEEDBACK"},
    {"name": "Assessment", "type": "watched", "threshold": 7, "aliases": ["Take-home"], "action": "REVIEW_ASSESSMENT"},
    {"name": "Reference check", "type": "watched", "threshold": 5, "aliases": ["References"], "action": "CHASE_REFERENCES"},
    {"name": "Offer", "type": "watched", "threshold": 3, "aliases": [], "action": "CONFIRM_OFFER"},
    {"name": "On hold", "type": "paused", "threshold": None, "aliases": ["Paused"], "action": None},
    {"name": "Hired", "type": "final", "threshold": None, "aliases": [], "action": None},
    {"name": "Rejected", "type": "final", "threshold": None, "aliases": [], "action": None},
    {"name": "Withdrawn", "type": "final", "threshold": None, "aliases": ["Declined"], "action": None},
]


def stages_for(setup):
    stages = [dict(s) for s in DEFAULT_STAGES]
    if setup == "all7":
        for s in stages:
            if s["type"] == "watched":
                s["threshold"] = 7
    for pos, s in enumerate(stages, start=1):
        s["position"] = pos
    return stages


def norm(text):
    return " ".join(text.split()).lower()


def parse_date(value):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        return None


def analyse(path, reference, setup):
    ref = dt.date.fromisoformat(reference)
    stages = stages_for(setup)
    lookup = {}
    for s in stages:
        for n in [s["name"], *s["aliases"]]:
            lookup[norm(n)] = s

    text = Path(path).read_bytes().decode("utf-8-sig")
    reader = csv.reader(io.StringIO(text, newline=""))
    rows = list(reader)
    header = [h.strip() for h in rows[0]]
    idx = {h: i for i, h in enumerate(header)}
    records = []
    for n, fields in enumerate(rows[1:], start=2):
        if all(f.strip() == "" for f in fields):
            continue
        records.append((n, fields))

    errors = []
    parsed = []
    for n, fields in records:
        errs = []
        if len(fields) != len(header):
            errs.append({"field": "(record)", "problem": f"{len(fields)} fields, expected {len(header)}"})
            errors.append({"record": n, "candidate_id": fields[0].strip() if fields else "", "errors": errs})
            continue
        v = {h: fields[i].strip() for h, i in idx.items()}
        for h in REQUIRED:
            if v.get(h, "") == "":
                errs.append({"field": h, "problem": "missing value"})
        stage = lookup.get(norm(v["stage"])) if v["stage"] else None
        if v["stage"] and stage is None:
            errs.append({"field": "stage", "problem": f'"{v["stage"]}" is not in your hiring stages'})
        entered = None
        if v["stage_entered_at"]:
            entered = parse_date(v["stage_entered_at"])
            if entered is None:
                errs.append({"field": "stage_entered_at", "problem": "not a real YYYY-MM-DD date"})
            elif entered > ref:
                errs.append({"field": "stage_entered_at", "problem": "after the reference date"})
        opt = {}
        for h in OPTIONAL_DATES:
            raw = v.get(h, "")
            if raw:
                d = parse_date(raw)
                if d is None:
                    errs.append({"field": h, "problem": "not a real YYYY-MM-DD date"})
                elif d > ref:
                    errs.append({"field": h, "problem": "after the reference date"})
                opt[h] = d
        parsed.append({"record": n, "v": v, "stage": stage, "entered": entered, "opt": opt, "errs": errs})

    ids = Counter(p["v"]["candidate_id"] for p in parsed if p["v"]["candidate_id"])
    for p in parsed:
        cid = p["v"]["candidate_id"]
        if cid and ids[cid] > 1:
            others = [q["record"] for q in parsed if q["v"]["candidate_id"] == cid and q is not p]
            p["errs"].append({"field": "candidate_id", "problem": f"duplicate ID (also record {', '.join(map(str, others))})"})
        if p["errs"]:
            errors.append({"record": p["record"], "candidate_id": cid, "errors": p["errs"]})
    errors.sort(key=lambda e: e["record"])

    valid = [p for p in parsed if not p["errs"]]
    queue, terminal, paused, not_stalled = [], 0, 0, 0
    for p in valid:
        s = p["stage"]
        if s["type"] == "final":
            terminal += 1
            continue
        if s["type"] == "paused":
            paused += 1
            continue
        start = p["entered"]
        activity = p["opt"].get("last_activity_at")
        if activity and activity > start:
            start = activity
        days = (ref - start).days
        if days < s["threshold"]:
            not_stalled += 1
            continue
        contact = p["opt"].get("last_contacted_at")
        queue.append({
            "candidate_id": p["v"]["candidate_id"],
            "name": p["v"]["name"],
            "stage": s["name"],
            "recruiter": p["v"]["recruiter"],
            "timer_from": start.isoformat(),
            "days_in_stage": days,
            "stage_threshold": s["threshold"],
            "overdue_days": days - s["threshold"],
            "action_code": s["action"],
            "days_since_contact": (ref - contact).days if contact else None,
            "_pos": s["position"],
        })
    # Most overdue first, then later pipeline stage, then candidate ID by code unit.
    queue.sort(key=lambda q: (-q["overdue_days"], -q["_pos"], [ord(c) for c in q["candidate_id"]]))
    for rank, q in enumerate(queue, start=1):
        q["rank"] = rank

    pos = {s["name"]: s["position"] for s in stages}
    by_stage = Counter(q["stage"] for q in queue)
    by_rec = Counter(q["recruiter"] for q in queue)
    bottlenecks = []
    if by_stage:
        top = max(by_stage.items(), key=lambda kv: (kv[1], pos[kv[0]]))
        if top[1] >= 2:
            bottlenecks.append({"type": "stage", "key": top[0], "stalled": top[1]})
    if by_rec:
        top = sorted(by_rec.items(), key=lambda kv: (-kv[1], kv[0]))[0]
        if top[1] >= 2:
            bottlenecks.append({"type": "recruiter", "key": top[0], "stalled": top[1]})

    for q in queue:
        q.pop("_pos")
    return {
        "reference_date": reference,
        "stages": setup,
        "counts": {
            "total": len(records),
            "valid": len(valid),
            "invalid": len(errors),
            "terminal": terminal,
            "on_hold": paused,
            "stalled": len(queue),
            "not_stalled": not_stalled,
        },
        "row_errors": errors,
        "queue": queue,
        "bottlenecks": bottlenecks,
    }


def write_expected():
    root = Path(__file__).resolve().parent.parent
    out = root / "data" / "expected"
    out.mkdir(parents=True, exist_ok=True)
    for sample in ["sample-a", "sample-b", "sample-c"]:
        result = {
            "source": f"data/{sample}.csv",
            "generated_by": "scripts/generate_expected.py (independent of the app)",
            "scenarios": {
                "default_stages": analyse(root / "data" / f"{sample}.csv", "2026-11-13", "default"),
                "all_thresholds_7": analyse(root / "data" / f"{sample}.csv", "2026-11-13", "all7"),
            },
        }
        (out / f"{sample}.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
        print("wrote", out / f"{sample}.json")


if __name__ == "__main__":
    if sys.argv[1:] == ["--write"]:
        write_expected()
    else:
        print(json.dumps(analyse(sys.argv[1], sys.argv[2], sys.argv[3]), indent=2, ensure_ascii=False))
