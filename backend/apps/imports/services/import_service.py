"""
Import service: orchestrates CSV parsing → anomaly detection →
ImportBatch + ImportRow creation.
"""
from decimal import Decimal
from apps.imports.parsers.csv_parser import parse_csv
from apps.imports.services.anomaly_detector import detect_anomalies
from apps.imports.validators.duplicate_validator import detect_duplicates_in_batch
from apps.imports.models import ImportBatch, ImportRow


def process_csv_upload(file_content: str, group, uploaded_by) -> ImportBatch:
    """
    Parse and validate the CSV, creating an ImportBatch with all rows
    and their anomalies. Does NOT create Expense objects yet —
    that happens after user approval.
    """
    # Parse raw CSV
    raw_rows = parse_csv(file_content)

    # Run anomaly detection on each row
    processed_rows = []
    for item in raw_rows:
        result = detect_anomalies(item['raw'], item['row_number'], group)
        processed_rows.append({
            'row_number': item['row_number'],
            'raw_data': item['raw'],
            'parsed_data': result['parsed_data'],
            'anomalies': result['anomalies'],
            'has_anomaly': result['has_anomaly'],
            'is_settlement': result['is_settlement'],
            'auto_decision': result['auto_decision'],
        })

    # Run duplicate detection across all rows
    processed_rows = detect_duplicates_in_batch(processed_rows)

    # Create batch
    batch = ImportBatch.objects.create(
        group=group,
        uploaded_by=uploaded_by,
        file_name='expenses_export.csv',
        total_rows=len(processed_rows),
        valid_rows=sum(1 for r in processed_rows if not r['has_anomaly']),
        anomaly_count=sum(1 for r in processed_rows if r['has_anomaly']),
        status='pending_review',
    )

    # Create ImportRow for each row
    for row in processed_rows:
        # Convert parsed_data to serializable form
        pd = row['parsed_data']
        serializable_pd = {
            'date': str(pd.get('date')) if pd.get('date') else None,
            'description': pd.get('description', ''),
            'paid_by_name': pd.get('paid_by_name', ''),
            'paid_by_user_id': pd['paid_by_user'].id if pd.get('paid_by_user') else None,
            'amount': str(pd.get('amount')) if pd.get('amount') is not None else None,
            'currency': pd.get('currency', 'INR'),
            'exchange_rate': str(pd.get('exchange_rate', '1.0')),
            'split_type': pd.get('split_type', 'equal'),
            'participant_names': pd.get('participant_names', []),
            'participants': [
                {
                    'canonical_name': p.get('canonical_name', ''),
                    'user_id': p['user'].id if p.get('user') else None,
                    'is_guest': p.get('is_guest', False),
                }
                for p in pd.get('participants', [])
            ],
            'split_details': [
                {'name': d['name'], 'value': str(d['value']) if d.get('value') else None}
                for d in pd.get('split_details', [])
            ],
            'notes': pd.get('notes', ''),
            'is_settlement': row['is_settlement'],
        }

        # Determine default decision
        auto = row.get('auto_decision', 'accept')
        if auto == 'reject':
            decision = 'reject'
        elif auto == 'flag' or row['has_anomaly']:
            decision = 'pending'
        else:
            decision = 'accept'

        ImportRow.objects.create(
            batch=batch,
            row_number=row['row_number'],
            raw_data=row['raw_data'],
            parsed_data=serializable_pd,
            anomalies=row['anomalies'],
            has_anomaly=row['has_anomaly'],
            decision=decision,
        )

    return batch
