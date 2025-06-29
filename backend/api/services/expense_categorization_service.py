# api/services/expense_categorization_service.py (NEW FILE)
from ..gemini_service import GeminiService
import json
import logging

logger = logging.getLogger(__name__)

class ExpenseCategorizationService:
    @staticmethod
    def categorize_from_invoice(invoice):
        """Uses Gemini to suggest an expense category based on invoice data."""
        if not invoice.nif_emitter and not invoice.raw_qr_code_data:
            return "Outras Despesas" # Not enough info

        prompt_text = (
            "You are an expert Portuguese accountant. Based on the following invoice data, "
            "suggest the most likely expense category from this list: "
            "['COMBUSTÍVEL', 'REFEIÇÕES E ESTADIAS', 'MARKETING', 'SOFTWARE E TI', "
            "'FORNECEDORES', 'RENDA', 'COMUNICAÇÕES', 'SEGUROS', 'OUTRAS DESPESAS']. "
            "Return only the category name in uppercase.\n\n"
            f"NIF do Emissor: {invoice.nif_emitter}\n"
            f"Dados do QR Code: {invoice.raw_qr_code_data}\n\n"
            "Categoria Sugerida:"
        )

        try:
            gemini = GeminiService()
            # Use a simpler, non-conversational generation for this specific task
            category = gemini.generate_text_response(prompt_text) # Assumes a method for single-turn generation
            # Clean up the response to ensure it's just the category name
            valid_categories = ['COMBUSTÍVEL', 'REFEIÇÕES E ESTADIAS', 'MARKETING', 'SOFTWARE E TI', 'FORNECEDORES', 'RENDA', 'COMUNICAÇÕES', 'SEGUROS', 'OUTRAS DESPESAS']
            cleaned_category = category.strip().upper()
            if cleaned_category in valid_categories:
                return cleaned_category
            return "OUTRAS DESPESAS"
        except Exception as e:
            logger.error(f"Error categorizing expense for invoice {invoice.id}: {e}")
            return "OUTRAS DESPESAS"