from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import hashlib, os, tempfile, time, json, httpx, asyncio
from itertools import combinations
from PIL import Image
import pytesseract
import pdf2image
import anthropic
from pinecone import Pinecone

load_dotenv()

from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

try:
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    pinecone_index = pc.Index(os.getenv("PINECONE_INDEX", "datyra-docs"))
    PINECONE_AVAILABLE = True
except Exception as e:
    print(f"Pinecone init failed (RAG disabled): {e}")
    pc = None
    pinecone_index = None
    PINECONE_AVAILABLE = False

app = FastAPI(title="Datyra API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# OCR
# ─────────────────────────────────────────────

def extract_text(contents: bytes, filename: str) -> str:
    ext = filename.lower().split(".")[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
    try:
        if ext == "pdf":
            import pdfplumber
            with pdfplumber.open(tmp_path) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            if not text.strip():
                pages = pdf2image.convert_from_path(tmp_path)
                text = "\n".join(pytesseract.image_to_string(p) for p in pages)
        else:
            img = Image.open(tmp_path)
            text = pytesseract.image_to_string(img)
    finally:
        os.unlink(tmp_path)
    return text.strip()

# ─────────────────────────────────────────────
# AI
# ─────────────────────────────────────────────

def classify_and_extract(text: str) -> tuple[str, dict]:
    """
    Single Claude call that both classifies the document AND extracts insights.
    Replaces the two separate classify_document + extract_insights calls.
    """
    prompt = f"""Analyze this document and return ONLY valid JSON with no markdown fences.

The JSON must have this exact structure:
{{
  "doc_type": "MEDICAL" | "LEGAL" | "FINANCIAL",
  "summary": "2-3 sentence summary",
  "key_points": ["point1", "point2", "point3"],
  "important_dates": [],
  "parties_involved": [],
  "medicines": [],
  "patient": "name or unknown"
}}

Rules:
- doc_type must be exactly one of: MEDICAL, LEGAL, FINANCIAL
- For MEDICAL docs, populate medicines[] with any drug/medicine names found
- For non-MEDICAL docs, medicines can be empty []
- key_points should have 2-5 items
- Return ONLY the JSON object, no other text

Document:
{text[:2500]}"""

    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}]
    )
    try:
        raw = response.content[0].text.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        doc_type = data.get("doc_type", "FINANCIAL").upper()
        if doc_type not in ["MEDICAL", "LEGAL", "FINANCIAL"]:
            doc_type = "FINANCIAL"
        return doc_type, data
    except Exception:
        return "FINANCIAL", {"summary": response.content[0].text.strip()}

# ─────────────────────────────────────────────
# Drug Interaction Checker (OpenFDA)
# ─────────────────────────────────────────────

OPENFDA_URL = "https://api.fda.gov/drug/label.json"

def normalize_medicine_name(name: str) -> str:
    """Strip dosage info like '500mg', 'tablet', etc. to get a clean drug name."""
    import re
    name = re.sub(r'\b\d+\s*(mg|mcg|ml|g|iu|units?)\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\b(tablet|capsule|syrup|injection|cream|gel|drops?|solution|suspension)\b', '', name, flags=re.IGNORECASE)
    return name.strip().lower()

def fetch_drug_warnings(medicine: str) -> dict | None:
    """
    Call OpenFDA drug label API for a single medicine.
    Returns relevant warning fields or None if not found.
    """
    name = normalize_medicine_name(medicine)
    if not name:
        return None
    try:
        resp = httpx.get(
            OPENFDA_URL,
            params={"search": f'openfda.generic_name:"{name}" OR openfda.brand_name:"{name}"', "limit": 1},
            timeout=8.0
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        results = data.get("results", [])
        if not results:
            return None
        label = results[0]
        return {
            "medicine": medicine,
            "warnings": label.get("warnings", []),
            "drug_interactions": label.get("drug_interactions", []),
            "contraindications": label.get("contraindications", []),
            "adverse_reactions": label.get("adverse_reactions", []),
        }
    except Exception:
        return None

def check_drug_interactions(medicines: list[str]) -> dict:
    """
    For each medicine, fetch warnings from OpenFDA.
    For each pair, flag if both appear in each other's drug_interactions text.
    Returns structured result with per-drug warnings and pairwise interaction flags.
    """
    if not medicines:
        return {"medicines": [], "individual_warnings": [], "pairwise_interactions": [], "checked": False}

    # Cap at 10 medicines to avoid timeout on Railway free tier
    medicines = medicines[:10]

    individual_warnings = []
    drug_data: dict[str, dict] = {}

    for med in medicines:
        result = fetch_drug_warnings(med)
        if result:
            drug_data[med] = result
            # Summarise the most useful warning fields
            warning_texts = (
                result["warnings"][:1] +
                result["drug_interactions"][:1] +
                result["contraindications"][:1]
            )
            # OpenFDA returns long strings; truncate each to 300 chars
            clean = [w[:300] for w in warning_texts if isinstance(w, str) and w.strip()]
            if clean:
                individual_warnings.append({
                    "medicine": med,
                    "warnings": clean,
                    "severity": classify_warning_severity(clean)
                })

    # Pairwise interaction check
    pairwise_interactions = []
    for med_a, med_b in combinations(medicines, 2):
        interaction_notes = []
        # Check if med_b appears in med_a's drug_interactions text
        if med_a in drug_data:
            for text in drug_data[med_a].get("drug_interactions", []):
                if normalize_medicine_name(med_b) in text.lower():
                    interaction_notes.append(f"{med_a} label warns about {med_b}: {text[:200]}")
        # Check if med_a appears in med_b's drug_interactions text
        if med_b in drug_data:
            for text in drug_data[med_b].get("drug_interactions", []):
                if normalize_medicine_name(med_a) in text.lower():
                    interaction_notes.append(f"{med_b} label warns about {med_a}: {text[:200]}")

        if interaction_notes:
            pairwise_interactions.append({
                "pair": [med_a, med_b],
                "notes": interaction_notes,
                "severity": "HIGH"
            })

    return {
        "medicines": medicines,
        "individual_warnings": individual_warnings,
        "pairwise_interactions": pairwise_interactions,
        "checked": True,
        "source": "OpenFDA"
    }

def classify_warning_severity(warnings: list[str]) -> str:
    """Simple keyword-based severity triage."""
    combined = " ".join(warnings).lower()
    if any(w in combined for w in ["death", "fatal", "life-threatening", "black box", "contraindicated"]):
        return "HIGH"
    if any(w in combined for w in ["avoid", "caution", "monitor", "serious", "severe"]):
        return "MEDIUM"
    return "LOW"

# ─────────────────────────────────────────────
# RAG — Chunking + Embedding + Chat
# ─────────────────────────────────────────────

EMBED_MODEL = "llama-text-embed-v2"
CHUNK_SIZE = 400      # words per chunk
CHUNK_OVERLAP = 50    # words overlap between chunks

def chunk_text(text: str) -> list[str]:
    """Split text into overlapping word-based chunks."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + CHUNK_SIZE])
        if chunk.strip():
            chunks.append(chunk)
        i += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks

def embed_and_store(doc_id: str, text: str) -> int:
    if not PINECONE_AVAILABLE:
        return 0
    chunks = chunk_text(text)
    if not chunks:
        return 0
    embeddings = pc.inference.embed(
        model=EMBED_MODEL,
        inputs=chunks,
        parameters={"input_type": "passage", "truncate": "END"}
    )
    vectors = [
        {
            "id": f"{doc_id}_chunk_{i}",
            "values": emb["values"],
            "metadata": {"text": chunk, "doc_id": doc_id, "chunk_index": i}
        }
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]
    pinecone_index.upsert(vectors=vectors, namespace=doc_id)
    return len(vectors)

def query_document(doc_id: str, question: str, top_k: int = 5) -> list[str]:
    if not PINECONE_AVAILABLE:
        return []
    q_embed = pc.inference.embed(
        model=EMBED_MODEL,
        inputs=[question],
        parameters={"input_type": "query", "truncate": "END"}
    )
    results = pinecone_index.query(
        namespace=doc_id,
        vector=q_embed[0]["values"],
        top_k=top_k,
        include_metadata=True
    )
    return [match["metadata"]["text"] for match in results.get("matches", [])]

def answer_with_rag(question: str, context_chunks: list[str], doc_type: str) -> str:
    """Pass retrieved chunks as context to Claude and get a grounded answer."""
    context = "\n\n---\n\n".join(context_chunks)
    prompt = f"""You are a helpful assistant analyzing a {doc_type} document.
Answer the user's question using ONLY the context below. If the answer is not in the context, say so clearly.

CONTEXT:
{context}

QUESTION: {question}

Give a clear, concise answer. For medical documents, always suggest consulting a qualified professional."""

    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()

class ChatRequest(BaseModel):
    question: str

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.post("/upload")
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...), user_id: str = Form(None)):
    allowed = ["pdf", "png", "jpg", "jpeg"]
    ext = file.filename.lower().split(".")[-1]
    if ext not in allowed:
        raise HTTPException(400, "Only PDF, PNG, JPG files allowed")

    contents = await file.read()
    doc_hash = hashlib.sha256(contents).hexdigest()

    storage_path = f"documents/{doc_hash}_{int(time.time())}/{file.filename}"
    supabase.storage.from_("documents").upload(storage_path, contents)
    storage_url = f"{os.getenv('SUPABASE_URL')}/storage/v1/object/public/documents/{storage_path}"

    try:
        extracted_text = extract_text(contents, file.filename)
    except Exception:
        extracted_text = f"Document: {file.filename}"

    doc_type, insights = classify_and_extract(extracted_text)

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

    # ── Embed document text into Pinecone in background (non-blocking) ──
    if extracted_text and len(extracted_text.split()) > 20:
        background_tasks.add_task(embed_and_store, doc_id, extracted_text)

    # ── Drug interaction check for MEDICAL documents ──
    drug_interaction_result = None
    if doc_type == "MEDICAL":
        medicines = insights.get("medicines", [])
        if medicines:
            drug_interaction_result = check_drug_interactions(medicines)
            supabase.table("drug_interactions").insert({
                "doc_id": doc_id,
                "medicines": drug_interaction_result["medicines"],
                "warnings": [
                    w["medicine"] + ": " + "; ".join(w["warnings"])
                    for w in drug_interaction_result["individual_warnings"]
                ] + [
                    f"INTERACTION — {p['pair'][0]} + {p['pair'][1]}: " + "; ".join(p["notes"])
                    for p in drug_interaction_result["pairwise_interactions"]
                ]
            }).execute()

    response_payload = {
        "doc_id": doc_id,
        "filename": file.filename,
        "hash": doc_hash,
        "doc_type": doc_type,
        "storage_url": storage_url,
        "insights": insights,
        "text_preview": extracted_text[:300],
    }
    if drug_interaction_result:
        response_payload["drug_interactions"] = drug_interaction_result

    return response_payload


@app.get("/documents")
async def get_documents():
    result = supabase.table("documents").select("*, insights(*), drug_interactions(*)").execute()
    return result.data


@app.get("/interactions/{doc_id}")
async def get_interactions(doc_id: str):
    """Fetch saved drug interaction results for a document."""
    result = supabase.table("drug_interactions").select("*").eq("doc_id", doc_id).execute()
    if not result.data:
        raise HTTPException(404, "No drug interaction data found for this document")
    return result.data[0]


@app.post("/chat/{doc_id}")
async def chat_with_document(doc_id: str, body: ChatRequest):
    """RAG chat: embed question → retrieve chunks → Claude answers."""
    question = body.question.strip()
    if not question:
        raise HTTPException(400, "Question cannot be empty")

    if not PINECONE_AVAILABLE:
        raise HTTPException(503, "RAG service unavailable")

    doc_record = supabase.table("documents").select("doc_type").eq("id", doc_id).execute()
    doc_type = doc_record.data[0]["doc_type"] if doc_record.data else "GENERAL"

    # Retry up to 3 times with 2s delay — background embedding may still be in progress
    chunks = []
    for attempt in range(3):
        try:
            chunks = query_document(doc_id, question)
        except Exception as e:
            raise HTTPException(500, f"Vector search failed: {e}")
        if chunks:
            break
        if attempt < 2:
            await asyncio.sleep(2)

    if not chunks:
        return {
            "answer": "The document is still being indexed — please wait a few seconds and try again.",
            "chunks_used": 0
        }

    answer = answer_with_rag(question, chunks, doc_type)
    return {"answer": answer, "chunks_used": len(chunks)}


@app.get("/health")
async def health():
    return {"status": "ok", "supabase": "connected", "ai": "ready"}


# ─────────────────────────────────────────────
# Blockchain
# ─────────────────────────────────────────────

from web3 import Web3

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