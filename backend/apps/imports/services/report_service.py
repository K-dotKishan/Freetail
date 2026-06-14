"""
Report service: generates a human-readable import report
listing every anomaly and the action taken.
"""
import json
from datetime import datetime
from apps.imports.models import ImportBatch, ImportRow


SEVERITY_ICON = {
    'error': '❌',
    'warning': '⚠️',
    'info': 'ℹ️',
}

DECISION_LABEL = {
    'accept': '✅ Accepted',
    'reject': '❌ Rejected',
    'accept_modified': '✅ Accepted (modified)',
    'pending': '⏳ Pending review',
}


def generate_text_report(batch_id: int) -> str:
    batch = ImportBatch.objects.get(id=batch_id)
    rows = ImportRow.objects.filter(batch=batch).order_by('row_number')

    lines = [
        "=" * 70,
        f"IMPORT REPORT — {batch.file_name}",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"Group: {batch.group.name}",
        f"Status: {batch.get_status_display()}",
        f"Total rows: {batch.total_rows}",
        f"Anomaly rows: {batch.anomaly_count}",
        "=" * 70,
        "",
    ]

    anomaly_rows = [r for r in rows if r.has_anomaly]
    clean_rows = [r for r in rows if not r.has_anomaly]

    lines.append(f"CLEAN ROWS ({len(clean_rows)} rows — accepted without anomalies)")
    lines.append("-" * 40)
    for r in clean_rows:
        pd = r.parsed_data
        lines.append(
            f"  Row {r.row_number:3d}: {pd.get('date', 'N/A')} | "
            f"{pd.get('description', 'N/A'):35s} | "
            f"{pd.get('amount', 'N/A'):>10s} {pd.get('currency', 'INR')} | "
            f"{DECISION_LABEL.get(r.decision, r.decision)}"
        )

    lines.append("")
    lines.append(f"ANOMALY ROWS ({len(anomaly_rows)} rows)")
    lines.append("-" * 40)

    for r in anomaly_rows:
        pd = r.parsed_data
        lines.append(f"\nRow {r.row_number}: {pd.get('description', 'N/A')}")
        lines.append(f"  Date: {pd.get('date', 'N/A')} | Amount: {pd.get('amount', 'N/A')} {pd.get('currency', 'INR')}")
        lines.append(f"  Decision: {DECISION_LABEL.get(r.decision, r.decision)}")
        if r.decision_notes:
            lines.append(f"  Notes: {r.decision_notes}")
        lines.append("  Anomalies detected:")
        for a in r.anomalies:
            icon = SEVERITY_ICON.get(a.get('severity', 'info'), 'ℹ️')
            lines.append(f"    {icon} [{a.get('severity', '?').upper()}] [{a.get('code', '?')}]")
            lines.append(f"       {a.get('message', '')}")
            if a.get('policy'):
                lines.append(f"       Policy: {a.get('policy')}")

    lines += [
        "",
        "=" * 70,
        "SUMMARY OF ALL ANOMALIES BY TYPE",
        "-" * 40,
    ]

    # Aggregate anomaly codes
    code_counts = {}
    for r in rows:
        for a in r.anomalies:
            code = a.get('code', 'unknown')
            if code not in code_counts:
                code_counts[code] = {'count': 0, 'severity': a.get('severity', 'info'), 'message': a.get('message', '')}
            code_counts[code]['count'] += 1

    for code, info in sorted(code_counts.items()):
        icon = SEVERITY_ICON.get(info['severity'], 'ℹ️')
        lines.append(f"  {icon} {code} (×{info['count']}): {info['message'][:80]}")

    lines.append("\n" + "=" * 70)
    return "\n".join(lines)


def generate_json_report(batch_id: int) -> dict:
    batch = ImportBatch.objects.get(id=batch_id)
    rows = ImportRow.objects.filter(batch=batch).order_by('row_number')

    return {
        'batch_id': batch.id,
        'file_name': batch.file_name,
        'group': batch.group.name,
        'status': batch.status,
        'total_rows': batch.total_rows,
        'anomaly_count': batch.anomaly_count,
        'generated_at': datetime.now().isoformat(),
        'rows': [
            {
                'row_number': r.row_number,
                'description': r.parsed_data.get('description', ''),
                'date': r.parsed_data.get('date'),
                'amount': r.parsed_data.get('amount'),
                'currency': r.parsed_data.get('currency', 'INR'),
                'decision': r.decision,
                'has_anomaly': r.has_anomaly,
                'anomalies': r.anomalies,
            }
            for r in rows
        ]
    }
