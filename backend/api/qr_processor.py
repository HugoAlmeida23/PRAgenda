# Updated qr_processor.py - Fix the process_image method to handle bytes

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
        Based on the actual format: A:NIF*B:NIF*C:PT*D:FS*E:N*F:YYYYMMDD*G:DocSeries*H:ATCUD*I1:PT*I3:Tax*I4:Tax*I7:Base*I8:Tax*N:Total*O:TotalTax*Q:Hash*R:Cert*S:Timestamp
        """
        data = {}
        
        try:
            # Split by asterisk - Portuguese QR format
            if '*' in qr_data:
                parts = qr_data.split('*')
                
                for part in parts:
                    if ':' in part:
                        key, value = part.split(':', 1)
                        
                        # Map Portuguese QR code fields based on actual format
                        field_mapping = {
                            'A': 'nif_emitter',           # NIF do emitente
                            'B': 'nif_acquirer',          # NIF do adquirente  
                            'C': 'country_code',          # Código do país (PT)
                            'D': 'doc_type',              # Tipo de documento (FS, FT, etc.)
                            'E': 'doc_status',            # Status do documento (N=Normal)
                            'F': 'doc_date',              # Data (YYYYMMDD)
                            'G': 'doc_uid',               # Identificador único do documento
                            'H': 'atcud',                 # Código ATCUD
                            'I1': 'tax_country_region',   # País/região fiscal (PT)
                            'I2': 'taxable_amount_intermediate',  # Base tributável intermédia
                            'I3': 'tax_amount_normal',    # Imposto normal
                            'I4': 'tax_amount_intermediate', # Imposto intermédio
                            'I5': 'taxable_amount_reduced', # Base tributável reduzida
                            'I6': 'tax_amount_reduced',   # Imposto reduzido
                            'I7': 'taxable_amount_exempt', # Base isenta
                            'I8': 'tax_amount_exempt',    # Imposto isento
                            'N': 'total_with_tax',        # Total com impostos
                            'O': 'total_tax',             # Total de impostos
                            'P': 'withholding_tax',       # Retenção na fonte
                            'Q': 'hash_characters',       # Caracteres de hash
                            'R': 'certificate_number',    # Número do certificado
                            'S': 'timestamp'              # Timestamp
                        }
                        
                        if key in field_mapping:
                            field_name = field_mapping[key]
                            
                            # Handle date conversion for F field (YYYYMMDD format)
                            if key == 'F' and len(value) == 8 and value.isdigit():
                                try:
                                    from datetime import datetime
                                    date_obj = datetime.strptime(value, '%Y%m%d')
                                    data['doc_date'] = date_obj.strftime('%Y-%m-%d')
                                except ValueError:
                                    data[field_name] = value
                            # Convert numeric fields
                            elif field_name in ['tax_amount_normal', 'tax_amount_intermediate',
                                              'taxable_amount_intermediate', 'taxable_amount_reduced', 
                                              'tax_amount_reduced', 'taxable_amount_exempt', 
                                              'tax_amount_exempt', 'total_with_tax', 'total_tax', 
                                              'withholding_tax']:
                                try:
                                    data[field_name] = float(value)
                                except ValueError:
                                    data[field_name] = value
                            else:
                                data[field_name] = value
            
            # Calculate derived fields for compatibility with the model
            if data:
                # Set gross_total from total_with_tax
                if 'total_with_tax' in data:
                    data['gross_total'] = data['total_with_tax']
                
                # Calculate total VAT amount
                vat_fields = ['tax_amount_normal', 'tax_amount_intermediate', 
                            'tax_amount_reduced', 'tax_amount_exempt']
                vat_total = sum(data.get(field, 0) for field in vat_fields if isinstance(data.get(field), (int, float)))
                if vat_total > 0:
                    data['vat_amount'] = vat_total
                elif 'total_tax' in data:
                    data['vat_amount'] = data['total_tax']
                
                # Calculate total taxable amount
                taxable_fields = ['taxable_amount_intermediate', 'taxable_amount_reduced', 'taxable_amount_exempt']
                taxable_total = sum(data.get(field, 0) for field in taxable_fields if isinstance(data.get(field), (int, float)))
                
                # If we have gross_total and vat_amount, calculate taxable_amount
                if 'gross_total' in data and 'vat_amount' in data:
                    calculated_taxable = data['gross_total'] - data['vat_amount']
                    if taxable_total == 0 and calculated_taxable > 0:
                        data['taxable_amount'] = calculated_taxable
                elif taxable_total > 0:
                    data['taxable_amount'] = taxable_total
            
            logger.info(f"Successfully parsed Portuguese QR data. ATCUD: {data.get('atcud', 'N/A')}, Total: {data.get('gross_total', 'N/A')}")
            
        except Exception as e:
            logger.error(f"Error parsing Portuguese QR data: {e}")
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
    
    def process_image(self, image_input) -> Dict:
        """
        Process an image and extract invoice data from QR codes.
        Handles both numpy arrays and bytes input.
        """
        result = {
            'qr_codes_found': 0,
            'invoice_data': {},
            'raw_qr_data': [],
            'processing_log': []
        }
        
        try:
            # Convert bytes to numpy array if needed
            if isinstance(image_input, bytes):
                # Convert bytes to numpy array
                nparr = np.frombuffer(image_input, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if image is None:
                    # Try with PIL as fallback
                    try:
                        pil_image = Image.open(io.BytesIO(image_input))
                        image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                    except Exception as e:
                        result['processing_log'].append(f"Erro ao converter bytes para imagem: {str(e)}")
                        return result
                        
                result['processing_log'].append("Imagem convertida de bytes com sucesso")
            elif isinstance(image_input, np.ndarray):
                image = image_input
                result['processing_log'].append("Processando numpy array diretamente")
            else:
                result['processing_log'].append(f"Tipo de entrada não suportado: {type(image_input)}")
                return result
            
            if image is None:
                result['processing_log'].append("Falha ao carregar a imagem")
                return result
            
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
                
                # Check if it looks like a Portuguese ATCUD QR code
                if 'A:' in qr_data and 'H:' in qr_data and '*' in qr_data:
                    result['processing_log'].append(f"QR Code {i+1} parece ser um código ATCUD português")
                    
                    # Try to parse as Portuguese invoice QR
                    parsed_data = self.parse_portuguese_qr_data(qr_data)
                    
                    if parsed_data and ('atcud' in parsed_data or 'gross_total' in parsed_data):
                        # Use the first successfully parsed QR code
                        if not result['invoice_data']:
                            result['invoice_data'] = parsed_data
                            result['processing_log'].append(f"Dados extraídos com sucesso do QR Code {i+1}")
                            result['processing_log'].append(f"ATCUD: {parsed_data.get('atcud', 'N/A')}")
                            result['processing_log'].append(f"Total: {parsed_data.get('gross_total', 'N/A')}€")
                        break
                    else:
                        result['processing_log'].append(f"QR Code {i+1} não contém dados válidos de fatura")
                else:
                    result['processing_log'].append(f"QR Code {i+1} não é um código ATCUD português válido")
            
            if not result['invoice_data'] and qr_data_list:
                # If no structured data was extracted, store the raw QR data
                result['invoice_data'] = {'raw_qr_code_data': qr_data_list[0]}
                result['processing_log'].append("QR Code encontrado mas formato não reconhecido")
            
        except Exception as e:
            error_msg = f"Erro no processamento: {str(e)}"
            result['processing_log'].append(error_msg)
            logger.error(error_msg)
        
        return result