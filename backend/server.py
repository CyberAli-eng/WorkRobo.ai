from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from mongomock_motor import AsyncMongoMockClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import asyncio
import sys
import resend
import google.generativeai as genai

# Fix for Playwright/Subprocess on Windows
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Import our custom modules
from scraper import StealthScraper, get_scraper, cleanup_scraper
from executor import WorkflowExecutor, ExecutionContext, NodeStatus
from websocket_manager import ws_manager, ConnectionManager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Local DB is offline. Using in-memory JSON data structure for zero-friction Investor Testing.
client = AsyncMongoMockClient()
db = client[os.environ.get('DB_NAME', 'workrobo')]

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Gemini configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
gemini_model = None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-2.0-flash')

# Create the main app
app = FastAPI(title="WorkRobo.ai API", version="2.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
streams_router = APIRouter(prefix="/streams", tags=["Robo-Streams"])
sentry_router = APIRouter(prefix="/sentry", tags=["Sentry Monitoring"])
pulse_router = APIRouter(prefix="/pulse", tags=["Pulse Messaging"])
hive_router = APIRouter(prefix="/hive", tags=["WorkRobos"])
ai_router = APIRouter(prefix="/ai", tags=["AI Processing"])
execute_router = APIRouter(prefix="/execute", tags=["Execution Engine"])

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Robo-Streams (Workflows)
class NeuralLink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    position: Dict[str, float]
    data: Dict[str, Any]
    
class StreamEdge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class RoboStreamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

class RoboStreamResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    is_active: bool = False
    user_id: str
    created_at: str
    updated_at: str

# Sentry Targets (Web Monitoring)
class SentryTargetCreate(BaseModel):
    name: str
    url: str
    selector: Optional[str] = None
    check_interval: int = 3600
    notify_email: Optional[str] = None

class SentryTargetResponse(BaseModel):
    id: str
    name: str
    url: str
    selector: Optional[str] = None
    check_interval: int
    notify_email: Optional[str] = None
    last_content_hash: Optional[str] = None
    last_checked: Optional[str] = None
    change_detected: bool = False
    user_id: str
    created_at: str

# Pulse Lists (Subscribers)
class PulseContactCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    metadata: Dict[str, Any] = {}

class PulseListCreate(BaseModel):
    name: str
    description: Optional[str] = None

class PulseListResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    contact_count: int = 0
    user_id: str
    created_at: str

class PulseCampaignCreate(BaseModel):
    name: str
    subject: str
    html_content: str
    list_id: str

class PulseCampaignResponse(BaseModel):
    id: str
    name: str
    subject: str
    html_content: str
    list_id: str
    status: str = "draft"
    sent_count: int = 0
    user_id: str
    created_at: str

# WorkRobos (Agents)
class WorkRoboCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str  # webhook, schedule, event
    trigger_config: Dict[str, Any] = {}
    actions: List[Dict[str, Any]] = []

class WorkRoboResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    trigger_type: str
    trigger_config: Dict[str, Any]
    actions: List[Dict[str, Any]]
    state: str = "idle"
    user_id: str
    created_at: str

# AI Processing
class AIPromptRequest(BaseModel):
    prompt: str
    context: Optional[str] = None
    max_tokens: int = 1000

class AIResponse(BaseModel):
    response: str
    tokens_used: int

# ============== HELPER FUNCTIONS ==============

async def verify_supabase_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict]:
    """Verify JWT token with Supabase"""
    if not credentials:
        return None
    
    token = credentials.credentials
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY
                }
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        logger.error(f"Token verification error: {e}")
    return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Get current authenticated user or raise exception"""
    user = await verify_supabase_token(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict]:
    """Get current user if authenticated, None otherwise"""
    return await verify_supabase_token(credentials)

# ============== AUTH ROUTES ==============

@auth_router.post("/signup", response_model=Dict)
async def signup(user_data: UserCreate):
    """Register a new user with Supabase"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SUPABASE_URL}/auth/v1/signup",
                json={
                    "email": user_data.email,
                    "password": user_data.password,
                    "data": {"full_name": user_data.full_name}
                },
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                }
            )
            data = response.json()
            
            if response.status_code == 200:
                return {
                    "message": "User created successfully",
                    "user": {
                        "id": data.get("user", {}).get("id"),
                        "email": data.get("user", {}).get("email")
                    }
                }
            else:
                raise HTTPException(status_code=response.status_code, detail=data.get("msg", "Signup failed"))
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")

@auth_router.post("/login", response_model=Dict)
async def login(user_data: UserLogin):
    """Login with email and password"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                json={
                    "email": user_data.email,
                    "password": user_data.password
                },
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                }
            )
            data = response.json()
            
            if response.status_code == 200:
                return {
                    "access_token": data.get("access_token"),
                    "refresh_token": data.get("refresh_token"),
                    "token_type": "bearer",
                    "user": {
                        "id": data.get("user", {}).get("id"),
                        "email": data.get("user", {}).get("email"),
                        "full_name": data.get("user", {}).get("user_metadata", {}).get("full_name")
                    }
                }
            else:
                raise HTTPException(status_code=401, detail=data.get("error_description", "Invalid credentials"))
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")

@auth_router.get("/me", response_model=Dict)
async def get_me(user: Dict = Depends(get_current_user)):
    """Get current user profile"""
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "full_name": user.get("user_metadata", {}).get("full_name"),
        "created_at": user.get("created_at")
    }

@auth_router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout user (invalidate token on client side)"""
    return {"message": "Logged out successfully"}

# ============== ROBO-STREAMS (WORKFLOWS) ROUTES ==============

@streams_router.get("", response_model=List[RoboStreamResponse])
async def get_streams(user: Dict = Depends(get_current_user)):
    """Get all Robo-Streams for the current user"""
    streams = await db.streams.find(
        {"user_id": user["id"]}, 
        {"_id": 0}
    ).to_list(100)
    return streams

@streams_router.post("", response_model=RoboStreamResponse)
async def create_stream(stream_data: RoboStreamCreate, user: Dict = Depends(get_current_user)):
    """Create a new Robo-Stream"""
    stream_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    stream = {
        "id": stream_id,
        "name": stream_data.name,
        "description": stream_data.description,
        "nodes": stream_data.nodes,
        "edges": stream_data.edges,
        "is_active": False,
        "user_id": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.streams.insert_one(stream)
    stream.pop("_id", None)
    return stream

@streams_router.get("/{stream_id}", response_model=RoboStreamResponse)
async def get_stream(stream_id: str, user: Dict = Depends(get_current_user)):
    """Get a specific Robo-Stream"""
    stream = await db.streams.find_one(
        {"id": stream_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    return stream

@streams_router.put("/{stream_id}", response_model=RoboStreamResponse)
async def update_stream(stream_id: str, stream_data: RoboStreamCreate, user: Dict = Depends(get_current_user)):
    """Update a Robo-Stream"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.streams.find_one_and_update(
        {"id": stream_id, "user_id": user["id"]},
        {"$set": {
            "name": stream_data.name,
            "description": stream_data.description,
            "nodes": stream_data.nodes,
            "edges": stream_data.edges,
            "updated_at": now
        }},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    result.pop("_id", None)
    return result

@streams_router.delete("/{stream_id}")
async def delete_stream(stream_id: str, user: Dict = Depends(get_current_user)):
    """Delete a Robo-Stream"""
    result = await db.streams.delete_one({"id": stream_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stream not found")
    return {"message": "Stream deleted successfully"}

@streams_router.post("/{stream_id}/toggle")
async def toggle_stream(stream_id: str, user: Dict = Depends(get_current_user)):
    """Toggle Robo-Stream active state"""
    stream = await db.streams.find_one({"id": stream_id, "user_id": user["id"]})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    new_state = not stream.get("is_active", False)
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {"is_active": new_state, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"is_active": new_state}

class ScheduleCreate(BaseModel):
    cron_expression: str

@streams_router.get("/{stream_id}/schedule")
async def get_stream_schedule(stream_id: str, user: Dict = Depends(get_current_user)):
    """Get the schedule configuration for a stream"""
    schedule = await db.scheduler.find_one({"stream_id": stream_id, "user_id": user["id"]})
    if not schedule:
        return {"scheduled": False}
    schedule.pop("_id", None)
    return {"scheduled": True, "schedule": schedule}

@streams_router.post("/{stream_id}/schedule")
async def set_stream_schedule(stream_id: str, schedule_data: ScheduleCreate, user: Dict = Depends(get_current_user)):
    """Create or update schedule configuration for a stream"""
    stream = await db.streams.find_one({"id": stream_id, "user_id": user["id"]})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
        
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if schedule exists
    existing = await db.scheduler.find_one({"stream_id": stream_id})
    if existing:
        result = await db.scheduler.find_one_and_update(
            {"stream_id": stream_id},
            {"$set": {
                "cron_expression": schedule_data.cron_expression,
                "is_active": True,
                "updated_at": now
            }},
            return_document=True
        )
    else:
        schedule_id = str(uuid.uuid4())
        result = {
            "id": schedule_id,
            "stream_id": stream_id,
            "cron_expression": schedule_data.cron_expression,
            "is_active": True,
            "user_id": user["id"],
            "created_at": now,
            "updated_at": now
        }
        await db.scheduler.insert_one(result)
        
    # Sync with APScheduler background tasks
    try:
        from scheduler import hive_clock
        await hive_clock.sync_schedules()
    except Exception as e:
        logger.error(f"Failed to sync scheduler after update: {e}")
    
    if "_id" in result:
        result.pop("_id", None)
    return {"success": True, "schedule": result}

@streams_router.delete("/{stream_id}/schedule")
async def delete_stream_schedule(stream_id: str, user: Dict = Depends(get_current_user)):
    """Delete a stream's schedule configuration"""
    result = await db.scheduler.delete_one({"stream_id": stream_id, "user_id": user["id"]})
    
    # Sync with APScheduler background tasks
    try:
        from scheduler import hive_clock
        await hive_clock.sync_schedules()
    except Exception as e:
        logger.error(f"Failed to sync scheduler after delete: {e}")
    
    return {"success": True, "message": "Schedule deleted successfully"}

# ============== SENTRY (WEB MONITORING) ROUTES ==============

@sentry_router.get("", response_model=List[SentryTargetResponse])
async def get_sentry_targets(user: Dict = Depends(get_current_user)):
    """Get all Sentry monitoring targets"""
    targets = await db.sentry_targets.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    return targets

@sentry_router.post("", response_model=SentryTargetResponse)
async def create_sentry_target(target_data: SentryTargetCreate, user: Dict = Depends(get_current_user)):
    """Create a new Sentry monitoring target"""
    target_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    target = {
        "id": target_id,
        "name": target_data.name,
        "url": target_data.url,
        "selector": target_data.selector,
        "check_interval": target_data.check_interval,
        "notify_email": target_data.notify_email,
        "last_content_hash": None,
        "last_checked": None,
        "change_detected": False,
        "user_id": user["id"],
        "created_at": now
    }
    
    await db.sentry_targets.insert_one(target)
    target.pop("_id", None)
    return target

@sentry_router.delete("/{target_id}")
async def delete_sentry_target(target_id: str, user: Dict = Depends(get_current_user)):
    """Delete a Sentry target"""
    result = await db.sentry_targets.delete_one({"id": target_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Target not found")
    return {"message": "Target deleted successfully"}

@sentry_router.post("/{target_id}/check")
async def check_sentry_target(target_id: str, user: Dict = Depends(get_current_user)):
    """Manually trigger a check for a Sentry target using StealthScraper"""
    target = await db.sentry_targets.find_one({"id": target_id, "user_id": user["id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    try:
        scraper = await get_scraper()
        last_hash = target.get("last_content_hash")
        
        # Use StealthScraper with Playwright stealth mode to bypass bot-detection
        change_detected, result = await scraper.check_for_changes(
            target["url"], 
            last_hash, 
            target.get("selector")
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Scrape failed"))
            
        await db.sentry_targets.update_one(
            {"id": target_id},
            {"$set": {
                "last_content_hash": result["content_hash"],
                "last_checked": result["timestamp"],
                "change_detected": change_detected
            }}
        )
        
        return {
            "change_detected": change_detected,
            "last_checked": result["timestamp"],
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Check failed: {str(e)}")

# ============== PULSE (MESSAGING) ROUTES ==============

@pulse_router.get("/lists", response_model=List[PulseListResponse])
async def get_pulse_lists(user: Dict = Depends(get_current_user)):
    """Get all contact lists"""
    lists = await db.pulse_lists.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    return lists

@pulse_router.post("/lists", response_model=PulseListResponse)
async def create_pulse_list(list_data: PulseListCreate, user: Dict = Depends(get_current_user)):
    """Create a new contact list"""
    list_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    pulse_list = {
        "id": list_id,
        "name": list_data.name,
        "description": list_data.description,
        "contact_count": 0,
        "user_id": user["id"],
        "created_at": now
    }
    
    await db.pulse_lists.insert_one(pulse_list)
    pulse_list.pop("_id", None)
    return pulse_list

@pulse_router.post("/lists/{list_id}/contacts")
async def add_contact_to_list(list_id: str, contact: PulseContactCreate, user: Dict = Depends(get_current_user)):
    """Add a contact to a list"""
    pulse_list = await db.pulse_lists.find_one({"id": list_id, "user_id": user["id"]})
    if not pulse_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    contact_id = str(uuid.uuid4())
    contact_doc = {
        "id": contact_id,
        "list_id": list_id,
        "email": contact.email,
        "name": contact.name,
        "metadata": contact.metadata,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pulse_contacts.insert_one(contact_doc)
    await db.pulse_lists.update_one(
        {"id": list_id},
        {"$inc": {"contact_count": 1}}
    )
    
    contact_doc.pop("_id", None)
    return contact_doc

@pulse_router.get("/lists/{list_id}/contacts")
async def get_list_contacts(list_id: str, user: Dict = Depends(get_current_user)):
    """Get all contacts in a list"""
    pulse_list = await db.pulse_lists.find_one({"id": list_id, "user_id": user["id"]})
    if not pulse_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    contacts = await db.pulse_contacts.find(
        {"list_id": list_id},
        {"_id": 0}
    ).to_list(1000)
    return contacts

@pulse_router.get("/campaigns", response_model=List[PulseCampaignResponse])
async def get_campaigns(user: Dict = Depends(get_current_user)):
    """Get all campaigns"""
    campaigns = await db.pulse_campaigns.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    return campaigns

@pulse_router.post("/campaigns", response_model=PulseCampaignResponse)
async def create_campaign(campaign_data: PulseCampaignCreate, user: Dict = Depends(get_current_user)):
    """Create a new email campaign"""
    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    campaign = {
        "id": campaign_id,
        "name": campaign_data.name,
        "subject": campaign_data.subject,
        "html_content": campaign_data.html_content,
        "list_id": campaign_data.list_id,
        "status": "draft",
        "sent_count": 0,
        "user_id": user["id"],
        "created_at": now
    }
    
    await db.pulse_campaigns.insert_one(campaign)
    campaign.pop("_id", None)
    return campaign

@pulse_router.post("/campaigns/{campaign_id}/send")
async def send_campaign(campaign_id: str, user: Dict = Depends(get_current_user)):
    """Send a campaign to all contacts in the list"""
    campaign = await db.pulse_campaigns.find_one({"id": campaign_id, "user_id": user["id"]})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    contacts = await db.pulse_contacts.find(
        {"list_id": campaign["list_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    if not contacts:
        raise HTTPException(status_code=400, detail="No contacts in the list")
    
    sent_count = 0
    errors = []
    
    for contact in contacts:
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [contact["email"]],
                "subject": campaign["subject"],
                "html": campaign["html_content"]
            }
            await asyncio.to_thread(resend.Emails.send, params)
            sent_count += 1
        except Exception as e:
            errors.append({"email": contact["email"], "error": str(e)})
    
    await db.pulse_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "sent", "sent_count": sent_count}}
    )
    
    return {
        "message": f"Campaign sent to {sent_count} contacts",
        "sent_count": sent_count,
        "errors": errors
    }

# ============== HIVE (WORKROBOS/AGENTS) ROUTES ==============

@hive_router.get("", response_model=List[WorkRoboResponse])
async def get_workrobos(user: Dict = Depends(get_current_user)):
    """Get all WorkRobos"""
    robos = await db.workrobos.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    return robos

@hive_router.post("", response_model=WorkRoboResponse)
async def create_workrobo(robo_data: WorkRoboCreate, user: Dict = Depends(get_current_user)):
    """Create a new WorkRobo agent"""
    robo_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    robo = {
        "id": robo_id,
        "name": robo_data.name,
        "description": robo_data.description,
        "trigger_type": robo_data.trigger_type,
        "trigger_config": robo_data.trigger_config,
        "actions": robo_data.actions,
        "state": "idle",
        "user_id": user["id"],
        "created_at": now
    }
    
    await db.workrobos.insert_one(robo)
    robo.pop("_id", None)
    return robo

@hive_router.get("/{robo_id}", response_model=WorkRoboResponse)
async def get_workrobo(robo_id: str, user: Dict = Depends(get_current_user)):
    """Get a specific WorkRobo"""
    robo = await db.workrobos.find_one(
        {"id": robo_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not robo:
        raise HTTPException(status_code=404, detail="WorkRobo not found")
    return robo

@hive_router.delete("/{robo_id}")
async def delete_workrobo(robo_id: str, user: Dict = Depends(get_current_user)):
    """Delete a WorkRobo"""
    result = await db.workrobos.delete_one({"id": robo_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="WorkRobo not found")
    return {"message": "WorkRobo deleted successfully"}

@hive_router.post("/{robo_id}/activate")
async def activate_workrobo(robo_id: str, user: Dict = Depends(get_current_user)):
    """Activate a WorkRobo"""
    result = await db.workrobos.find_one_and_update(
        {"id": robo_id, "user_id": user["id"]},
        {"$set": {"state": "active"}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="WorkRobo not found")
    return {"state": "active"}

@hive_router.post("/{robo_id}/deactivate")
async def deactivate_workrobo(robo_id: str, user: Dict = Depends(get_current_user)):
    """Deactivate a WorkRobo"""
    result = await db.workrobos.find_one_and_update(
        {"id": robo_id, "user_id": user["id"]},
        {"$set": {"state": "idle"}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="WorkRobo not found")
    return {"state": "idle"}

# ============== AI PROCESSING ROUTES ==============

@ai_router.post("/process", response_model=AIResponse)
async def process_with_ai(request: AIPromptRequest, user: Dict = Depends(get_current_user)):
    """Process text with Gemini AI"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="AI not configured")
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        full_prompt = request.prompt
        if request.context:
            full_prompt = f"Context: {request.context}\n\nTask: {request.prompt}"
        
        response = model.generate_content(full_prompt)
        
        return {
            "response": response.text,
            "tokens_used": len(response.text.split())  # Approximate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

@ai_router.post("/analyze-webpage")
async def analyze_webpage(url: str, user: Dict = Depends(get_current_user)):
    """Analyze a webpage content with AI"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            content = response.text[:10000]  # Limit content
        
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"Analyze this webpage content and provide a summary:\n\n{content}"
        
        ai_response = model.generate_content(prompt)
        
        return {
            "url": url,
            "analysis": ai_response.text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# ============== STATS ROUTES ==============

@api_router.get("/stats")
async def get_dashboard_stats(user: Dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    streams_count = await db.streams.count_documents({"user_id": user["id"]})
    active_streams = await db.streams.count_documents({"user_id": user["id"], "is_active": True})
    sentry_count = await db.sentry_targets.count_documents({"user_id": user["id"]})
    contacts_count = await db.pulse_contacts.count_documents({})
    robos_count = await db.workrobos.count_documents({"user_id": user["id"]})
    active_robos = await db.workrobos.count_documents({"user_id": user["id"], "state": "active"})
    
    return {
        "streams": {"total": streams_count, "active": active_streams},
        "sentry": {"total": sentry_count},
        "contacts": {"total": contacts_count},
        "robos": {"total": robos_count, "active": active_robos}
    }

# ============== ROOT ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "WorkRobo.ai API", "version": "2.0.0", "engine": "active"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "WorkRobo.ai", "websocket_connections": ws_manager.get_connection_count()}

# ============== EXECUTION ENGINE ROUTES ==============

class ExecuteStreamRequest(BaseModel):
    stream_id: str
    trigger_data: Optional[Dict[str, Any]] = None

class SmartScrapeRequest(BaseModel):
    url: str
    selector: Optional[str] = None
    wait_for: Optional[str] = None

class AIProcessRequest(BaseModel):
    prompt: str
    context: Optional[str] = None
    scraped_data: Optional[str] = None

class DesignRequest(BaseModel):
    prompt: str

class SendEmailRequest(BaseModel):
    to: str
    subject: str
    html_content: str
    variables: Optional[Dict[str, str]] = None

@execute_router.post("/stream/{stream_id}")
async def execute_stream(
    stream_id: str,
    background_tasks: BackgroundTasks,
    trigger_data: Optional[Dict[str, Any]] = None,
    user: Dict = Depends(get_current_user)
):
    """Execute a Robo-Stream workflow"""
    # Get the stream
    stream = await db.streams.find_one(
        {"id": stream_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # Create status callback for real-time updates
    async def status_callback(update: Dict):
        await ws_manager.send_node_status(
            workflow_id=stream_id,
            execution_id=update['execution_id'],
            node_id=update['node_id'],
            status=update['status'],
            result=update.get('result'),
            error=update.get('error')
        )
    
    # Get scraper instance
    scraper = await get_scraper()
    
    # Create executor
    executor = WorkflowExecutor(
        db=db,
        scraper=scraper,
        gemini_model=gemini_model,
        status_callback=status_callback
    )
    
    # Execute in background for long-running workflows
    async def run_execution():
        try:
            ctx = await executor.execute_stream(stream, user["id"], trigger_data)
            
            # Send completion notification
            await ws_manager.send_execution_complete(
                workflow_id=stream_id,
                execution_id=ctx.execution_id,
                success=len(ctx.errors) == 0,
                summary=ctx.to_dict()
            )
            
            # Store activity log
            await db.activity_logs.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "type": "stream_execution",
                "stream_id": stream_id,
                "execution_id": ctx.execution_id,
                "success": len(ctx.errors) == 0,
                "node_count": len(ctx.node_results),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
        except Exception as e:
            logger.error(f"Execution failed: {e}")
            await ws_manager.send_to_workflow(stream_id, {
                'type': 'execution_error',
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
    
    # Start execution
    background_tasks.add_task(run_execution)
    
    return {
        "message": "Execution started",
        "stream_id": stream_id,
        "status": "running"
    }

@execute_router.post("/smart-scrape")
async def smart_scrape(
    request: SmartScrapeRequest,
    user: Dict = Depends(get_current_user)
):
    """
    SmartScrape - Intelligent web scraping with stealth mode.
    Returns extracted content, screenshot, and content hash.
    """
    scraper = await get_scraper()
    
    result = await scraper.smart_scrape(
        url=request.url,
        selector=request.selector,
        wait_for=request.wait_for
    )
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result.get('error', 'Scrape failed'))
    
    # Store scrape result
    await db.scrape_results.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "url": request.url,
        "content_hash": result['content_hash'],
        "content_length": len(result['content']),
        "created_at": result['timestamp']
    })
    
    return result

@execute_router.post("/ai-process")
async def ai_process(
    request: AIProcessRequest,
    user: Dict = Depends(get_current_user)
):
    """
    Process data with Gemini AI.
    Returns structured JSON response.
    """
    if not gemini_model:
        raise HTTPException(status_code=500, detail="AI not configured")
    
    # Build the full prompt
    full_prompt = request.prompt
    if request.context:
        full_prompt = f"Context: {request.context}\n\n{full_prompt}"
    if request.scraped_data:
        full_prompt = f"{full_prompt}\n\nData to analyze:\n{request.scraped_data}"
    
    try:
        response = gemini_model.generate_content(
            f"""You are an automation assistant. Respond in JSON format with the following structure:
{{
    "summary": "A brief summary of your analysis",
    "key_points": ["point 1", "point 2"],
    "action_recommended": true/false,
    "details": "Detailed analysis"
}}

{full_prompt}"""
        )
        
        import re
        import json as json_module
        
        response_text = response.text
        
        # Try to parse JSON from response
        parsed = None
        try:
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                parsed = json_module.loads(json_match.group())
        except:
            pass
        
        return {
            "success": True,
            "response": response_text,
            "parsed": parsed,
            "tokens_used": len(response_text.split())
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

@execute_router.post("/ai-design")
async def ai_design_workflow(
    request: DesignRequest,
    user: Dict = Depends(get_current_user)
):
    """
    Generate a complete React Flow workflow (nodes and edges) from natural language.
    """
    try:
        # Use gemini-1.5-flash-latest for broader compatibility
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        system_prompt = """
        You are a master automation engineer for 'Synapse', an n8n-style automation builder.
        Your goal is to design a high-impact, professional workflow based on the user's request.
        
        Available Node Types and their Configs:
        - trigger (webhook): The start of a workflow. No config needed.
        - sentry (scraper): Scrapes a URL. Config: {"url": "...", "selector": "..."}
        - ai (AI process): Analyzes data/writes icebreakers. Config: {"prompt": "..."}
        - email (Pulse): Sends email. Config: {"to": "...", "subject": "...", "body": "..."}
        - delay: Pauses execution. Config: {"seconds": 5}
        - code: Executes Python. Config: {"code": "result = {'key': 'val'}"}
        - database: MongoDB CRUD. Config: {"collection": "...", "operation": "find/insert/update/delete"}
        - condition: If/Else branch. Config: {"condition": "price < 100"}
        - http: External API calls (MUST use for Apollo, HubSpot, Slack, WhatsApp, Hunter.io, etc). 
          Config: {"method": "GET/POST", "url": "...", "headers": "{}", "body": "{}"}
        
        Guidelines for complex requests (e.g. Lead Enrichment):
        1. Start with a 'trigger' or 'sentry'.
        2. Use 'http' nodes for external SaaS platforms (Apollo, Hunter, Hubspot, Slack).
        3. Use 'ai' nodes for personalization, icebreakers, or summarization.
        4. End with 'email', 'http' (Slack), or 'database'.
        
        Rules for Node Connections (Edges):
        - AI nodes have two source handles: 'success' and 'failure'.
        - Condition nodes have two source handles: 'true' and 'false'.
        - All other nodes have a single default source handle (null).
        
        Rules for JSON Output:
        1. Output ONLY a valid JSON object.
        2. Format: {"nodes": [...], "edges": [...]}
        3. Nodes: {"id": "n1", "type": "custom", "position": {"x": 0, "y": 0}, "data": {"label": "...", "nodeType": "...", "config": {...}}}
        4. Edges: {"id": "e1-2", "source": "n1", "target": "n2", "sourceHandle": "..."}
        5. Space nodes 300px apart horizontally.
        
        User Request: """
        
        full_prompt = system_prompt + request.prompt
        
        response = await asyncio.to_thread(
            model.generate_content,
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        content = response.text
        import re
        import json as json_module
        
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            design = json_module.loads(json_match.group())
            return {"success": True, "design": design}
        else:
            return {"success": False, "error": "AI could not generate a valid design."}
            
    except Exception as e:
        logger.error(f"Design AI error: {str(e)}")
        return {"success": False, "error": str(e)}

@execute_router.post("/send-email")
async def send_email(
    request: SendEmailRequest,
    user: Dict = Depends(get_current_user)
):
    """
    Send an email via Resend with variable interpolation.
    """
    html_content = request.html_content
    
    # Interpolate variables
    if request.variables is not None:
        for key, value in request.variables.items():
            html_content = html_content.replace(f"{{{{{key}}}}}", str(value))
    
    try:
        params = {
            "from": f"WorkRobo.ai <{SENDER_EMAIL}>",
            "to": [request.to],
            "subject": request.subject,
            "html": html_content
        }
        
        email_response = await asyncio.to_thread(resend.Emails.send, params)
        
        # Log the email
        await db.email_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "to": request.to,
            "subject": request.subject,
            "email_id": email_response.get('id'),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "email_id": email_response.get('id'),
            "to": request.to,
            "subject": request.subject
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email send failed: {str(e)}")

@execute_router.get("/logs/{execution_id}")
async def get_execution_logs(
    execution_id: str,
    user: Dict = Depends(get_current_user)
):
    """Get execution logs for a specific execution"""
    log = await db.execution_logs.find_one(
        {"execution_id": execution_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not log:
        raise HTTPException(status_code=404, detail="Execution log not found")
    return log

@execute_router.get("/activity")
async def get_activity_logs(
    limit: int = 20,
    user: Dict = Depends(get_current_user)
):
    """Get recent activity logs for the user"""
    logs = await db.activity_logs.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return logs

# ============== WEBSOCKET ROUTES ==============

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for real-time updates"""
    connection_id = None
    try:
        # Get query parameters
        user_id = websocket.query_params.get('user_id')
        workflow_id = websocket.query_params.get('workflow_id')
        
        connection_id = await ws_manager.connect(websocket, user_id, workflow_id)
        
        while True:
            try:
                # Receive messages from client
                data = await websocket.receive_json()
                
                # Handle different message types
                msg_type = data.get('type')
                
                if msg_type == 'subscribe_workflow':
                    wf_id = data.get('workflow_id')
                    if wf_id:
                        await ws_manager.subscribe_to_workflow(connection_id, wf_id)
                        await ws_manager.send_personal(connection_id, {
                            'type': 'subscribed',
                            'workflow_id': wf_id
                        })
                        
                elif msg_type == 'unsubscribe_workflow':
                    wf_id = data.get('workflow_id')
                    if wf_id:
                        await ws_manager.unsubscribe_from_workflow(connection_id, wf_id)
                        await ws_manager.send_personal(connection_id, {
                            'type': 'unsubscribed',
                            'workflow_id': wf_id
                        })
                        
                elif msg_type == 'ping':
                    await ws_manager.send_personal(connection_id, {
                        'type': 'pong',
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    })
                    
            except WebSocketDisconnect:
                break
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if connection_id:
            ws_manager.disconnect(connection_id)

# ============== PING TEST ROUTE ==============

@api_router.get("/ping")
async def ping():
    """
    Ping test to verify connection between React UI and Python engine.
    Returns engine status and capabilities.
    """
    scraper_status = "ready"
    try:
        scraper = await get_scraper()
        await scraper.initialize()
    except Exception as e:
        scraper_status = f"error: {str(e)}"
    
    ai_status = "ready" if gemini_model else "not configured"
    email_status = "ready" if resend.api_key else "not configured"
    
    return {
        "status": "pong",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "engine": {
            "version": "2.0.0",
            "scraper": scraper_status,
            "ai": ai_status,
            "email": email_status,
            "websocket_connections": ws_manager.get_connection_count()
        },
        "capabilities": [
            "smart_scrape",
            "change_detection",
            "ai_processing",
            "email_sending",
            "workflow_execution",
            "real_time_updates"
        ]
    }

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(streams_router)
api_router.include_router(sentry_router)
api_router.include_router(pulse_router)
api_router.include_router(hive_router)
api_router.include_router(ai_router)
api_router.include_router(execute_router)

app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize resources on startup"""
    logger.info("WorkRobo.ai Engine starting up...")
    try:
        # Pre-initialize scraper
        scraper = await get_scraper()
        await scraper.initialize()
        logger.info("Scraper initialized")
    except Exception as e:
        logger.warning(f"Scraper initialization deferred: {e}")
        
    # Start background scheduler
    try:
        from scheduler import hive_clock
        hive_clock.start()
        await hive_clock.sync_schedules()
        logger.info("Hive-Clock Scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start Hive-Clock Scheduler: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown"""
    logger.info("WorkRobo.ai Engine shutting down...")
    try:
        from scheduler import hive_clock
        hive_clock.stop()
        logger.info("Hive-Clock Scheduler stopped")
    except Exception as e:
        logger.warning(f"Failed to cleanly stop scheduler: {e}")
        
    await cleanup_scraper()
    client.close()

