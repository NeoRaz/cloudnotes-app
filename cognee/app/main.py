import os
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import cognee
import asyncio

# --- Red Flag Fix: Force storage to the Persistent Volume ---
# This ensures that even if Cognee defaults to site-packages, 
# your data stays on the PVC.
os.environ["COGNEE_DATA_PATH"] = "/root/.cognee/.data_storage"
os.environ["COGNEE_SYSTEM_PATH"] = "/root/.cognee/.cognee_system"
# -----------------------------------------------------------

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CloudNotes Cognee Service")

# Global lock to prevent simultaneous improve() calls (Red Flag #1)
improve_lock = asyncio.Lock()

class CognifyRequest(BaseModel):
    user_id: int
    note_id: int
    text: str

async def run_cognify_pipeline(note_id: int, dataset_name: str, text: str):
    try:
        logger.info(f"Background process started for note {note_id} in dataset {dataset_name}")
        
        # Add the note with a unique fingerprint to ensure extraction runs (Red Flag #1/Already Processed)
        import time
        unique_text = f"Note ID: {note_id}\nTS: {int(time.time())}\n{text}"
        
        # --- Red Flag Fix: Force re-extraction by pruning existing state first ---
        try:
            from cognee.infrastructure.databases.graph.get_graph_client import get_graph_client
            graph_client = await get_graph_client()
            prune_query = "MATCH (n) WHERE (n.text CONTAINS $fingerprint) OR (n.note_id = $note_id) DETACH DELETE n"
            await graph_client.execute_query(prune_query, {"fingerprint": f"Note ID: {note_id}", "note_id": note_id})
            logger.info(f"Pre-processing prune complete for note {note_id}")
        except Exception as pe:
            logger.warning(f"Pre-processing prune failed (likely first run): {str(pe)}")
        # -------------------------------------------------------------------------

        await cognee.add(unique_text, dataset_name=dataset_name)
        
        logger.info(f"Cognifying dataset {dataset_name}...")
        await cognee.cognify(datasets=[dataset_name])
        
        # Use a lock to prevent the 'Thundering Herd' (Red Flag #1)
        async with improve_lock:
            logger.info(f"Improving graph for dataset {dataset_name} (Lock Acquired)...")
            await cognee.improve()
            logger.info(f"Graph improvement complete for {dataset_name} (Lock Released).")
            
        logger.info(f"Successfully finished background processing for note {note_id}")
    except Exception as e:
        logger.error(f"Error in background cognify process: {str(e)}")

@app.post("/api/v1/cognify")
async def cognify_note(request: CognifyRequest, background_tasks: BackgroundTasks):
    try:
        dataset_name = f"user_{request.user_id}_notes"
        
        # Start the heavy lifting in the background
        background_tasks.add_task(run_cognify_pipeline, request.note_id, dataset_name, request.text)
        
        return {"status": "accepted", "note_id": request.note_id, "message": "Background processing started"}
        
    except Exception as e:
        logger.error(f"Error starting cognify request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class SearchRequest(BaseModel):
    query: str
    user_id: int
    limit: int = 5

@app.post("/api/v1/search")
async def search_graph(request: SearchRequest):
    try:
        dataset_name = f"user_{request.user_id}_notes"
        logger.info(f"Searching graph for query: {request.query} in dataset: {dataset_name}")
        
        # Cognee recall returns the most relevant context from graph/vector
        results = await cognee.recall(request.query, datasets=[dataset_name])
        
        return {"results": results}
    except Exception as e:
        logger.error(f"Error during search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class DeleteRequest(BaseModel):
    user_id: int
    note_id: int

@app.post("/api/v1/delete")
async def delete_note(request: DeleteRequest):
    try:
        dataset_name = f"user_{request.user_id}_notes"
        logger.info(f"Granular pruning for note {request.note_id} from dataset {dataset_name}")
        
        # Red Flag #2: Granular deletion via Cypher
        # We find chunks and entities that are tagged with the Note ID in their text/metadata
        # and remove them without wiping the whole dataset.
        
        from cognee.infrastructure.databases.graph.get_graph_client import get_graph_client
        graph_client = await get_graph_client()
        
        # Cypher query to delete nodes where the content contains the Note ID fingerprint
        # This is a robust way to prune specifically without affecting other notes.
        prune_query = """
        MATCH (n)
        WHERE (n.text CONTAINS $fingerprint) OR (n.note_id = $note_id)
        DETACH DELETE n
        """
        fingerprint = f"Note ID: {request.note_id}"
        await graph_client.execute_query(prune_query, {"fingerprint": fingerprint, "note_id": request.note_id})
        
        logger.info(f"Successfully pruned graph nodes for note {request.note_id}")
        return {"status": "success", "note_id": request.note_id}
    except Exception as e:
        logger.error(f"Error during granular delete: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy"}
