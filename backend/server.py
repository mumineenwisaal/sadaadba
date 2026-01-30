from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Instrumental(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    mood: str  # Calm, Drums, Spiritual, Soft, Energetic
    duration: int  # in seconds
    duration_formatted: str  # e.g., "3:45"
    is_premium: bool = False
    is_featured: bool = False
    audio_url: Optional[str] = None  # For future Firebase Storage integration
    thumbnail_color: str = "#4A3463"  # Gradient color for card
    created_at: datetime = Field(default_factory=datetime.utcnow)

class InstrumentalCreate(BaseModel):
    title: str
    mood: str
    duration: int
    duration_formatted: str
    is_premium: bool = False
    is_featured: bool = False
    audio_url: Optional[str] = None
    thumbnail_color: str = "#4A3463"

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    is_active: bool = True
    plan: str = "monthly"  # monthly
    price: float = 53.0  # INR
    subscribed_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

class SubscriptionCreate(BaseModel):
    user_id: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    is_subscribed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    device_id: str


# Sample instrumental data for seeding
SAMPLE_INSTRUMENTALS = [
    # Featured Instrumentals
    {"title": "Mawla Ya Salli - Peaceful", "mood": "Spiritual", "duration": 245, "duration_formatted": "4:05", "is_premium": False, "is_featured": True, "thumbnail_color": "#4A3463"},
    {"title": "Nasheed of Dawn", "mood": "Calm", "duration": 312, "duration_formatted": "5:12", "is_premium": True, "is_featured": True, "thumbnail_color": "#2D5A4A"},
    
    # Free Instrumentals
    {"title": "Morning Dhikr", "mood": "Calm", "duration": 180, "duration_formatted": "3:00", "is_premium": False, "is_featured": False, "thumbnail_color": "#5A4A63"},
    {"title": "Peaceful Heart", "mood": "Soft", "duration": 210, "duration_formatted": "3:30", "is_premium": False, "is_featured": False, "thumbnail_color": "#4A5A63"},
    {"title": "Blessed Sunrise", "mood": "Spiritual", "duration": 195, "duration_formatted": "3:15", "is_premium": False, "is_featured": False, "thumbnail_color": "#634A5A"},
    {"title": "Gentle Breeze", "mood": "Calm", "duration": 240, "duration_formatted": "4:00", "is_premium": False, "is_featured": False, "thumbnail_color": "#4A6357"},
    {"title": "Silent Prayer", "mood": "Soft", "duration": 165, "duration_formatted": "2:45", "is_premium": False, "is_featured": False, "thumbnail_color": "#574A63"},
    
    # Premium Instrumentals
    {"title": "Ya Sahib al-Taj", "mood": "Spiritual", "duration": 420, "duration_formatted": "7:00", "is_premium": True, "is_featured": False, "thumbnail_color": "#634A4A"},
    {"title": "Drums of Devotion", "mood": "Drums", "duration": 285, "duration_formatted": "4:45", "is_premium": True, "is_featured": False, "thumbnail_color": "#8B5A2B"},
    {"title": "Energetic Praise", "mood": "Energetic", "duration": 198, "duration_formatted": "3:18", "is_premium": True, "is_featured": False, "thumbnail_color": "#6B4A3A"},
    {"title": "Sacred Rhythm", "mood": "Drums", "duration": 330, "duration_formatted": "5:30", "is_premium": True, "is_featured": False, "thumbnail_color": "#4A4A63"},
    {"title": "Night of Peace", "mood": "Calm", "duration": 480, "duration_formatted": "8:00", "is_premium": True, "is_featured": False, "thumbnail_color": "#2A3A4A"},
    {"title": "Joyful Celebration", "mood": "Energetic", "duration": 252, "duration_formatted": "4:12", "is_premium": True, "is_featured": False, "thumbnail_color": "#5A3A4A"},
    {"title": "Soft Meditation", "mood": "Soft", "duration": 360, "duration_formatted": "6:00", "is_premium": True, "is_featured": False, "thumbnail_color": "#3A4A5A"},
    {"title": "Divine Harmony", "mood": "Spiritual", "duration": 390, "duration_formatted": "6:30", "is_premium": True, "is_featured": False, "thumbnail_color": "#4A3A5A"},
]


# Routes
@api_router.get("/")
async def root():
    return {"message": "Sadaa Instrumentals API", "version": "1.0"}


# Seed database endpoint
@api_router.post("/seed")
async def seed_database():
    """Seed the database with sample instrumentals"""
    # Clear existing instrumentals
    await db.instrumentals.delete_many({})
    
    # Insert sample data
    for item in SAMPLE_INSTRUMENTALS:
        instrumental = Instrumental(**item)
        await db.instrumentals.insert_one(instrumental.dict())
    
    return {"message": f"Seeded {len(SAMPLE_INSTRUMENTALS)} instrumentals"}


# Instrumental endpoints
@api_router.get("/instrumentals", response_model=List[Instrumental])
async def get_instrumentals(
    mood: Optional[str] = None,
    is_premium: Optional[bool] = None,
    search: Optional[str] = None
):
    """Get all instrumentals with optional filters"""
    query = {}
    
    if mood and mood != "All":
        query["mood"] = mood
    
    if is_premium is not None:
        query["is_premium"] = is_premium
    
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    
    instrumentals = await db.instrumentals.find(query).to_list(100)
    return [Instrumental(**i) for i in instrumentals]


@api_router.get("/instrumentals/featured", response_model=List[Instrumental])
async def get_featured_instrumentals():
    """Get featured instrumentals for banner"""
    instrumentals = await db.instrumentals.find({"is_featured": True}).to_list(10)
    return [Instrumental(**i) for i in instrumentals]


@api_router.get("/instrumentals/{instrumental_id}", response_model=Instrumental)
async def get_instrumental(instrumental_id: str):
    """Get a single instrumental by ID"""
    instrumental = await db.instrumentals.find_one({"id": instrumental_id})
    if not instrumental:
        raise HTTPException(status_code=404, detail="Instrumental not found")
    return Instrumental(**instrumental)


@api_router.post("/instrumentals", response_model=Instrumental)
async def create_instrumental(data: InstrumentalCreate):
    """Create a new instrumental"""
    instrumental = Instrumental(**data.dict())
    await db.instrumentals.insert_one(instrumental.dict())
    return instrumental


# User endpoints
@api_router.post("/users", response_model=User)
async def create_or_get_user(data: UserCreate):
    """Create a new user or get existing by device_id"""
    existing = await db.users.find_one({"device_id": data.device_id})
    if existing:
        return User(**existing)
    
    user = User(device_id=data.device_id)
    await db.users.insert_one(user.dict())
    return user


@api_router.get("/users/{device_id}", response_model=User)
async def get_user(device_id: str):
    """Get user by device ID"""
    user = await db.users.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)


# Subscription endpoints
@api_router.post("/subscription/subscribe", response_model=Subscription)
async def subscribe(data: SubscriptionCreate):
    """Create a mock subscription for a user"""
    from datetime import timedelta
    
    # Check if user already has active subscription
    existing = await db.subscriptions.find_one({
        "user_id": data.user_id,
        "is_active": True
    })
    if existing:
        return Subscription(**existing)
    
    # Create new subscription (expires in 30 days)
    subscription = Subscription(
        user_id=data.user_id,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    await db.subscriptions.insert_one(subscription.dict())
    
    # Update user's subscription status
    await db.users.update_one(
        {"id": data.user_id},
        {"$set": {"is_subscribed": True}}
    )
    
    return subscription


@api_router.get("/subscription/status/{user_id}")
async def get_subscription_status(user_id: str):
    """Check subscription status for a user"""
    subscription = await db.subscriptions.find_one({
        "user_id": user_id,
        "is_active": True
    })
    
    if not subscription:
        return {
            "is_subscribed": False,
            "subscription": None
        }
    
    # Check if subscription has expired
    sub = Subscription(**subscription)
    if sub.expires_at and sub.expires_at < datetime.utcnow():
        # Mark as inactive
        await db.subscriptions.update_one(
            {"id": sub.id},
            {"$set": {"is_active": False}}
        )
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_subscribed": False}}
        )
        return {
            "is_subscribed": False,
            "subscription": None
        }
    
    return {
        "is_subscribed": True,
        "subscription": sub
    }


@api_router.post("/subscription/restore/{user_id}")
async def restore_purchase(user_id: str):
    """Restore purchase for a user (mock)"""
    subscription = await db.subscriptions.find_one({
        "user_id": user_id,
        "is_active": True
    })
    
    if subscription:
        return {
            "restored": True,
            "subscription": Subscription(**subscription)
        }
    
    return {
        "restored": False,
        "message": "No active subscription found to restore"
    }


# Moods endpoint
@api_router.get("/moods")
async def get_moods():
    """Get all available moods"""
    return {
        "moods": ["All", "Calm", "Drums", "Spiritual", "Soft", "Energetic"]
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
