
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import hashlib, os, tempfile
from PIL import Image
import pytesseract
import pdf2image
import anthropic

load_dotenv()

from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

app = FastAPI(title="Datyra API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

def extract_text(contents: bytes, filename: str) -> str:
    ext = filename.lower().split(".")[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
    try:
        if ext == "pdf":
            pages = pdf2image.convert_from_path(tmp_path)
            text = "\n".join(pytesseract.image_to_string(p) for p in pages)
        else:
            img = Image.open(tmp_path)
            text = pytesseract.image_to_string(img)
    finally:
        os.unlink(tmp_path)
    return text.strip()

def classify_document(text: str) -> str:
    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=10,
        messages=[{"role": "user", "content": f"Classify this document as exactly one word - MEDICAL, LEGAL, or FINANCIAL. Document:\n{text[:1000]}"}]
    )
    result = response.content[0].text.strip().upper()
    if result not in ["MEDICAL", "LEGAL", "FINANCIAL"]:
        result = "FINANCIAL"
    return result

def extract_insights(text: str, doc_type: str) -> dict:
    if doc_type == "MEDICAL":
        prompt = f"""Extract from this medical document:
1. List of medicines/drugs mentioned (as JSON array)
2. Patient details if any
3. Key health information

Return ONLY valid JSON like:
{{"medicines": ["medicine1", "medicine2"], "patient": "name or unknown", "summary": "brief summary"}}

Document: {text[:2000]}"""
    else:
        prompt = f"""Extract key information from this {doc_type} document.
Return ONLY valid JSON like:
{{"summary": "2-3 sentence summary", "key_points": ["point1", "point2", "point3"], "important_dates": [], "parties_involved": []}}

Document: {text[:2000]}"""

    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )
    import json
    try:
        return json.loads(response.content[0].text.strip())
    except:
        return {"summary": response.content[0].text.strip()}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    allowed = ["pdf", "png", "jpg", "jpeg"]
    ext = file.filename.lower().split(".")[-1]
    if ext not in allowed:
        raise HTTPException(400, "Only PDF, PNG, JPG files allowed")

    contents = await file.read()
    doc_hash = hashlib.sha256(contents).hexdigest()

    # Upload to Supabase Storage
    import time
    storage_path = f"documents/{doc_hash}_{int(time.time())}/{file.filename}"
    supabase.storage.from_("documents").upload(storage_path, contents)
    storage_url = f"{os.getenv('SUPABASE_URL')}/storage/v1/object/public/documents/{storage_path}"

    # OCR
    extracted_text = extract_text(contents, file.filename)

    # AI Classification
    doc_type = classify_document(extracted_text)

    # AI Insights extraction
    insights = extract_insights(extracted_text, doc_type)

    # Save to database
    doc_record = supabase.table("documents").insert({
        "filename": file.filename,
        "file_type": ext,
        "doc_type": doc_type,
        "hash": doc_hash,
        "storage_url": storage_url
    }).execute()

    doc_id = doc_record.data[0]["id"]

    supabase.table("insights").insert({
        "doc_id": doc_id,
        "summary": insights.get("summary", ""),
        "extracted_json": insights
    }).execute()

    return {
        "filename": file.filename,
        "hash": doc_hash,
        "doc_type": doc_type,
        "storage_url": storage_url,
        "insights": insights,
        "text_preview": extracted_text[:300]
    }

@app.get("/documents")
async def get_documents():
    result = supabase.table("documents").select("*, insights(*)").execute()
    return result.data

@app.get("/health")
async def health():
    return {"status": "ok", "supabase": "connected", "ai": "ready"}

# Blockchain verification
from web3 import Web3
import json

w3 = Web3(Web3.HTTPProvider(os.getenv("BLOCKCHAIN_RPC")))
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
CONTRACT_ABI = [
    {"inputs":[{"internalType":"bytes32","name":"docHash","type":"bytes32"}],"name":"storeHash","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"bytes32","name":"docHash","type":"bytes32"}],"name":"verifyHash","outputs":[{"internalType":"bool","name":"exists","type":"bool"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"address","name":"owner","type":"address"}],"stateMutability":"view","type":"function"}
]

@app.get("/verify/{doc_hash}")
async def verify_document(doc_hash: str):
    try:
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        bytes_hash = bytes.fromhex(doc_hash)
        result = contract.functions.verifyHash(bytes_hash).call()
        return {
            "verified": result[0],
            "timestamp": result[1],
            "owner": result[2],
            "blockchain": "Polygon Amoy"
        }
    except Exception as e:
        return {"verified": False, "error": str(e)}
