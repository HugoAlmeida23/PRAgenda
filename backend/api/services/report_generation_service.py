# backend/api/services/report_generation_service.py
import io
import csv
import logging
from datetime import datetime, timedelta # Ensure timedelta is imported
from decimal import Decimal
from typing import Dict, List, Any, Optional, Tuple
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from django.conf import settings
# from django.template.loader import render_to_string # Not used for PDF generation here

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
# from reportlab.pdfgen import canvas # Used indirectly via onFirstPage/onLaterPages
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill

from ..models import (
    Client, Task, TimeEntry, ClientProfitability, 
    Organization, Profile, GeneratedReport
)

logger = logging.getLogger(__name__)

class ReportGenerationService:
    """
    Serviço centralizado para geração de relatórios em diferentes formatos.
    """

    @staticmethod
    def _get_pdf_styles():
        styles = getSampleStyleSheet()
        
        # Define custom colors (Inspired by a modern UI palette)
        C = { # C for colors_palette
            'primary': colors.HexColor('#3B82F6'),      # Blue 500
            'primary_dark': colors.HexColor('#1E40AF'), # Blue 800
            'secondary': colors.HexColor('#64748B'),    # Slate 500
            'text_light': colors.HexColor('#F8FAFC'),   # Slate 50
            'text_dark': colors.HexColor('#1E293B'),    # Slate 800
            'text_muted': colors.HexColor('#475569'),   # Slate 600
            'bg_light': colors.HexColor('#F1F5F9'),     # Slate 100
            'bg_header_table': colors.HexColor('#334155'),# Slate 700
            'border_color': colors.HexColor('#CBD5E1'), # Slate 300
            'green_light_bg': colors.HexColor('#ECFDF5'), # Green 50
            'green_dark_text': colors.HexColor('#047857'),# Green 700
            'red_light_bg': colors.HexColor('#FEF2F2'),    # Red 50
            'red_dark_text': colors.HexColor('#B91C1C'),   # Red 700
            'yellow_light_bg': colors.HexColor('#FEFCE8'), # Yellow 50
            'yellow_dark_text': colors.HexColor('#854D0E'),# Yellow 700
        }

        base_font = 'Helvetica'
        base_font_bold = 'Helvetica-Bold'

        # Custom styles that are likely not standard names, so .add() is okay
        # Ensure these names are indeed unique if issues persist.
        if 'ReportTitle' not in styles:
            styles.add(ParagraphStyle(name='ReportTitle', fontName=base_font_bold, fontSize=20, alignment=1, spaceAfter=6, textColor=C['primary_dark']))
        else: # Modify existing
            styles['ReportTitle'].fontName = base_font_bold
            styles['ReportTitle'].fontSize = 20
            styles['ReportTitle'].alignment = 1
            styles['ReportTitle'].spaceAfter = 6
            styles['ReportTitle'].textColor = C['primary_dark']


        if 'ReportSubtitle' not in styles:
            styles.add(ParagraphStyle(name='ReportSubtitle', fontName=base_font, fontSize=12, alignment=1, spaceAfter=12, textColor=C['secondary']))
        else:
            styles['ReportSubtitle'].fontName = base_font
            styles['ReportSubtitle'].fontSize = 12
            # ... and so on for other attributes


        if 'SmallTextMuted' not in styles:
            styles.add(ParagraphStyle(name='SmallTextMuted', fontName=base_font, fontSize=8, alignment=1, spaceAfter=18, textColor=C['text_muted']))
        # ... (similarly for SectionTitle, TableHeader, TableCellText, TableCellNumber, TableCellCenter)

        # For standard styles like 'BodyText', 'Heading1', etc., it's safer to modify them directly if they exist.
        # Or, if you want a completely different style, give it a new unique name.
        
        # Example: Modifying 'BodyText'
        if 'BodyText' in styles:
            styles['BodyText'].fontName = base_font
            styles['BodyText'].fontSize = 10
            styles['BodyText'].leading = 14
            styles['BodyText'].textColor = C['text_dark']
        else: # Should not happen for 'BodyText', but as a fallback
            styles.add(ParagraphStyle(name='BodyText', fontName=base_font, fontSize=10, leading=14, textColor=C['text_dark']))

        # For your custom named styles, the .add() approach is fine if you ensure the name isn't standard
        # Let's assume these are custom and use add()
        custom_style_definitions = [
            ('ReportTitle', {'fontName': base_font_bold, 'fontSize': 20, 'alignment': 1, 'spaceAfter': 6, 'textColor': C['primary_dark']}),
            ('ReportSubtitle', {'fontName': base_font, 'fontSize': 12, 'alignment': 1, 'spaceAfter': 12, 'textColor': C['secondary']}),
            ('SmallTextMuted', {'fontName': base_font, 'fontSize': 8, 'alignment': 1, 'spaceAfter': 18, 'textColor': C['text_muted']}),
            ('SectionTitle', {'fontName': base_font_bold, 'fontSize': 14, 'spaceBefore': 16, 'spaceAfter': 10, 'textColor': C['primary']}),
            ('TableHeader', {'fontName': base_font_bold, 'fontSize': 9, 'alignment': 1, 'textColor': C['text_light']}),
            ('TableCellText', {'fontName': base_font, 'fontSize': 9, 'alignment': 0, 'textColor': C['text_dark'], 'leading': 11}),
            ('TableCellNumber', {'fontName': base_font, 'fontSize': 9, 'alignment': 2, 'textColor': C['text_dark'], 'leading': 11}),
            ('TableCellCenter', {'fontName': base_font, 'fontSize': 9, 'alignment': 1, 'textColor': C['text_dark'], 'leading': 11}),
        ]

        for name, attrs in custom_style_definitions:
            if name not in styles:
                styles.add(ParagraphStyle(name=name, **attrs))
            else: # If it somehow exists, update it
                existing_style = styles[name]
                for key, value in attrs.items():
                    setattr(existing_style, key, value)
        
        return styles, C

    # ... (rest of the class remains the same as previously corrected)
    @staticmethod
    def _add_page_elements(canvas, doc, is_first_page=False):
        """Adds page number and other fixed elements (like a footer line)."""
        styles, C = ReportGenerationService._get_pdf_styles()
        canvas.saveState()
        
        # Page Number
        page_num_text = f"Página {doc.page}"
        canvas.setFont(styles['SmallTextMuted'].fontName, styles['SmallTextMuted'].fontSize)
        canvas.setFillColor(styles['SmallTextMuted'].textColor)
        canvas.drawRightString(doc.width + doc.leftMargin - 0.25*inch, 0.5*inch, page_num_text)

        # Footer Line
        canvas.setStrokeColor(C['border_color'])
        canvas.setLineWidth(0.5)
        canvas.line(doc.leftMargin, 0.75*inch, doc.width + doc.leftMargin, 0.75*inch)
        
        canvas.restoreState()

    @staticmethod
    def _build_pdf_doc(buffer, story_elements, title="Relatório"):
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            title=title,
            leftMargin=0.75*inch,
            rightMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=1.0*inch # Increased bottom margin for footer
        )
        
        doc.build(
            story_elements,
            onFirstPage=lambda canvas, doc: ReportGenerationService._add_page_elements(canvas, doc, is_first_page=True),
            onLaterPages=lambda canvas, doc: ReportGenerationService._add_page_elements(canvas, doc)
        )
        return doc
        
    @staticmethod
    def _get_default_table_style(C_colors, header_font_name, num_data_rows=0):
        """ Helper for a common table style with alternating row colors """
        style = TableStyle([
            ('BACKGROUND', (0,0), (-1,0), C_colors['bg_header_table']), # Header background
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, C_colors['border_color']),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ])
        for i in range(1, num_data_rows + 1): # Start from 1 to skip header
            if i % 2 == 1: # Odd data rows (first data row is i=1)
                 style.add('BACKGROUND', (0,i), (-1,i), C_colors['bg_light'])
            # else: Even data rows will have default white/transparent background
        return style

    @staticmethod
    def generate_client_summary_report(
        organization: Organization,
        client_ids: List[str] = None,
        include_profitability: bool = True,
        include_tasks: bool = True,
        include_time_entries: bool = True,
        date_from: datetime = None, # Expecting aware datetime
        date_to: datetime = None,   # Expecting aware datetime
        format_type: str = 'pdf'
    ) -> Tuple[io.BytesIO, str]:
        """
        Gera relatório de resumo de clientes.
        """
        clients_query = Client.objects.filter(organization=organization, is_active=True)
        if client_ids:
            clients_query = clients_query.filter(id__in=client_ids)
        clients = clients_query.select_related('account_manager').order_by('name')
        
        report_data = {
            'organization': organization,
            'clients_data': [], 
            'generation_date': timezone.now(),
            'date_from': date_from,
            'date_to': date_to,
            'total_clients': clients.count(),
            'total_monthly_fees': clients.aggregate(total=Sum('monthly_fee'))['total'] or Decimal('0.00'),
        }
        
        for client_obj in clients: 
            client_detail = { 
                'client_obj': client_obj,
                'active_tasks_count': 0,
                'completed_tasks_count': 0,
                'total_time_minutes': 0,
                'recent_profitability': None,
            }
            
            task_filter = Q(client=client_obj)
            time_filter = Q(client=client_obj)
            
            if date_from:
                task_filter &= Q(created_at__gte=date_from) 
                time_filter &= Q(date__gte=date_from.date())
            if date_to:
                task_filter &= Q(created_at__lte=date_to)
                time_filter &= Q(date__lte=date_to.date())
            
            if include_tasks:
                client_detail['active_tasks_count'] = Task.objects.filter(
                    task_filter & Q(status__in=['pending', 'in_progress'])
                ).count()
                client_detail['completed_tasks_count'] = Task.objects.filter(
                    task_filter & Q(status='completed')
                ).count()
            
            if include_time_entries:
                time_stats = TimeEntry.objects.filter(time_filter).aggregate(
                    total_minutes=Sum('minutes_spent')
                )
                client_detail['total_time_minutes'] = time_stats['total_minutes'] or 0
            
            if include_profitability:
                recent_profit = ClientProfitability.objects.filter(
                    client=client_obj
                ).order_by('-year', '-month').first()
                client_detail['recent_profitability'] = recent_profit
            
            report_data['clients_data'].append(client_detail)
        
        if format_type == 'pdf':
            return ReportGenerationService._generate_client_summary_pdf(report_data)
        elif format_type == 'csv':
            return ReportGenerationService._generate_client_summary_csv(report_data) 
        elif format_type == 'xlsx':
            return ReportGenerationService._generate_client_summary_xlsx(report_data) 
        else:
            raise ValueError(f"Formato não suportado: {format_type}")

    @staticmethod
    def _generate_client_summary_pdf(data: Dict) -> Tuple[io.BytesIO, str]:
        buffer = io.BytesIO()
        styles, C = ReportGenerationService._get_pdf_styles()
        story = []

        story.append(Paragraph("Resumo de Clientes", styles['ReportTitle']))
        story.append(Paragraph(data['organization'].name, styles['ReportSubtitle']))
        story.append(Paragraph(f"Gerado em: {data['generation_date'].strftime('%d/%m/%Y às %H:%M')}", styles['SmallTextMuted']))
        story.append(Spacer(1, 0.2*inch))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C['border_color'], spaceBefore=5, spaceAfter=15))


        story.append(Paragraph("Informações Gerais", styles['SectionTitle']))
        info_data_content = [
            [Paragraph('Total de Clientes:', styles['TableCellText']), Paragraph(str(data['total_clients']), styles['TableCellNumber'])],
            [Paragraph('Valor Total de Avenças:', styles['TableCellText']), Paragraph(f"€{data['total_monthly_fees']:.2f}", styles['TableCellNumber'])],
        ]
        if data['date_from']: 
            info_data_content.append([Paragraph('Período Desde:', styles['TableCellText']), Paragraph(data['date_from'].strftime('%d/%m/%Y'), styles['TableCellNumber'])])
        if data['date_to']: 
            info_data_content.append([Paragraph('Período Até:', styles['TableCellText']), Paragraph(data['date_to'].strftime('%d/%m/%Y'), styles['TableCellNumber'])])
        
        info_table = Table(info_data_content, colWidths=[2.8*inch, 2.8*inch]) 
        info_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, C['border_color']),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('BACKGROUND', (0,0), (0,-1), C['bg_light']),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 0.3*inch))
        
        if data['clients_data']:
            story.append(Paragraph("Detalhes dos Clientes", styles['SectionTitle']))
            
            headers = [
                Paragraph('Cliente', styles['TableHeader']), 
                Paragraph('Gestor', styles['TableHeader']), 
                Paragraph('Avença', styles['TableHeader']), 
                Paragraph('Ativas', styles['TableHeader']), 
                Paragraph('Concluídas', styles['TableHeader']), 
                Paragraph('Horas', styles['TableHeader']), 
                Paragraph('Margem %', styles['TableHeader'])
            ]
            client_table_rows = [headers]
            
            for client_detail in data['clients_data']:
                client_obj = client_detail['client_obj']
                profit_margin = client_detail['recent_profitability'].profit_margin if client_detail['recent_profitability'] else None
                
                row = [
                    Paragraph(client_obj.name, styles['TableCellText']),
                    Paragraph(client_obj.account_manager.username if client_obj.account_manager else 'N/A', styles['TableCellCenter']),
                    Paragraph(f"€{client_obj.monthly_fee or Decimal('0.00'):.2f}", styles['TableCellNumber']),
                    Paragraph(str(client_detail['active_tasks_count']), styles['TableCellCenter']),
                    Paragraph(str(client_detail['completed_tasks_count']), styles['TableCellCenter']),
                    Paragraph(f"{(client_detail['total_time_minutes'] or 0) / 60:.1f}h", styles['TableCellCenter']),
                    Paragraph(f"{profit_margin:.1f}%" if profit_margin is not None else 'N/A', styles['TableCellCenter'])
                ]
                client_table_rows.append(row)
            
            client_table = Table(client_table_rows, colWidths=[1.8*inch, 1.0*inch, 0.8*inch, 0.6*inch, 0.7*inch, 0.7*inch, 0.8*inch], repeatRows=1)
            client_table.setStyle(ReportGenerationService._get_default_table_style(C, styles['TableHeader'].fontName, len(data['clients_data'])))
            story.append(client_table)
        
        ReportGenerationService._build_pdf_doc(buffer, story, title="Resumo de Clientes")
        buffer.seek(0)
        return buffer, 'application/pdf'

    @staticmethod
    def _generate_profitability_pdf(data: Dict) -> Tuple[io.BytesIO, str]:
        buffer = io.BytesIO()
        styles, C = ReportGenerationService._get_pdf_styles()
        story = []

        story.append(Paragraph(f"Análise de Rentabilidade - {data['month_name']}", styles['ReportTitle']))
        story.append(Paragraph(data['organization'].name, styles['ReportSubtitle']))
        story.append(Paragraph(f"Gerado em: {data['generation_date'].strftime('%d/%m/%Y às %H:%M')}", styles['SmallTextMuted']))
        story.append(Spacer(1, 0.2*inch))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C['border_color'], spaceBefore=5, spaceAfter=15))

        story.append(Paragraph("Estatísticas Resumo", styles['SectionTitle']))
        stats = data['stats']
        summary_data_content = [
            [Paragraph('Total de Clientes Analisados:', styles['TableCellText']), Paragraph(str(data['total_records']), styles['TableCellNumber'])],
            [Paragraph('Clientes Rentáveis:', styles['TableCellText']), Paragraph(str(stats['profitable_count'] or 0), styles['TableCellNumber'])],
            [Paragraph('Clientes Não Rentáveis:', styles['TableCellText']), Paragraph(str(stats['unprofitable_count'] or 0), styles['TableCellNumber'])],
            [Paragraph('Lucro Total:', styles['TableCellText']), Paragraph(f"€{stats['total_profit']:.2f}" if stats['total_profit'] else '€0.00', styles['TableCellNumber'])],
            [Paragraph('Margem Média:', styles['TableCellText']), Paragraph(f"{stats['avg_margin']:.1f}%" if stats['avg_margin'] else 'N/A', styles['TableCellNumber'])],
        ]
        summary_table = Table(summary_data_content, colWidths=[2.8*inch, 2.8*inch])
        summary_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, C['border_color']),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (0,-1), C['bg_light']),
             ('LEFTPADDING', (0,0), (-1,-1), 6),('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 5),('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 0.3 * inch))

        if data['profitability_records']:
            story.append(Paragraph("Rentabilidade por Cliente", styles['SectionTitle']))
            
            headers = [
                Paragraph('Cliente', styles['TableHeader']), 
                Paragraph('Avença', styles['TableHeader']), 
                Paragraph('C. Tempo', styles['TableHeader']), 
                Paragraph('Despesas', styles['TableHeader']), 
                Paragraph('Lucro', styles['TableHeader']), 
                Paragraph('Margem %', styles['TableHeader']), 
                Paragraph('Status', styles['TableHeader'])
            ]
            client_data_rows = [headers]
            
            for record in data['profitability_records']:
                status_text = 'Rentável' if record.is_profitable else 'Não Rentável'
                status_style = ParagraphStyle(
                    name=f'StatusCell_Prof_{record.id}', # Unique name for each cell if needed for very specific styling later
                    parent=styles['TableCellCenter'], 
                    textColor=C['green_dark_text'] if record.is_profitable else C['red_dark_text'],
                    fontName='Helvetica-Bold' if not record.is_profitable else 'Helvetica'
                )

                row = [
                    Paragraph(record.client.name, styles['TableCellText']),
                    Paragraph(f"€{record.monthly_fee:.2f}", styles['TableCellNumber']),
                    Paragraph(f"€{record.time_cost:.2f}", styles['TableCellNumber']),
                    Paragraph(f"€{record.total_expenses:.2f}", styles['TableCellNumber']),
                    Paragraph(f"€{record.profit:.2f}" if record.profit is not None else 'N/A', styles['TableCellNumber']),
                    Paragraph(f"{record.profit_margin:.1f}%" if record.profit_margin is not None else 'N/A', styles['TableCellCenter']),
                    Paragraph(status_text, status_style)
                ]
                client_data_rows.append(row)
            
            client_table = Table(client_data_rows, colWidths=[1.6*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch], repeatRows=1)
            
            num_data_rows = len(data['profitability_records'])
            table_style_cmds = ReportGenerationService._get_default_table_style(C, styles['TableHeader'].fontName, num_data_rows).getCommands()
            
            for i, record in enumerate(data['profitability_records'], 1): 
                row_bg_color = C['green_light_bg'] if record.is_profitable else C['yellow_light_bg'] 
                table_style_cmds.append(('BACKGROUND', (0, i), (-1, i), row_bg_color))
                if not record.is_profitable: 
                     for col_idx in range(6): 
                         table_style_cmds.append(('TEXTCOLOR', (col_idx, i), (col_idx, i), C['red_dark_text']))


            client_table.setStyle(TableStyle(table_style_cmds))
            story.append(client_table)

        ReportGenerationService._build_pdf_doc(buffer, story, title="Análise de Rentabilidade")
        buffer.seek(0)
        return buffer, 'application/pdf'

    @staticmethod
    def _generate_time_tracking_pdf(data: Dict) -> Tuple[io.BytesIO, str]:
        buffer = io.BytesIO()
        styles, C = ReportGenerationService._get_pdf_styles()
        story = []

        story.append(Paragraph("Resumo de Registo de Tempos", styles['ReportTitle']))
        story.append(Paragraph(data['organization'].name, styles['ReportSubtitle']))
        story.append(Paragraph(f"Gerado em: {data['generation_date'].strftime('%d/%m/%Y às %H:%M')}", styles['SmallTextMuted']))
        story.append(Spacer(1, 0.2*inch))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C['border_color'], spaceBefore=5, spaceAfter=15))

        story.append(Paragraph("Informações do Período", styles['SectionTitle']))
        period_data_content = [
            [Paragraph('Período:', styles['TableCellText']), Paragraph(f"{data['date_from'].strftime('%d/%m/%Y')} - {data['date_to'].strftime('%d/%m/%Y')}", styles['TableCellNumber'])],
            [Paragraph('Total de Registos:', styles['TableCellText']), Paragraph(str(data['total_stats']['total_entries'] or 0), styles['TableCellNumber'])],
            [Paragraph('Total de Horas:', styles['TableCellText']), Paragraph(f"{(data['total_stats']['total_minutes'] or 0) / 60:.1f}h", styles['TableCellNumber'])],
            [Paragraph('Utilizadores Ativos:', styles['TableCellText']), Paragraph(str(data['total_stats']['unique_users'] or 0), styles['TableCellNumber'])],
            [Paragraph('Clientes Envolvidos:', styles['TableCellText']), Paragraph(str(data['total_stats']['unique_clients'] or 0), styles['TableCellNumber'])],
        ]
        period_table = Table(period_data_content, colWidths=[2.8*inch, 2.8*inch])
        period_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, C['border_color']),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (0,-1), C['bg_light']),
            ('LEFTPADDING', (0,0), (-1,-1), 6),('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 5),('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(period_table)
        story.append(Spacer(1, 0.3*inch))

        if data['user_stats']:
            story.append(Paragraph("Tempo por Utilizador (Top 10)", styles['SectionTitle']))
            headers = [Paragraph('Utilizador', styles['TableHeader']), Paragraph('Total Horas', styles['TableHeader']), Paragraph('Nº Registos', styles['TableHeader']), Paragraph('Nº Clientes', styles['TableHeader'])]
            user_data_rows = [headers]
            for user_stat in data['user_stats'][:10]:
                row = [
                    Paragraph(user_stat['user__username'], styles['TableCellText']),
                    Paragraph(f"{(user_stat['total_minutes'] or 0) / 60:.1f}h", styles['TableCellCenter']),
                    Paragraph(str(user_stat['entry_count']), styles['TableCellCenter']),
                    Paragraph(str(user_stat['client_count']), styles['TableCellCenter'])
                ]
                user_data_rows.append(row)
            user_table = Table(user_data_rows, colWidths=[2.1*inch, 1.2*inch, 1.2*inch, 1.2*inch], repeatRows=1) 
            user_table.setStyle(ReportGenerationService._get_default_table_style(C, styles['TableHeader'].fontName, len(data['user_stats'][:10])))
            story.append(user_table)
            story.append(Spacer(1, 0.3*inch))

        if data['client_stats']:
            story.append(Paragraph("Tempo por Cliente (Top 10)", styles['SectionTitle']))
            headers = [Paragraph('Cliente', styles['TableHeader']), Paragraph('Total Horas', styles['TableHeader']), Paragraph('Nº Registos', styles['TableHeader']), Paragraph('Nº Utilizadores', styles['TableHeader'])]
            client_data_rows = [headers]
            for client_stat in data['client_stats'][:10]:
                row = [
                    Paragraph(client_stat['client__name'], styles['TableCellText']),
                    Paragraph(f"{(client_stat['total_minutes'] or 0) / 60:.1f}h", styles['TableCellCenter']),
                    Paragraph(str(client_stat['entry_count']), styles['TableCellCenter']),
                    Paragraph(str(client_stat['user_count']), styles['TableCellCenter'])
                ]
                client_data_rows.append(row)
            client_table = Table(client_data_rows, colWidths=[2.1*inch, 1.2*inch, 1.2*inch, 1.2*inch], repeatRows=1) 
            client_table.setStyle(ReportGenerationService._get_default_table_style(C, styles['TableHeader'].fontName, len(data['client_stats'][:10])))
            story.append(client_table)
            story.append(Spacer(1, 0.3*inch))

        if data['time_entries']: 
            story.append(Paragraph(f"Detalhe dos Registos (até {len(data['time_entries'])})", styles['SectionTitle']))
            headers = [
                Paragraph('Data', styles['TableHeader']), Paragraph('Utilizador', styles['TableHeader']), 
                Paragraph('Cliente', styles['TableHeader']), Paragraph('Minutos', styles['TableHeader']),
                Paragraph('Descrição', styles['TableHeader'])
            ]
            entry_data_rows = [headers]
            for entry in data['time_entries']: 
                desc_text = entry.description if len(entry.description) < 35 else entry.description[:32] + "..."
                row = [
                    Paragraph(entry.date.strftime('%d/%m/%y'), styles['TableCellCenter']),
                    Paragraph(entry.user.username, styles['TableCellText']),
                    Paragraph(entry.client.name, styles['TableCellText']),
                    Paragraph(str(entry.minutes_spent), styles['TableCellCenter']),
                    Paragraph(desc_text, styles['TableCellText'])
                ]
                entry_data_rows.append(row)
            entry_table = Table(entry_data_rows, colWidths=[0.7*inch, 1.0*inch, 1.5*inch, 0.6*inch, 2.6*inch], repeatRows=1) 
            entry_table.setStyle(ReportGenerationService._get_default_table_style(C, styles['TableHeader'].fontName, len(data['time_entries'])))
            story.append(entry_table)

        ReportGenerationService._build_pdf_doc(buffer, story, title="Resumo de Registo de Tempos")
        buffer.seek(0)
        return buffer, 'application/pdf'

    @staticmethod
    def _generate_client_summary_csv(data: Dict) -> Tuple[io.BytesIO, str]:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        
        writer.writerow(['Relatório de Resumo de Clientes'])
        writer.writerow([f"Organização: {data['organization'].name}"])
        writer.writerow([f"Gerado em: {data['generation_date'].strftime('%d/%m/%Y às %H:%M')}"])
        if data.get('date_from'): writer.writerow([f"Desde: {data['date_from'].strftime('%d/%m/%Y')}"]) 
        if data.get('date_to'): writer.writerow([f"Até: {data['date_to'].strftime('%d/%m/%Y')}"])     
        writer.writerow([])
        
        writer.writerow(['Cliente', 'Gestor de Conta', 'Avença Mensal (€)', 'Tarefas Ativas', 'Tarefas Concluídas (Período)', 'Tempo Total (horas)', 'Margem de Lucro Recente (%)'])
        
        for client_detail in data['clients_data']: 
            client_obj = client_detail['client_obj']
            profit_margin = client_detail['recent_profitability'].profit_margin if client_detail['recent_profitability'] else None
            
            writer.writerow([
                client_obj.name,
                client_obj.account_manager.username if client_obj.account_manager else 'N/A',
                float(client_obj.monthly_fee or 0),
                client_detail['active_tasks_count'],
                client_detail['completed_tasks_count'],
                round((client_detail['total_time_minutes'] or 0) / 60, 1),
                float(profit_margin) if profit_margin is not None else 'N/A'
            ])
        
        csv_content = buffer.getvalue()
        buffer.close()
        bytes_buffer = io.BytesIO(csv_content.encode('utf-8-sig')) 
        return bytes_buffer, 'text/csv'
    
    @staticmethod
    def _generate_client_summary_xlsx(data: Dict) -> Tuple[io.BytesIO, str]:
        buffer = io.BytesIO()
        workbook = openpyxl.Workbook()
        worksheet = workbook.active
        worksheet.title = "Resumo de Clientes"
        
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="002060", end_color="002060", fill_type="solid") 
        center_alignment = Alignment(horizontal="center", vertical="center")
        left_alignment = Alignment(horizontal="left", vertical="center")
        
        worksheet['A1'] = f"Resumo de Clientes - {data['organization'].name}"
        worksheet['A1'].font = Font(bold=True, size=16)
        worksheet.merge_cells('A1:G1')
        worksheet['A1'].alignment = center_alignment
        
        row_idx = 3
        worksheet.cell(row=row_idx, column=1, value="Gerado em:").font = Font(bold=True)
        worksheet.cell(row=row_idx, column=2, value=data['generation_date'].strftime('%d/%m/%Y às %H:%M'))
        row_idx += 1
        if data.get('date_from'):
            worksheet.cell(row=row_idx, column=1, value="Desde:").font = Font(bold=True)
            worksheet.cell(row=row_idx, column=2, value=data['date_from'].strftime('%d/%m/%Y')) 
            row_idx += 1
        if data.get('date_to'):
            worksheet.cell(row=row_idx, column=1, value="Até:").font = Font(bold=True)
            worksheet.cell(row=row_idx, column=2, value=data['date_to'].strftime('%d/%m/%Y')) 
            row_idx += 1
        
        worksheet.cell(row=row_idx, column=1, value="Total de Clientes:").font = Font(bold=True)
        worksheet.cell(row=row_idx, column=2, value=data['total_clients'])
        row_idx += 1
        worksheet.cell(row=row_idx, column=1, value="Total Avenças (€):").font = Font(bold=True)
        worksheet.cell(row=row_idx, column=2, value=float(data['total_monthly_fees'])).number_format = '#,##0.00€'
        row_idx += 2 
        
        headers = ['Cliente', 'Gestor de Conta', 'Avença Mensal (€)', 'Tarefas Ativas', 'Tarefas Concluídas', 'Tempo (horas)', 'Margem de Lucro (%)']
        for col, header_text in enumerate(headers, 1):
            cell = worksheet.cell(row=row_idx, column=col, value=header_text)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_alignment
        
        row_idx += 1
        for client_detail in data['clients_data']: 
            client_obj = client_detail['client_obj']
            profit_margin = client_detail['recent_profitability'].profit_margin if client_detail['recent_profitability'] else None
            
            worksheet.cell(row=row_idx, column=1, value=client_obj.name).alignment = left_alignment
            worksheet.cell(row=row_idx, column=2, value=client_obj.account_manager.username if client_obj.account_manager else 'N/A').alignment = left_alignment
            worksheet.cell(row=row_idx, column=3, value=float(client_obj.monthly_fee or 0)).number_format = '#,##0.00€'
            worksheet.cell(row=row_idx, column=4, value=client_detail['active_tasks_count']).alignment = center_alignment
            worksheet.cell(row=row_idx, column=5, value=client_detail['completed_tasks_count']).alignment = center_alignment
            worksheet.cell(row=row_idx, column=6, value=round((client_detail['total_time_minutes'] or 0) / 60, 1)).number_format = '0.0 "h"'
            cell_margin = worksheet.cell(row=row_idx, column=7, value=float(profit_margin) if profit_margin is not None else 'N/A')
            if profit_margin is not None: cell_margin.number_format = '0.0"%"'
            else: cell_margin.alignment = center_alignment
            row_idx +=1
        
        for column_cells in worksheet.columns:
            length = max(len(str(cell.value)) for cell in column_cells if cell.value)
            worksheet.column_dimensions[column_cells[0].column_letter].width = length + 3
        
        workbook.save(buffer)
        buffer.seek(0)
        return buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    @staticmethod
    def _generate_profitability_csv(data: Dict) -> Tuple[io.BytesIO, str]:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['Análise de Rentabilidade'])
        writer.writerow([f"Organização: {data['organization'].name}"])
        writer.writerow([f"Período: {data['month_name']}"])
        writer.writerow([f"Gerado em: {data['generation_date'].strftime('%d/%m/%Y às %H:%M')}"])
        writer.writerow([])
        
        stats = data['stats']
        writer.writerow(['Estatísticas Resumo'])
        writer.writerow(['Total de Clientes:', data['total_records']])
        writer.writerow(['Clientes Rentáveis:', stats['profitable_count'] or 0])
        writer.writerow(['Clientes Não Rentáveis:', stats['unprofitable_count'] or 0])
        writer.writerow(['Lucro Total (€):', float(stats['total_profit']) if stats['total_profit'] else 0])
        writer.writerow(['Margem Média (%):', float(stats['avg_margin']) if stats['avg_margin'] else 0])
        writer.writerow([])
        
        writer.writerow(['Cliente', 'Avença Mensal (€)', 'Custo do Tempo (€)', 'Total Despesas (€)', 'Lucro (€)', 'Margem (%)', 'É Rentável'])
        for record in data['profitability_records']:
            writer.writerow([
                record.client.name,
                float(record.monthly_fee), float(record.time_cost), float(record.total_expenses),
                float(record.profit) if record.profit is not None else 0,
                float(record.profit_margin) if record.profit_margin is not None else 0,
                'Sim' if record.is_profitable else 'Não'
            ])
        csv_content = buffer.getvalue()
        buffer.close()
        return io.BytesIO(csv_content.encode('utf-8-sig')), 'text/csv'

    @staticmethod
    def _generate_profitability_xlsx(data: Dict) -> Tuple[io.BytesIO, str]:
        buffer = io.BytesIO()
        workbook = openpyxl.Workbook()
        worksheet = workbook.active
        worksheet.title = "Análise Rentabilidade"

        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="0070C0", end_color="0070C0", fill_type="solid") 
        profitable_fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid") 
        unprofitable_fill = PatternFill(start_color="FFE2DE", end_color="FFE2DE", fill_type="solid") 
        center_alignment = Alignment(horizontal="center", vertical="center")
        
        worksheet['A1'] = f"Análise de Rentabilidade - {data['month_name']}"
        worksheet['A1'].font = Font(bold=True, size=16); worksheet.merge_cells('A1:G1'); worksheet['A1'].alignment = center_alignment
        worksheet['A2'] = data['organization'].name; worksheet['A2'].font = Font(bold=True, size=12); worksheet.merge_cells('A2:G2'); worksheet['A2'].alignment = center_alignment
        
        row_idx = 4
        stats = data['stats']
        worksheet.cell(row=row_idx, column=1, value="Estatísticas Resumo").font = Font(bold=True); row_idx+=1
        worksheet.cell(row=row_idx, column=1, value="Total de Clientes:"); worksheet.cell(row=row_idx, column=2, value=data['total_records']); row_idx+=1
        worksheet.cell(row=row_idx, column=1, value="Clientes Rentáveis:"); worksheet.cell(row=row_idx, column=2, value=stats['profitable_count'] or 0); row_idx+=1
        worksheet.cell(row=row_idx, column=1, value="Clientes Não Rentáveis:"); worksheet.cell(row=row_idx, column=2, value=stats['unprofitable_count'] or 0); row_idx+=1
        worksheet.cell(row=row_idx, column=1, value="Lucro Total (€):"); worksheet.cell(row=row_idx, column=2, value=float(stats['total_profit']) if stats['total_profit'] else 0).number_format = '#,##0.00€'; row_idx+=1
        cell_avg_margin = worksheet.cell(row=row_idx, column=2, value=float(stats['avg_margin']) if stats['avg_margin'] else 'N/A')
        worksheet.cell(row=row_idx, column=1, value="Margem Média (%):") 
        if stats['avg_margin'] is not None: cell_avg_margin.number_format = '0.0"%"'
        row_idx+=2

        headers = ['Cliente', 'Avença Mensal (€)', 'Custo do Tempo (€)', 'Total Despesas (€)', 'Lucro (€)', 'Margem (%)', 'É Rentável']
        for col, header_text in enumerate(headers, 1):
            cell = worksheet.cell(row=row_idx, column=col, value=header_text)
            cell.font = header_font; cell.fill = header_fill; cell.alignment = center_alignment
        row_idx+=1

        for record in data['profitability_records']:
            worksheet.cell(row=row_idx, column=1, value=record.client.name)
            worksheet.cell(row=row_idx, column=2, value=float(record.monthly_fee)).number_format = '#,##0.00€'
            worksheet.cell(row=row_idx, column=3, value=float(record.time_cost)).number_format = '#,##0.00€'
            worksheet.cell(row=row_idx, column=4, value=float(record.total_expenses)).number_format = '#,##0.00€'
            worksheet.cell(row=row_idx, column=5, value=float(record.profit) if record.profit is not None else 0).number_format = '#,##0.00€'
            cell_margin = worksheet.cell(row=row_idx, column=6, value=float(record.profit_margin) if record.profit_margin is not None else 'N/A')
            if record.profit_margin is not None: cell_margin.number_format = '0.0"%"'
            worksheet.cell(row=row_idx, column=7, value='Sim' if record.is_profitable else 'Não').alignment = center_alignment
            
            fill_to_apply = profitable_fill if record.is_profitable else unprofitable_fill
            for col_num in range(1, 8): worksheet.cell(row=row_idx, column=col_num).fill = fill_to_apply
            row_idx+=1
            
        for column_cells in worksheet.columns:
            length = max(len(str(cell.value if cell.value is not None else "")) for cell in column_cells)
            worksheet.column_dimensions[column_cells[0].column_letter].width = length + 3
        
        workbook.save(buffer)
        buffer.seek(0)
        return buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    
    @staticmethod
    def _generate_time_tracking_csv(data: Dict) -> Tuple[io.BytesIO, str]:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['Resumo de Registo de Tempos'])
        writer.writerow([f"Organização: {data['organization'].name}"])
        writer.writerow([f"Período: {data['date_from'].strftime('%d/%m/%Y')} - {data['date_to'].strftime('%d/%m/%Y')}"])
        writer.writerow([f"Gerado em: {data['generation_date'].strftime('%d/%m/%Y às %H:%M')}"])
        writer.writerow([])
        
        writer.writerow(['Estatísticas Gerais'])
        writer.writerow(['Total de Registos:', data['total_stats']['total_entries'] or 0])
        writer.writerow(['Total de Minutos:', data['total_stats']['total_minutes'] or 0])
        writer.writerow(['Total de Horas:', f"{(data['total_stats']['total_minutes'] or 0) / 60:.1f}"])
        writer.writerow(['Utilizadores Únicos:', data['total_stats']['unique_users'] or 0])
        writer.writerow(['Clientes Únicos:', data['total_stats']['unique_clients'] or 0])
        writer.writerow([])
        
        writer.writerow(['Registos Detalhados (Amostra)'])
        writer.writerow(['Data', 'Utilizador', 'Cliente', 'Tarefa', 'Categoria', 'Descrição', 'Minutos', 'Horas'])
        for entry in data['time_entries']: 
            writer.writerow([
                entry.date.strftime('%d/%m/%Y'), entry.user.username, entry.client.name,
                entry.task.title if entry.task else 'N/A',
                entry.category.name if entry.category else 'N/A',
                entry.description, entry.minutes_spent, round(entry.minutes_spent / 60, 2)
            ])
        csv_content = buffer.getvalue()
        buffer.close()
        return io.BytesIO(csv_content.encode('utf-8-sig')), 'text/csv'

    @staticmethod
    def _generate_time_tracking_xlsx(data: Dict) -> Tuple[io.BytesIO, str]:
        buffer = io.BytesIO()
        workbook = openpyxl.Workbook()
        
        summary_sheet = workbook.active
        summary_sheet.title = "Resumo Tempos"
        summary_sheet['A1'] = f"Resumo de Registo de Tempos - {data['organization'].name}"
        summary_sheet['A1'].font = Font(bold=True, size=16); summary_sheet.merge_cells('A1:E1')
        
        row_idx = 3
        summary_sheet.cell(row=row_idx, column=1, value="Período:").font = Font(bold=True)
        summary_sheet.cell(row=row_idx, column=2, value=f"{data['date_from'].strftime('%d/%m/%Y')} - {data['date_to'].strftime('%d/%m/%Y')}"); row_idx+=1
        summary_sheet.cell(row=row_idx, column=1, value="Total Registos:").font = Font(bold=True)
        summary_sheet.cell(row=row_idx, column=2, value=data['total_stats']['total_entries'] or 0); row_idx+=1
        summary_sheet.cell(row=row_idx, column=1, value="Total Horas:").font = Font(bold=True)
        summary_sheet.cell(row=row_idx, column=2, value=f"{(data['total_stats']['total_minutes'] or 0) / 60:.1f}").number_format = '0.0 "h"'; row_idx+=1
        
        details_sheet = workbook.create_sheet("Registos Detalhados")
        headers = ['Data', 'Utilizador', 'Cliente', 'Tarefa', 'Categoria', 'Descrição', 'Minutos', 'Horas']
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid") 
        for col, header_text in enumerate(headers, 1):
            cell = details_sheet.cell(row=1, column=col, value=header_text)
            cell.font = header_font; cell.fill = header_fill
        
        row_idx_details = 2
        for entry in data['time_entries']: 
            details_sheet.cell(row=row_idx_details, column=1, value=entry.date.strftime('%d/%m/%Y'))
            details_sheet.cell(row=row_idx_details, column=2, value=entry.user.username)
            details_sheet.cell(row=row_idx_details, column=3, value=entry.client.name)
            details_sheet.cell(row=row_idx_details, column=4, value=entry.task.title if entry.task else 'N/A')
            details_sheet.cell(row=row_idx_details, column=5, value=entry.category.name if entry.category else 'N/A')
            details_sheet.cell(row=row_idx_details, column=6, value=entry.description)
            details_sheet.cell(row=row_idx_details, column=7, value=entry.minutes_spent)
            details_sheet.cell(row=row_idx_details, column=8, value=round(entry.minutes_spent / 60, 2)).number_format = '0.00'
            row_idx_details += 1
            
        for sheet in [summary_sheet, details_sheet]:
            for column_cells in sheet.columns:
                length = max(len(str(cell.value if cell.value is not None else "")) for cell in column_cells)
                sheet.column_dimensions[column_cells[0].column_letter].width = length + 3
        
        workbook.save(buffer)
        buffer.seek(0)
        return buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'