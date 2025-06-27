import fitz  # PyMuPDF
from pyzbar.pyzbar import decode
from PIL import Image
import io
from urllib.parse import urlparse
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class QRCodeParser:
    """Extracts and parses ATCUD QR codes from image or PDF files."""

    def process_file(self, file_content):
        """Detects file type and extracts QR code data."""
        try:
            # Try to open as PDF first
            pdf_doc = fitz.open(stream=file_content, filetype="pdf")
            return self._extract_from_pdf(pdf_doc)
        except Exception as e:
            logger.info(f"Not a PDF or PDF processing failed: {e}. Trying as image.")
            # Reset file pointer and try as image
            file_content.seek(0)
            return self._extract_from_image(file_content)

    def _extract_from_pdf(self, pdf_doc):
        """Iterates through a PDF's pages and images to find a QR code."""
        for page_num in range(len(pdf_doc)):
            page = pdf_doc.load_page(page_num)
            image_list = page.get_images(full=True)
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = pdf_doc.extract_image(xref)
                image_bytes = base_image["image"]
                
                qr_data = self._extract_from_image(io.BytesIO(image_bytes))
                if qr_data:
                    return qr_data
        return None

    def _extract_from_image(self, image_stream):
        """Decodes a QR code from an image stream."""
        try:
            image = Image.open(image_stream)
            decoded_objects = decode(image)
            
            if not decoded_objects:
                logger.warning("No QR codes found in image")
                return None
            
            for obj in decoded_objects:
                qr_string = obj.data.decode('utf-8')
                logger.info(f"Found QR code: {qr_string[:100]}...")
                
                if 'https://qr.at.gov.pt' in qr_string:
                    parsed_data = self._parse_atcud_url(qr_string)
                    if parsed_data:
                        return parsed_data
                        
            logger.warning("No ATCUD QR codes found")
            return None
            
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return None

    def _parse_atcud_url(self, url_string):
        """Parses the data from the ATCUD URL string."""
        try:
            parsed_url = urlparse(url_string)
            path_parts = parsed_url.path.strip('/').split('/')
            
            if len(path_parts) < 1:
                logger.error("Invalid ATCUD URL structure")
                return None
                
            data_string = path_parts[-1]
            
            # Parse Key:Value*Key:Value format
            fields = {}
            for item in data_string.split('*'):
                if ':' in item:
                    key, value = item.split(':', 1)
                    fields[key] = value

            # Map to model fields
            parsed_data = {
                'raw_qr_code_data': url_string,
                'nif_emitter': fields.get('A'),
                'nif_acquirer': fields.get('B'),
                'country_code': fields.get('C'),
                'doc_type': fields.get('D'),
                'doc_date': self._parse_date(fields.get('F')),
                'doc_uid': fields.get('G'),
                'atcud': fields.get('H'),
                'taxable_amount': self._parse_decimal(fields.get('I1')),
                'vat_amount': self._parse_decimal(fields.get('I3')),
                'gross_total': self._parse_decimal(fields.get('N')),
            }
            
            logger.info(f"Successfully parsed ATCUD data")
            return parsed_data
            
        except Exception as e:
            logger.error(f"Error parsing ATCUD string: {e}")
            return None
    
    def _parse_date(self, date_str):
        """Parse date from YYYYMMDD format."""
        if not date_str or len(date_str) != 8:
            return None
        try:
            return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
        except:
            return None
    
    def _parse_decimal(self, value_str):
        """Safely parse decimal values."""
        if not value_str:
            return Decimal('0.0')
        try:
            return Decimal(value_str)
        except:
            return Decimal('0.0')