# backend/api/services/saft_parser.py

import xml.etree.ElementTree as ET
from decimal import Decimal, InvalidOperation
import html
import logging

logger = logging.getLogger(__name__)

class SAFTParser:
    """A robust service to parse SAFT-PT XML files, handling missing tags and namespaces."""

    def __init__(self, file_or_path):
        self.file_or_path = file_or_path
        self.ns = {'saf': 'urn:OECD:StandardAuditFile-Tax:PT_1.04_01'}

    def _extract_real_xml_content(self, raw_content):
        # This function is good, no changes needed here.
        if b'<!DOCTYPE article' in raw_content[:500] or b'<article' in raw_content[:500]:
            try:
                wrapper_root = ET.fromstring(raw_content)
                inner_xml_escaped = "".join(p.text for p in wrapper_root.findall('.//para') if p.text)
                inner_xml = html.unescape(inner_xml_escaped)
                return inner_xml.strip()
            except ET.ParseError:
                logger.warning("Could not parse wrapper XML, falling back to raw content.")
                return raw_content.decode('utf-8', errors='ignore')
        else:
            return raw_content.decode('utf-8', errors='ignore')

    def _safe_find_text(self, node, path, default=None):
        """Safely finds a node and returns its text. Handles namespaces."""
        if node is None:
            return default
        # Try with namespace first
        found_node = node.find(path, self.ns)
        if found_node is None:
            # Fallback to try without namespace
            path_no_ns = path.replace('saf:', '')
            found_node = node.find(path_no_ns)
        
        return found_node.text if found_node is not None and found_node.text is not None else default

    def _parse_header(self, root):
        """Parses the <Header> section of the SAFT file safely."""
        header_node = root.find('saf:Header', self.ns)
        if header_node is None:
            header_node = root.find('Header')  # Fallback
            if header_node is None:
                raise ValueError("SAFT Parse Error: Could not find the <Header> tag.")

        address_node = header_node.find('saf:CompanyAddress', self.ns)
        if address_node is None:
            address_node = header_node.find('CompanyAddress') # Fallback

        return {
            'fiscal_year': self._safe_find_text(header_node, 'saf:FiscalYear'),
            'start_date': self._safe_find_text(header_node, 'saf:StartDate'),
            'end_date': self._safe_find_text(header_node, 'saf:EndDate'),
            'company_name': self._safe_find_text(header_node, 'saf:CompanyName'),
            # Correct path for CompanyAddress sub-element
            'company_tax_id': self._safe_find_text(header_node, 'saf:TaxRegistrationNumber'),
        }

    def _calculate_summary(self, root):
        """Safely calculates high-level summary figures from the SAFT file."""
        invoices = root.findall('.//saf:SalesInvoices/saf:Invoice', self.ns)
        
        total_gross = Decimal('0.0')
        total_net = Decimal('0.0')
        total_tax = Decimal('0.0')
        
        for invoice in invoices:
            doc_totals = invoice.find('saf:DocumentTotals', self.ns)
            if doc_totals is not None:
                try:
                    gross_text = self._safe_find_text(doc_totals, 'saf:GrossTotal', '0')
                    net_text = self._safe_find_text(doc_totals, 'saf:NetTotal', '0')
                    tax_text = self._safe_find_text(doc_totals, 'saf:TaxPayable', '0')
                    
                    total_gross += Decimal(gross_text) if gross_text else Decimal('0')
                    total_net += Decimal(net_text) if net_text else Decimal('0')
                    total_tax += Decimal(tax_text) if tax_text else Decimal('0')
                except InvalidOperation:
                    logger.warning(f"Invalid decimal value in DocumentTotals for invoice {invoice.findtext('saf:InvoiceNo', default='N/A')}")
                    continue

        return {
            'invoice_count': len(invoices),
            'total_gross': float(total_gross),
            'total_net': float(total_net),
            'total_tax': float(total_tax),
        }

    def parse(self):
        """Main parsing method with enhanced error handling."""
        try:
            if hasattr(self.file_or_path, 'read'):
                self.file_or_path.seek(0)
                raw_content = self.file_or_path.read()
            else:
                with open(self.file_or_path, 'rb') as f:
                    raw_content = f.read()

            clean_xml_string = self._extract_real_xml_content(raw_content)

            if not clean_xml_string or not clean_xml_string.strip().startswith('<?xml'):
                raise ValueError("Could not find valid XML content within the provided file.")

            root = ET.fromstring(clean_xml_string)
            
            # The root element <AuditFile> has the namespace, so we need to check it
            if '}' in root.tag:
                # If a namespace is present in the root tag, re-evaluate it
                self.ns['saf'] = root.tag.split('}')[0][1:]
                logger.info(f"Detected SAFT namespace: {self.ns['saf']}")

            header = self._parse_header(root)
            summary = self._calculate_summary(root)
            
            return {'header': header, 'summary': summary}
        
        except ET.ParseError as e:
            logger.error(f"XML Parsing Error: {e}")
            raise ValueError(f"O ficheiro XML está malformado. Erro: {e}")
        except Exception as e:
            logger.error(f"Unexpected error during SAFT parsing: {e}", exc_info=True)
            raise