# api/services/saft_parser.py
import xml.etree.ElementTree as ET
from decimal import Decimal, InvalidOperation

class SAFTParser:
    """A service to parse SAFT-PT XML files and extract key information."""

    def __init__(self, file_path):
        self.file_path = file_path
        # The namespace is absolutely critical for SAFT-PT files.
        self.ns = {'saf': 'urn:OECD:StandardAuditFile-Tax:PT_1.04_01'}

    def parse(self):
        """Main parsing method."""
        tree = ET.parse(self.file_path)
        root = tree.getroot()

        header = self._parse_header(root)
        summary = self._calculate_summary(root)
        
        # You can add more parsing methods here as needed
        # e.g., customers = self._parse_customers(root)
        
        return {
            'header': header,
            'summary': summary,
        }

    def _safe_find_text(self, node, path, default=''):
        """Safely finds a node and returns its text, handling missing nodes."""
        found_node = node.find(path, self.ns)
        return found_node.text if found_node is not None else default

    def _parse_header(self, root):
        """Parses the <Header> section of the SAFT file."""
        header_node = root.find('saf:Header', self.ns)
        if header_node is None:
            return {}
        return {
            'fiscal_year': self._safe_find_text(header_node, 'saf:FiscalYear'),
            'start_date': self._safe_find_text(header_node, 'saf:StartDate'),
            'end_date': self._safe_find_text(header_node, 'saf:EndDate'),
            'company_name': self._safe_find_text(header_node, 'saf:CompanyName'),
            'company_tax_id': self._safe_find_text(header_node, 'saf:CompanyAddress/saf:TaxRegistrationNumber'),
        }

    def _calculate_summary(self, root):
        """Calculates high-level summary figures from the SAFT file."""
        invoices = root.findall('.//saf:SalesInvoices/saf:Invoice', self.ns)
        
        total_gross = Decimal('0.0')
        total_net = Decimal('0.0')
        total_tax = Decimal('0.0')
        
        for invoice in invoices:
            doc_totals = invoice.find('saf:DocumentTotals', self.ns)
            if doc_totals is not None:
                try:
                    total_gross += Decimal(self._safe_find_text(doc_totals, 'saf:GrossTotal', '0'))
                    total_net += Decimal(self._safe_find_text(doc_totals, 'saf:NetTotal', '0'))
                    total_tax += Decimal(self._safe_find_text(doc_totals, 'saf:TaxPayable', '0'))
                except InvalidOperation:
                    # Handle cases where text might not be a valid decimal
                    continue

        return {
            'invoice_count': len(invoices),
            'total_gross': float(total_gross),
            'total_net': float(total_net),
            'total_tax': float(total_tax),
        }