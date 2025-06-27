import cv2
import numpy as np
from PIL import Image, ImageEnhance
import pyzbar.pyzbar as pyzbar
import io
import base64
import re
from typing import Dict, Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)

class EnhancedQRProcessor:
    """Enhanced QR Code processor for Portuguese invoice receipts."""
    
    def __init__(self):
        self.qr_patterns = {
            # Portuguese AT QR Code pattern
            'atcud': r'([A-Z0-9]{8}-[0-9]+)',
            'nif_emitter': r'(\d{9})',
            'amount': r'(\d+\.\d{2})',
            'date': r'(\d{4}-\d{2}-\d{2})',
            'doc_type': r'(FS|FT|FR|ND|NC)',
        }
    
    def preprocess_image(self, image: np.ndarray) -> List[np.ndarray]:
        """
        Create multiple preprocessed versions of the image to improve QR detection.
        """
        processed_images = []
        
        # Original image
        processed_images.append(image)
        
        # Convert to grayscale if not already
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        processed_images.append(gray)
        
        # Apply different enhancement techniques
        techniques = [
            # 1. Histogram equalization
            lambda img: cv2.equalizeHist(img),
            
            # 2. CLAHE (Contrast Limited Adaptive Histogram Equalization)
            lambda img: cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(img),
            
            # 3. Gaussian blur + threshold
            lambda img: cv2.threshold(cv2.GaussianBlur(img, (5, 5), 0), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
            
            # 4. Adaptive threshold
            lambda img: cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2),
            
            # 5. Morphological operations
            lambda img: cv2.morphologyEx(
                cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2),
                cv2.MORPH_CLOSE,
                cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            ),
            
            # 6. Bilateral filter + threshold
            lambda img: cv2.threshold(cv2.bilateralFilter(img, 11, 17, 17), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
            
            # 7. Contrast enhancement
            lambda img: cv2.convertScaleAbs(img, alpha=1.5, beta=30),
            
            # 8. Gamma correction
            lambda img: self._adjust_gamma(img, 0.7),
            lambda img: self._adjust_gamma(img, 1.3),
        ]
        
        for technique in techniques:
            try:
                enhanced = technique(gray)
                processed_images.append(enhanced)
            except Exception as e:
                logger.debug(f"Enhancement technique failed: {e}")
                continue
        
        return processed_images
    
    def _adjust_gamma(self, image: np.ndarray, gamma: float = 1.0) -> np.ndarray:
        """Apply gamma correction to the image."""
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
        return cv2.LUT(image, table)
    
    def detect_qr_codes(self, image: np.ndarray) -> List[str]:
        """
        Detect and decode QR codes from an image using multiple preprocessing techniques.
        """
        qr_data_list = []
        processed_images = self.preprocess_image(image)
        
        for i, processed_img in enumerate(processed_images):
            try:
                # Try different scales and rotations
                scales = [1.0, 0.8, 1.2, 0.6, 1.5]
                rotations = [0, 90, 180, 270]
                
                for scale in scales:
                    for rotation in rotations:
                        test_img = processed_img.copy()
                        
                        # Scale the image
                        if scale != 1.0:
                            height, width = test_img.shape[:2]
                            new_width = int(width * scale)
                            new_height = int(height * scale)
                            test_img = cv2.resize(test_img, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
                        
                        # Rotate the image
                        if rotation != 0:
                            height, width = test_img.shape[:2]
                            center = (width // 2, height // 2)
                            rotation_matrix = cv2.getRotationMatrix2D(center, rotation, 1.0)
                            test_img = cv2.warpAffine(test_img, rotation_matrix, (width, height))
                        
                        # Decode QR codes
                        qr_codes = pyzbar.decode(test_img)
                        
                        for qr in qr_codes:
                            try:
                                qr_data = qr.data.decode('utf-8')
                                if qr_data and qr_data not in qr_data_list:
                                    qr_data_list.append(qr_data)
                                    logger.info(f"QR Code found with preprocessing {i}, scale {scale}, rotation {rotation}: {qr_data[:50]}...")
                            except UnicodeDecodeError:
                                try:
                                    # Try different encodings
                                    for encoding in ['latin-1', 'cp1252', 'iso-8859-1']:
                                        qr_data = qr.data.decode(encoding)
                                        if qr_data and qr_data not in qr_data_list:
                                            qr_data_list.append(qr_data)
                                            break
                                except:
                                    continue
                        
                        # If we found QR codes, we can break early for efficiency
                        if qr_data_list:
                            break
                    if qr_data_list:
                        break
                        
            except Exception as e:
                logger.debug(f"QR detection failed for preprocessing {i}: {e}")
                continue
        
        return qr_data_list
    
    def parse_portuguese_qr_data(self, qr_data: str) -> Dict:
        """
        Parse Portuguese AT (Autoridade Tributária) QR code data.
        """
        data = {}
        
        # QR code format for Portuguese invoices is typically:
        # A:NIF_Emitter*B:NIF_Acquirer*C:Country*D:DocType*E:Status*F:Date*G:UniqueID*H:ATCUD*I1:TaxableAmount*I2:0.00*I3:TaxAmount*I4:0.00*I5:0.00*I6:0.00*I7:TaxableAmount*I8:VATAmount*N:GrossTotal*O:TaxAmount*P:WithholdingTax*Q:ExemptAmount*R:ReducedRate*S:IntermediateRate*T:NormalRate
        
        try:
            # Split by asterisk - Portuguese QR format
            if '*' in qr_data:
                parts = qr_data.split('*')
                
                for part in parts:
                    if ':' in part:
                        key, value = part.split(':', 1)
                        
                        # Map Portuguese QR code fields
                        field_mapping = {
                            'A': 'nif_emitter',
                            'B': 'nif_acquirer', 
                            'C': 'country_code',
                            'D': 'doc_type',
                            'E': 'status',
                            'F': 'doc_date',
                            'G': 'doc_uid',
                            'H': 'atcud',
                            'I1': 'taxable_amount_normal',
                            'I2': 'taxable_amount_intermediate', 
                            'I3': 'tax_amount_normal',
                            'I4': 'tax_amount_intermediate',
                            'I5': 'taxable_amount_reduced',
                            'I6': 'tax_amount_reduced',
                            'I7': 'taxable_amount_exempt',
                            'I8': 'tax_amount_exempt',
                            'N': 'gross_total',
                            'O': 'total_tax',
                            'P': 'withholding_tax',
                            'Q': 'exempt_amount',
                            'R': 'reduced_rate_amount',
                            'S': 'intermediate_rate_amount', 
                            'T': 'normal_rate_amount'
                        }
                        
                        if key in field_mapping:
                            field_name = field_mapping[key]
                            
                            # Convert numeric fields
                            if field_name in ['taxable_amount_normal', 'taxable_amount_intermediate', 
                                            'tax_amount_normal', 'tax_amount_intermediate',
                                            'taxable_amount_reduced', 'tax_amount_reduced',
                                            'taxable_amount_exempt', 'tax_amount_exempt',
                                            'gross_total', 'total_tax', 'withholding_tax',
                                            'exempt_amount', 'reduced_rate_amount', 
                                            'intermediate_rate_amount', 'normal_rate_amount']:
                                try:
                                    data[field_name] = float(value)
                                except ValueError:
                                    data[field_name] = value
                            else:
                                data[field_name] = value
            
            # Calculate main amounts for the invoice
            if 'taxable_amount_normal' in data or 'gross_total' in data:
                # Calculate taxable amount (sum of all taxable amounts)
                taxable_fields = ['taxable_amount_normal', 'taxable_amount_intermediate', 
                                'taxable_amount_reduced', 'taxable_amount_exempt']
                taxable_total = sum(data.get(field, 0) for field in taxable_fields)
                if taxable_total > 0:
                    data['taxable_amount'] = taxable_total
                
                # Calculate VAT amount (sum of all tax amounts)
                vat_fields = ['tax_amount_normal', 'tax_amount_intermediate', 
                            'tax_amount_reduced', 'tax_amount_exempt']
                vat_total = sum(data.get(field, 0) for field in vat_fields)
                if vat_total > 0:
                    data['vat_amount'] = vat_total
            
            logger.info(f"Successfully parsed QR data: {data}")
            
        except Exception as e:
            logger.error(f"Error parsing QR data: {e}")
            # Store raw data if parsing fails
            data['raw_qr_code_data'] = qr_data
        
        return data
    
    def process_image_file(self, file_path: str) -> Dict:
        """
        Process an image file and extract invoice data from QR codes.
        """
        try:
            # Load image
            image = cv2.imread(file_path)
            if image is None:
                # Try with PIL for other formats
                pil_image = Image.open(file_path)
                image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
            return self.process_image(image)
            
        except Exception as e:
            logger.error(f"Error processing image file {file_path}: {e}")
            return {'error': f'Error processing image: {str(e)}'}
    
    def process_image(self, image: np.ndarray) -> Dict:
        """
        Process an image and extract invoice data from QR codes.
        """
        result = {
            'qr_codes_found': 0,
            'invoice_data': {},
            'raw_qr_data': [],
            'processing_log': []
        }
        
        try:
            # Detect QR codes
            qr_data_list = self.detect_qr_codes(image)
            
            result['qr_codes_found'] = len(qr_data_list)
            result['raw_qr_data'] = qr_data_list
            
            if not qr_data_list:
                result['processing_log'].append("Nenhum QR Code encontrado na imagem")
                return result
            
            # Process each QR code found
            for i, qr_data in enumerate(qr_data_list):
                result['processing_log'].append(f"QR Code {i+1} encontrado: {qr_data[:100]}...")
                
                # Try to parse as Portuguese invoice QR
                parsed_data = self.parse_portuguese_qr_data(qr_data)
                
                if parsed_data:
                    # Use the first successfully parsed QR code
                    if not result['invoice_data']:
                        result['invoice_data'] = parsed_data
                        result['processing_log'].append(f"Dados extraídos do QR Code {i+1}")
                    break
            
            if not result['invoice_data'] and qr_data_list:
                # If no structured data was extracted, store the raw QR data
                result['invoice_data'] = {'raw_qr_code_data': qr_data_list[0]}
                result['processing_log'].append("QR Code encontrado mas formato não reconhecido")
            
        except Exception as e:
            error_msg = f"Erro no processamento: {str(e)}"
            result['processing_log'].append(error_msg)
            logger.error(error_msg)
        
        return result

# Updated task function
from celery import shared_task
import os
from django.conf import settings
from .models import ScannedInvoice

@shared_task
def process_invoice_file_task(invoice_id):
    """
    Celery task to process an uploaded invoice file and extract QR code data.
    """
    try:
        invoice = ScannedInvoice.objects.get(id=invoice_id)
        invoice.status = 'PROCESSING'
        invoice.save()
        
        # Get the file path
        file_path = invoice.original_file.path
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Process the image
        processor = EnhancedQRProcessor()
        result = processor.process_image_file(file_path)
        
        # Update the invoice with the results
        if result.get('invoice_data'):
            invoice_data = result['invoice_data']
            
            # Map the extracted data to model fields
            if 'nif_emitter' in invoice_data:
                invoice.nif_emitter = invoice_data['nif_emitter']
            if 'nif_acquirer' in invoice_data:
                invoice.nif_acquirer = invoice_data['nif_acquirer']
            if 'country_code' in invoice_data:
                invoice.country_code = invoice_data['country_code']
            if 'doc_type' in invoice_data:
                invoice.doc_type = invoice_data['doc_type']
            if 'doc_date' in invoice_data:
                invoice.doc_date = invoice_data['doc_date']
            if 'doc_uid' in invoice_data:
                invoice.doc_uid = invoice_data['doc_uid']
            if 'atcud' in invoice_data:
                invoice.atcud = invoice_data['atcud']
            if 'taxable_amount' in invoice_data:
                invoice.taxable_amount = invoice_data['taxable_amount']
            if 'vat_amount' in invoice_data:
                invoice.vat_amount = invoice_data['vat_amount']
            if 'gross_total' in invoice_data:
                invoice.gross_total = invoice_data['gross_total']
            
            # Store raw QR data
            if 'raw_qr_code_data' in invoice_data:
                invoice.raw_qr_code_data = invoice_data['raw_qr_code_data']
            elif result.get('raw_qr_data'):
                invoice.raw_qr_code_data = result['raw_qr_data'][0] if result['raw_qr_data'] else ''
        
        # Update processing log
        processing_log = '\n'.join(result.get('processing_log', []))
        invoice.processing_log = processing_log
        
        # Set status based on results
        if result.get('invoice_data') and any(key in result['invoice_data'] for key in ['atcud', 'gross_total', 'nif_emitter']):
            invoice.status = 'COMPLETED'
        elif result.get('qr_codes_found', 0) > 0:
            invoice.status = 'COMPLETED'  # QR found but may need manual review
        else:
            invoice.status = 'ERROR'
            if not processing_log:
                invoice.processing_log = "Não foi possível encontrar ou ler um QR Code ATCUD válido no ficheiro."
        
        invoice.save()
        
        return f"Invoice {invoice_id} processed successfully"
        
    except ScannedInvoice.DoesNotExist:
        return f"Invoice {invoice_id} not found"
    except Exception as e:
        try:
            invoice = ScannedInvoice.objects.get(id=invoice_id)
            invoice.status = 'ERROR'
            invoice.processing_log = f"Erro no processamento: {str(e)}"
            invoice.save()
        except:
            pass
        return f"Error processing invoice {invoice_id}: {str(e)}"