from docx import Document
import PyPDF2

# Ler DOCX completo
with open('contratos/extracao_docx.txt', 'w', encoding='utf-8') as f:
    f.write('=== CONTRATO BACEN - MODELO DOCX ===\n\n')
    doc = Document('contratos/bacenmodelo.docx')
    for para in doc.paragraphs:
        if para.text.strip():
            f.write(para.text + '\n')

# Ler PDF
with open('contratos/extracao_pdf.txt', 'w', encoding='utf-8') as f:
    f.write('=== BASE ESTRUTURAL - PDF ===\n\n')
    with open('contratos/Base estrutural.pdf', 'rb') as pdf_file:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        for page_num, page in enumerate(pdf_reader.pages):
            f.write(f'--- Página {page_num + 1} ---\n')
            text = page.extract_text()
            if text:
                f.write(text)
            f.write('\n\n')

print('Extração concluída!')
