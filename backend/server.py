from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Sadaa Instrumentals API", version="2.0")
api_router = APIRouter(prefix="/api")


# ================== MODELS ==================

class Instrumental(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    mood: str  # Calm, Drums, Spiritual, Soft, Energetic
    duration: int  # in seconds
    duration_formatted: str  # e.g., "3:45"
    is_premium: bool = False
    is_featured: bool = False
    audio_url: Optional[str] = None  # Hostinger or any URL
    thumbnail_color: str = "#4A3463"
    file_size: int = 0
    play_count: int = 0
    # Preview settings for premium tracks (in seconds)
    preview_start: Optional[int] = None  # Start time in seconds (e.g., 70 for 1:10)
    preview_end: Optional[int] = None    # End time in seconds (e.g., 100 for 1:40)
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
    file_size: int = 0
    preview_start: Optional[int] = None
    preview_end: Optional[int] = None

class InstrumentalUpdate(BaseModel):
    title: Optional[str] = None
    mood: Optional[str] = None
    duration: Optional[int] = None
    duration_formatted: Optional[str] = None
    is_premium: Optional[bool] = None
    is_featured: Optional[bool] = None
    audio_url: Optional[str] = None
    thumbnail_color: Optional[str] = None
    file_size: Optional[int] = None
    preview_start: Optional[int] = None
    preview_end: Optional[int] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    is_subscribed: bool = False
    favorites: List[str] = []  # List of instrumental IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    device_id: str

class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: str = ""
    track_ids: List[str] = []
    cover_color: str = "#4A3463"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PlaylistCreate(BaseModel):
    user_id: str
    name: str
    description: str = ""
    cover_color: str = "#4A3463"

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_color: Optional[str] = None

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    is_active: bool = True
    plan: str = "monthly"
    price: float = 53.0
    subscribed_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

class SubscriptionCreate(BaseModel):
    user_id: str
    plan: str = "monthly"


# ================== SAMPLE DATA ==================
# Using placeholder URLs - Replace with your Hostinger URLs

SAMPLE_INSTRUMENTALS = [
    # Featured Instrumentals
    {"title": "Mawla Ya Salli - Peaceful", "mood": "Spiritual", "duration": 245, "duration_formatted": "4:05", "is_premium": False, "is_featured": True, "thumbnail_color": "#4A3463", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "file_size": 4500000},
    {"title": "Nasheed of Dawn", "mood": "Calm", "duration": 312, "duration_formatted": "5:12", "is_premium": True, "is_featured": True, "thumbnail_color": "#2D5A4A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", "file_size": 5200000},
    
    # Free Instrumentals
    {"title": "Morning Dhikr", "mood": "Calm", "duration": 180, "duration_formatted": "3:00", "is_premium": False, "is_featured": False, "thumbnail_color": "#5A4A63", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", "file_size": 3200000},
    {"title": "Peaceful Heart", "mood": "Soft", "duration": 210, "duration_formatted": "3:30", "is_premium": False, "is_featured": False, "thumbnail_color": "#4A5A63", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", "file_size": 3800000},
    {"title": "Blessed Sunrise", "mood": "Spiritual", "duration": 195, "duration_formatted": "3:15", "is_premium": False, "is_featured": False, "thumbnail_color": "#634A5A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", "file_size": 3500000},
    {"title": "Gentle Breeze", "mood": "Calm", "duration": 240, "duration_formatted": "4:00", "is_premium": False, "is_featured": False, "thumbnail_color": "#4A6357", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", "file_size": 4200000},
    {"title": "Silent Prayer", "mood": "Soft", "duration": 165, "duration_formatted": "2:45", "is_premium": False, "is_featured": False, "thumbnail_color": "#574A63", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", "file_size": 2900000},
    
    # Premium Instrumentals
    {"title": "Ya Sahib al-Taj", "mood": "Spiritual", "duration": 420, "duration_formatted": "7:00", "is_premium": True, "is_featured": False, "thumbnail_color": "#634A4A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", "file_size": 7200000},
    {"title": "Drums of Devotion", "mood": "Drums", "duration": 285, "duration_formatted": "4:45", "is_premium": True, "is_featured": False, "thumbnail_color": "#8B5A2B", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", "file_size": 5000000},
    {"title": "Energetic Praise", "mood": "Energetic", "duration": 198, "duration_formatted": "3:18", "is_premium": True, "is_featured": False, "thumbnail_color": "#6B4A3A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", "file_size": 3600000},
    {"title": "Sacred Rhythm", "mood": "Drums", "duration": 330, "duration_formatted": "5:30", "is_premium": True, "is_featured": False, "thumbnail_color": "#4A4A63", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", "file_size": 5800000},
    {"title": "Night of Peace", "mood": "Calm", "duration": 480, "duration_formatted": "8:00", "is_premium": True, "is_featured": False, "thumbnail_color": "#2A3A4A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", "file_size": 8200000},
    {"title": "Joyful Celebration", "mood": "Energetic", "duration": 252, "duration_formatted": "4:12", "is_premium": True, "is_featured": False, "thumbnail_color": "#5A3A4A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3", "file_size": 4500000},
    {"title": "Soft Meditation", "mood": "Soft", "duration": 360, "duration_formatted": "6:00", "is_premium": True, "is_featured": False, "thumbnail_color": "#3A4A5A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3", "file_size": 6300000},
    {"title": "Divine Harmony", "mood": "Spiritual", "duration": 390, "duration_formatted": "6:30", "is_premium": True, "is_featured": False, "thumbnail_color": "#4A3A5A", "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", "file_size": 6800000},
]


# ================== ROUTES ==================

@api_router.get("/")
async def root():
    return {"message": "Sadaa Instrumentals API", "version": "2.0"}


@api_router.post("/seed")
async def seed_database():
    """Seed the database with sample instrumentals"""
    await db.instrumentals.delete_many({})
    for item in SAMPLE_INSTRUMENTALS:
        instrumental = Instrumental(**item)
        await db.instrumentals.insert_one(instrumental.dict())
    return {"message": f"Seeded {len(SAMPLE_INSTRUMENTALS)} instrumentals"}


# ================== INSTRUMENTAL ROUTES ==================

@api_router.get("/instrumentals", response_model=List[Instrumental])
async def get_instrumentals(
    mood: Optional[str] = None,
    is_premium: Optional[bool] = None,
    search: Optional[str] = None
):
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
    instrumentals = await db.instrumentals.find({"is_featured": True}).to_list(10)
    return [Instrumental(**i) for i in instrumentals]


@api_router.get("/instrumentals/{instrumental_id}", response_model=Instrumental)
async def get_instrumental(instrumental_id: str):
    instrumental = await db.instrumentals.find_one({"id": instrumental_id})
    if not instrumental:
        raise HTTPException(status_code=404, detail="Instrumental not found")
    return Instrumental(**instrumental)


@api_router.post("/instrumentals", response_model=Instrumental)
async def create_instrumental(data: InstrumentalCreate):
    """Create a new instrumental (Admin)"""
    instrumental = Instrumental(**data.dict())
    await db.instrumentals.insert_one(instrumental.dict())
    return instrumental


@api_router.put("/instrumentals/{instrumental_id}", response_model=Instrumental)
async def update_instrumental(instrumental_id: str, data: InstrumentalUpdate):
    """Update an instrumental (Admin)"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.instrumentals.update_one(
        {"id": instrumental_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Instrumental not found")
    
    instrumental = await db.instrumentals.find_one({"id": instrumental_id})
    return Instrumental(**instrumental)


@api_router.delete("/instrumentals/{instrumental_id}")
async def delete_instrumental(instrumental_id: str):
    """Delete an instrumental (Admin)"""
    result = await db.instrumentals.delete_one({"id": instrumental_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Instrumental not found")
    return {"message": "Instrumental deleted successfully"}


@api_router.post("/instrumentals/{instrumental_id}/play")
async def increment_play_count(instrumental_id: str):
    """Increment play count for analytics"""
    await db.instrumentals.update_one(
        {"id": instrumental_id},
        {"$inc": {"play_count": 1}}
    )
    return {"message": "Play count incremented"}


# ================== USER ROUTES ==================

@api_router.post("/users", response_model=User)
async def create_or_get_user(data: UserCreate):
    existing = await db.users.find_one({"device_id": data.device_id})
    if existing:
        return User(**existing)
    
    user = User(device_id=data.device_id)
    await db.users.insert_one(user.dict())
    return user


@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)


# ================== FAVORITES ROUTES ==================

@api_router.get("/favorites/{user_id}")
async def get_favorites(user_id: str):
    """Get user's favorite tracks"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    favorite_ids = user.get("favorites", [])
    if not favorite_ids:
        return []
    
    tracks = await db.instrumentals.find({"id": {"$in": favorite_ids}}).to_list(100)
    return [Instrumental(**t) for t in tracks]


@api_router.post("/favorites/{user_id}/{track_id}")
async def add_to_favorites(user_id: str, track_id: str):
    """Add track to favorites"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"favorites": track_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Added to favorites"}


@api_router.delete("/favorites/{user_id}/{track_id}")
async def remove_from_favorites(user_id: str, track_id: str):
    """Remove track from favorites"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$pull": {"favorites": track_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Removed from favorites"}


@api_router.get("/favorites/{user_id}/check/{track_id}")
async def check_favorite(user_id: str, track_id: str):
    """Check if track is in favorites"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return {"is_favorite": False}
    return {"is_favorite": track_id in user.get("favorites", [])}


# ================== PLAYLIST ROUTES ==================

@api_router.get("/playlists/{user_id}")
async def get_user_playlists(user_id: str):
    """Get all playlists for a user"""
    playlists = await db.playlists.find({"user_id": user_id}).to_list(50)
    return [Playlist(**p) for p in playlists]


@api_router.get("/playlists/detail/{playlist_id}")
async def get_playlist(playlist_id: str):
    """Get playlist with tracks"""
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    playlist_data = Playlist(**playlist)
    
    # Get tracks in playlist
    tracks = []
    if playlist_data.track_ids:
        track_docs = await db.instrumentals.find({"id": {"$in": playlist_data.track_ids}}).to_list(100)
        # Maintain order
        track_map = {t["id"]: t for t in track_docs}
        tracks = [Instrumental(**track_map[tid]) for tid in playlist_data.track_ids if tid in track_map]
    
    return {
        "playlist": playlist_data,
        "tracks": tracks
    }


@api_router.post("/playlists", response_model=Playlist)
async def create_playlist(data: PlaylistCreate):
    """Create a new playlist"""
    playlist = Playlist(**data.dict())
    await db.playlists.insert_one(playlist.dict())
    return playlist


@api_router.put("/playlists/{playlist_id}")
async def update_playlist(playlist_id: str, data: PlaylistUpdate):
    """Update playlist details"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.playlists.update_one(
        {"id": playlist_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    playlist = await db.playlists.find_one({"id": playlist_id})
    return Playlist(**playlist)


@api_router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str):
    """Delete a playlist"""
    result = await db.playlists.delete_one({"id": playlist_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"message": "Playlist deleted"}


@api_router.post("/playlists/{playlist_id}/tracks/{track_id}")
async def add_track_to_playlist(playlist_id: str, track_id: str):
    """Add a track to playlist"""
    result = await db.playlists.update_one(
        {"id": playlist_id},
        {
            "$addToSet": {"track_ids": track_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"message": "Track added to playlist"}


@api_router.delete("/playlists/{playlist_id}/tracks/{track_id}")
async def remove_track_from_playlist(playlist_id: str, track_id: str):
    """Remove a track from playlist"""
    result = await db.playlists.update_one(
        {"id": playlist_id},
        {
            "$pull": {"track_ids": track_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"message": "Track removed from playlist"}


# ================== SUBSCRIPTION ROUTES ==================

@api_router.post("/subscription/subscribe", response_model=Subscription)
async def subscribe(data: SubscriptionCreate):
    existing = await db.subscriptions.find_one({
        "user_id": data.user_id,
        "is_active": True
    })
    if existing:
        return Subscription(**existing)
    
    if data.plan == "yearly":
        expires_at = datetime.utcnow() + timedelta(days=365)
        price = 499.0
    else:
        expires_at = datetime.utcnow() + timedelta(days=30)
        price = 53.0
    
    subscription = Subscription(
        user_id=data.user_id,
        plan=data.plan,
        price=price,
        expires_at=expires_at
    )
    await db.subscriptions.insert_one(subscription.dict())
    await db.users.update_one({"id": data.user_id}, {"$set": {"is_subscribed": True}})
    
    return subscription


@api_router.get("/subscription/status/{user_id}")
async def get_subscription_status(user_id: str):
    subscription = await db.subscriptions.find_one({
        "user_id": user_id,
        "is_active": True
    })
    
    if not subscription:
        return {"is_subscribed": False, "subscription": None}
    
    sub = Subscription(**subscription)
    if sub.expires_at and sub.expires_at < datetime.utcnow():
        await db.subscriptions.update_one({"id": sub.id}, {"$set": {"is_active": False}})
        await db.users.update_one({"id": user_id}, {"$set": {"is_subscribed": False}})
        return {"is_subscribed": False, "subscription": None}
    
    return {"is_subscribed": True, "subscription": sub}


@api_router.post("/subscription/restore/{user_id}")
async def restore_purchase(user_id: str):
    subscription = await db.subscriptions.find_one({"user_id": user_id, "is_active": True})
    if subscription:
        return {"restored": True, "subscription": Subscription(**subscription)}
    return {"restored": False, "message": "No active subscription found"}


# ================== ADMIN ROUTES ==================

@api_router.get("/admin/stats")
async def get_stats():
    """Get app statistics"""
    return {
        "total_instrumentals": await db.instrumentals.count_documents({}),
        "premium_instrumentals": await db.instrumentals.count_documents({"is_premium": True}),
        "free_instrumentals": await db.instrumentals.count_documents({"is_premium": False}),
        "featured_instrumentals": await db.instrumentals.count_documents({"is_featured": True}),
        "total_users": await db.users.count_documents({}),
        "active_subscriptions": await db.subscriptions.count_documents({"is_active": True}),
        "total_playlists": await db.playlists.count_documents({})
    }


@api_router.get("/moods")
async def get_moods():
    return {"moods": ["All", "Calm", "Drums", "Spiritual", "Soft", "Energetic"]}


# ================== APP SETUP ==================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
