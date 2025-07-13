import PyPDF2
import sys

def extract_pdf_text(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        return None

# Extract privacy policy
print("=== PRIVACY POLICY ===")
privacy_text = extract_pdf_text("privacy-policy.pdf")
if privacy_text:
    print(privacy_text)
    with open("privacy-content.txt", "w", encoding="utf-8") as f:
        f.write(privacy_text)

print("\n" + "="*50 + "\n")

# Extract terms and conditions
print("=== TERMS AND CONDITIONS ===")
terms_text = extract_pdf_text("terms-conditions.pdf")
if terms_text:
    print(terms_text)
    with open("terms-content.txt", "w", encoding="utf-8") as f:
        f.write(terms_text)
