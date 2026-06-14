from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from apps.groups.models import Group
from apps.imports.models import ImportBatch, ImportRow
from apps.imports.services.import_service import process_csv_upload
from apps.imports.services.approval_service import apply_decisions
from apps.imports.services.report_service import generate_text_report, generate_json_report


class ImportUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        group_id = request.data.get('group_id')
        if not file or not group_id:
            return Response({'error': 'file and group_id are required.'}, status=400)

        group = get_object_or_404(Group, id=group_id, memberships__user=request.user)

        try:
            content = file.read().decode('utf-8-sig')  # handle BOM
        except UnicodeDecodeError:
            content = file.read().decode('latin-1')

        batch = process_csv_upload(content, group, request.user)

        rows_data = []
        for row in batch.rows.all().order_by('row_number'):
            rows_data.append({
                'id': row.id,
                'row_number': row.row_number,
                'raw_data': row.raw_data,
                'parsed_data': row.parsed_data,
                'anomalies': row.anomalies,
                'has_anomaly': row.has_anomaly,
                'decision': row.decision,
            })

        return Response({
            'batch_id': batch.id,
            'total_rows': batch.total_rows,
            'valid_rows': batch.valid_rows,
            'anomaly_count': batch.anomaly_count,
            'status': batch.status,
            'rows': rows_data,
        }, status=201)


class ImportBatchDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, batch_id):
        batch = get_object_or_404(ImportBatch, id=batch_id)
        rows_data = []
        for row in batch.rows.all().order_by('row_number'):
            rows_data.append({
                'id': row.id,
                'row_number': row.row_number,
                'raw_data': row.raw_data,
                'parsed_data': row.parsed_data,
                'anomalies': row.anomalies,
                'has_anomaly': row.has_anomaly,
                'decision': row.decision,
                'decision_notes': row.decision_notes,
            })
        return Response({
            'batch_id': batch.id,
            'total_rows': batch.total_rows,
            'anomaly_count': batch.anomaly_count,
            'status': batch.status,
            'rows': rows_data,
        })


class ImportApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, batch_id):
        """
        Body: { decisions: [{row_id, decision, notes}] }
        Or: { approve_all_clean: true } to auto-approve non-anomaly rows.
        """
        batch = get_object_or_404(ImportBatch, id=batch_id)

        decisions = request.data.get('decisions', [])
        approve_all_clean = request.data.get('approve_all_clean', False)

        if approve_all_clean:
            # Auto-accept all rows with no anomalies that are still pending
            clean_rows = ImportRow.objects.filter(
                batch=batch, has_anomaly=False, decision='pending'
            )
            for row in clean_rows:
                decisions.append({'row_id': row.id, 'decision': 'accept', 'notes': 'auto-accepted (no anomalies)'})

        result = apply_decisions(batch_id, decisions, request.user)
        return Response(result)


class ImportRowDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, batch_id, row_id):
        """Update a single row's decision."""
        row = get_object_or_404(ImportRow, id=row_id, batch_id=batch_id)
        decision = request.data.get('decision')
        notes = request.data.get('notes', '')
        if decision not in ['accept', 'reject', 'accept_modified', 'pending']:
            return Response({'error': 'Invalid decision.'}, status=400)
        row.decision = decision
        row.decision_notes = notes
        row.save()
        return Response({'id': row.id, 'decision': row.decision, 'decision_notes': row.decision_notes})


class ImportReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, batch_id):
        fmt = request.query_params.get('format', 'json')
        if fmt == 'text':
            report = generate_text_report(batch_id)
            return HttpResponse(report, content_type='text/plain; charset=utf-8')
        else:
            report = generate_json_report(batch_id)
            return Response(report)


class ImportBatchListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        group_id = request.query_params.get('group_id')
        qs = ImportBatch.objects.filter(
            group__memberships__user=request.user
        ).distinct()
        if group_id:
            qs = qs.filter(group_id=group_id)
        data = [
            {
                'id': b.id,
                'group': b.group.name,
                'file_name': b.file_name,
                'status': b.status,
                'total_rows': b.total_rows,
                'anomaly_count': b.anomaly_count,
                'created_at': b.created_at.isoformat(),
            }
            for b in qs
        ]
        return Response(data)
