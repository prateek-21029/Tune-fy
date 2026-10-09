import os
import shutil
import time
import sqlite3
from typing import Optional, List
import requests
import jwt
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    Header,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    ForeignKey,
    Table,
    inspect,
    text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship

# Dynamic Base URL helper
def get_backend_base_url() -> str:
    """Returns the Render HTTPS URL when hosted, or localhost when running locally."""
    return (
        os.getenv("RENDER_EXTERNAL_URL")
        or "https://tunefy-backend.onrender.com"
        if os.getenv("RENDER")
        else "http://localhost:8000"
    ).rstrip("/")

# --- SUPABASE STORAGE CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://cvqwnjdahhzjjyfgfvmc.supabase.co").rstrip("/")
SUPABASE_KEY = os.getenv(
    "SUPABASE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cXduamRhaGh6amp5Zmdmdm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzA1NDQsImV4cCI6MjEwNjcwNjU0NH0.uKyuRMFp6_Iz6A_es8VvyDfJ06copFZybsmhY2JJKU4"
)

supabase = None
try:
    from supabase import create_client, Client
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Supabase init error: {e}")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
COVERS_DIR = os.path.join(STATIC_DIR, "covers")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(COVERS_DIR, exist_ok=True)

def upload_file_to_supabase(file_bytes: bytes, filename: str, content_type: str = "audio/mpeg") -> str:
    """Uploads file to Supabase 'TUNEFY-FILES' bucket and returns direct public URL."""
    base_url = get_backend_base_url()
    
    if supabase:
        # Try both the dashboard name 'TUNEFY-FILES' and lowercase fallback
        for bucket_name in ["TUNEFY-FILES", "tunefy-files"]:
            try:
                supabase.storage.from_(bucket_name).upload(
                    path=filename,
                    file=file_bytes,
                    file_options={"content-type": content_type, "upsert": "true"}
                )
                return f"{SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{filename}"
            except Exception as e:
                # If already exists or bucket error, try next
                if "Duplicate" in str(e) or "already exists" in str(e).lower():
                    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{filename}"
                print(f"Supabase upload attempt ({bucket_name}) error: {e}")

    # Fallback to backend static files with Render's HTTPS URL in production
    local_path = os.path.join(STATIC_DIR, filename)
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    return f"{base_url}/static/{filename}"

# --- DATABASE SETUP ---
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception:
    pwd_context = None

JWT_SECRET = "tunefy_super_secret_jwt_key_2026"
JWT_ALGORITHM = "HS256"
# Database connection: Uses PostgreSQL on Render/Supabase, SQLite locally
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tunefy.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

playlist_tracks = Table(
    "playlist_tracks",
    Base.metadata,
    Column("playlist_id", Integer, ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True),
    Column("track_id", String, ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True),
)

class DBUser(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    security_question = Column(String, nullable=True)
    security_answer = Column(String, nullable=True)
    playlists = relationship("DBPlaylist", back_populates="owner", cascade="all, delete-orphan")

class DBTrack(Base):
    __tablename__ = "tracks"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    artist = Column(String, index=True)
    cover_url = Column(String)
    audio_url = Column(String)
    duration = Column(Integer, default=210)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    artist_bio = Column(String, nullable=True)

class DBLikedTrack(Base):
    __tablename__ = "liked_tracks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    track_id = Column(String, ForeignKey("tracks.id", ondelete="CASCADE"))

class DBPlaylist(Base):
    __tablename__ = "playlists"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    cover_url = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    owner = relationship("DBUser", back_populates="playlists")
    tracks = relationship("DBTrack", secondary=playlist_tracks)

Base.metadata.create_all(bind=engine)

def run_auto_migrations():
    with engine.connect() as conn:
        inspector = inspect(engine)
        # Users migrations
        if "users" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("users")]
            if "password_hash" not in columns:
                if "hashed_password" in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
                    conn.execute(text("UPDATE users SET password_hash = hashed_password"))
                    conn.commit()
                elif "password" in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
                    conn.execute(text("UPDATE users SET password_hash = password"))
                    conn.commit()
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR DEFAULT ''"))
                    conn.commit()
            if "display_name" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR"))
                conn.commit()
            if "avatar_url" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR"))
                conn.commit()

        # Tracks migrations
        if "tracks" in inspector.get_table_names():
            t_columns = [c["name"] for c in inspector.get_columns("tracks")]
            if "user_id" not in t_columns:
                conn.execute(text("ALTER TABLE tracks ADD COLUMN user_id INTEGER"))
                conn.commit()
            if "artist_bio" not in t_columns:
                conn.execute(text("ALTER TABLE tracks ADD COLUMN artist_bio TEXT"))
                conn.commit()
            if "duration" not in t_columns:
                conn.execute(text("ALTER TABLE tracks ADD COLUMN duration INTEGER DEFAULT 210"))
                conn.commit()

run_auto_migrations()

def fix_all_audio_durations():
    """Calculates actual audio lengths for all tracks from disk and repairs legacy 210 values."""
    try:
        from mutagen.mp3 import MP3
        from mutagen.wave import WAVE
        db = SessionLocal()
        tracks = db.query(DBTrack).all()
        repaired_count = 0
        for t in tracks:
            if t.audio_url and "/static/" in t.audio_url:
                filename = t.audio_url.split("/static/")[-1].split("/")[-1]
                filepath = os.path.join(STATIC_DIR, filename)
                if os.path.exists(filepath):
                    try:
                        ext = os.path.splitext(filename)[1].lower()
                        real_secs = 0
                        if ext == ".mp3":
                            real_secs = int(MP3(filepath).info.length)
                        elif ext == ".wav":
                            real_secs = int(WAVE(filepath).info.length)
                        if real_secs > 0 and t.duration != real_secs:
                            t.duration = real_secs
                            repaired_count += 1
                    except Exception:
                        pass
        if repaired_count > 0:
            db.commit()
            print(f"--> Successfully repaired {repaired_count} track timestamps in SQLite database!")
        db.close()
    except Exception as e:
        print(f"Timestamp repair note: {e}")

fix_all_audio_durations()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- FASTAPI APP ---
app = FastAPI(title="Tune-fy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://tune-fy-xdk7.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    security_question: Optional[str] = None
    security_answer: Optional[str] = None

class SecurityQuestionRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    security_answer: str
    new_password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserProfileUpdate(BaseModel):
    displayName: Optional[str] = None
    username: Optional[str] = None

class PlaylistCreate(BaseModel):
    name: str

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None

def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": int(time.time()) + 86400 * 30
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[DBUser]:
    if not authorization:
        return None
    token = authorization.replace("Bearer", "").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            user = db.query(DBUser).filter(DBUser.id == int(user_id)).first()
            if user:
                return user
    except Exception:
        pass
    user = db.query(DBUser).filter(DBUser.username == token).first()
    return user

def verify_password(plain_password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return True
    if stored_hash == plain_password:
        return True
    if pwd_context:
        try:
            if pwd_context.verify(plain_password, stored_hash):
                return True
        except Exception:
            pass
    return False

def normalize_url(url: str) -> str:
    if not url:
        return ""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    base_url = get_backend_base_url()
    if url.startswith("/"):
        return f"{base_url}{url}"
    return f"{base_url}/static/{url}"

# --- FILE ROUTING WITH FALLBACKS ---
@app.get("/uploads/covers/{filename:path}")
def handle_covers(filename: str):
    p1 = os.path.join(COVERS_DIR, filename)
    if os.path.exists(p1):
        return FileResponse(p1)
    p2 = os.path.join(STATIC_DIR, filename)
    if os.path.exists(p2):
        return FileResponse(p2)
    return RedirectResponse(
        url="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop",
        status_code=307,
    )

@app.get("/uploads/{filename:path}")
def handle_uploads(filename: str):
    p1 = os.path.join(STATIC_DIR, filename)
    if os.path.exists(p1):
        return FileResponse(p1)
    p2 = os.path.join(COVERS_DIR, filename)
    if os.path.exists(p2):
        return FileResponse(p2)
    raise HTTPException(status_code=404, detail="File not found")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# --- AUTH ENDPOINTS ---
@app.post("/api/auth/register")
def register(payload: UserRegister, db: Session = Depends(get_db)):
    uname = payload.username.strip()
    uemail = payload.email.strip().lower()
    
    # Check if username or email already exists (case-insensitive)
    existing = db.query(DBUser).filter(
        (DBUser.username.ilike(uname)) | (DBUser.email.ilike(uemail))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already taken")
    
    # Store clean password
    new_user = DBUser(
        username=uname,
        email=uemail,
        password_hash=payload.password.strip(),
        display_name=uname,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_token(new_user.id)
    return {
        "token": token,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "displayName": new_user.display_name or new_user.username,
            "avatarUrl": new_user.avatar_url,
        }
    }

@app.post("/api/auth/register")
def register(payload: UserRegister, db: Session = Depends(get_db)):
    uname = payload.username.strip()
    uemail = payload.email.strip().lower()

    existing = db.query(DBUser).filter(
        (DBUser.username.ilike(uname)) | (DBUser.email.ilike(uemail))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already taken")

    new_user = DBUser(
        username=uname,
        email=uemail,
        password_hash=payload.password.strip(),
        display_name=uname,
        security_question=payload.security_question.strip() if payload.security_question else None,
        security_answer=payload.security_answer.strip().lower() if payload.security_answer else None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_token(new_user.id)
    return {
        "token": token,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "displayName": new_user.display_name or new_user.username,
            "avatarUrl": new_user.avatar_url,
        }
    }

@app.post("/api/auth/login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    identifier = payload.username.strip()
    
    # Check case-insensitively so login succeeds regardless of typing email or username
    user = db.query(DBUser).filter(
        (DBUser.username.ilike(identifier)) | (DBUser.email.ilike(identifier))
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username/email or password")
    
    pwd = payload.password.strip()
    if user.password_hash != pwd and not verify_password(pwd, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username/email or password")
    
    token = create_token(user.id)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "displayName": user.display_name or user.username,
            "avatarUrl": normalize_url(user.avatar_url) if user.avatar_url else None,
        }
    }

@app.post("/api/auth/security-question")
def get_security_question(payload: SecurityQuestionRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email.ilike(payload.email.strip())).first()
    if not user or not user.security_question:
        raise HTTPException(status_code=404, detail="No recovery question registered for this email.")
    return {"question": user.security_question}

@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email.ilike(payload.email.strip())).first()
    if not user or not user.security_answer:
        raise HTTPException(status_code=404, detail="User not found or no security answer set.")
    
    if user.security_answer.strip().lower() != payload.security_answer.strip().lower():
        raise HTTPException(status_code=400, detail="Incorrect security answer.")
    
    user.password_hash = payload.new_password.strip()
    db.commit()
    return {"status": "password_reset_success"}

@app.get("/api/auth/me")
def get_me(current_user: Optional[DBUser] = Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "displayName": current_user.display_name or current_user.username,
        "avatarUrl": normalize_url(current_user.avatar_url) if current_user.avatar_url else None,
    }

@app.patch("/api/auth/profile")
def update_profile(
    payload: UserProfileUpdate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    current_user = get_current_user_optional(authorization, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if payload.username and payload.username.strip() != current_user.username:
        new_uname = payload.username.strip()
        existing = db.query(DBUser).filter(DBUser.username == new_uname, DBUser.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username is already taken")
        current_user.username = new_uname
    if payload.displayName is not None:
        current_user.display_name = payload.displayName.strip()
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "displayName": current_user.display_name or current_user.username,
        "avatarUrl": normalize_url(current_user.avatar_url) if current_user.avatar_url else None,
    }

@app.post("/api/auth/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    current_user = get_current_user_optional(authorization, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    ext = os.path.splitext(file.filename)[1] or ".png"
    filename = f"avatar_{current_user.id}_{int(time.time())}{ext}"
    file_bytes = file.file.read()
    
    avatar_url = upload_file_to_supabase(file_bytes, filename, "image/png")
    current_user.avatar_url = avatar_url
    db.commit()
    return {"avatarUrl": normalize_url(avatar_url)}

@app.delete("/api/auth/account")
def delete_account(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    current_user = get_current_user_optional(authorization, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 1. Clear user playlists and junction associations in playlist_tracks
    user_playlists = db.query(DBPlaylist).filter(DBPlaylist.user_id == current_user.id).all()
    for pl in user_playlists:
        pl.tracks.clear()
        db.delete(pl)

    # 2. Delete liked track entries safely
    db.query(DBLikedTrack).filter(DBLikedTrack.user_id == current_user.id).delete(synchronize_session=False)

    # 3. Clean up physical files and track records uploaded by the user
    user_tracks = db.query(DBTrack).filter(DBTrack.user_id == current_user.id).all()
    for t in user_tracks:
        if t.audio_url and "/static/" in t.audio_url:
            f = os.path.join(STATIC_DIR, t.audio_url.split("/static/")[-1])
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass
        if t.cover_url and "/static/" in t.cover_url:
            f = os.path.join(STATIC_DIR, t.cover_url.split("/static/")[-1])
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass
        db.delete(t)

    # 4. Delete user account
    db.delete(current_user)
    db.commit()
    return {"status": "deleted"}

# --- SPOTIFY SEARCH METADATA ---
@app.get("/api/spotify/search")
def search_spotify_meta(q: str):
    try:
        res = requests.get(
            "https://itunes.apple.com/search",
            params={"term": q, "media": "music", "entity": "song", "limit": 1},
            timeout=5
        )
        if res.status_code == 200:
            data = res.json()
            if data.get("resultCount", 0) > 0:
                item = data["results"][0]
                art = item.get("artworkUrl100", "").replace("100x100bb", "600x600bb")
                return {
                    "title": item.get("trackName"),
                    "artist": item.get("artistName"),
                    "coverUrl": art,
                }
    except Exception:
        pass
    return {"title": q, "artist": "", "coverUrl": None}

# --- TRACKS ENDPOINTS ---
STOCK_DEMO_TRACKS = [
    {
        "id": "1",
        "title": "Electro Chill",
        "artist": "SoundHelix",
        "cover_url": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "duration": 372,
        "artist_bio": "Tune-fy verified creator streaming in lossless high-definition audio."
    },
    {
        "id": "2",
        "title": "Synthwave Breeze",
        "artist": "SoundHelix",
        "cover_url": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=60",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        "duration": 435,
        "artist_bio": "Tune-fy verified creator streaming in lossless high-definition audio."
    },
    {
        "id": "3",
        "title": "Midnight Drive",
        "artist": "SoundHelix",
        "cover_url": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=60",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        "duration": 346,
        "artist_bio": "Tune-fy verified creator streaming in lossless high-definition audio."
    },
    {
        "id": "4",
        "title": "Deep Focus",
        "artist": "SoundHelix",
        "cover_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        "duration": 302,
        "artist_bio": "Tune-fy verified creator streaming in lossless high-definition audio."
    },
    {
        "id": "5",
        "title": "Urban Rhythm",
        "artist": "SoundHelix",
        "cover_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=60",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
        "duration": 353,
        "artist_bio": "Tune-fy verified creator streaming in lossless high-definition audio."
    }
]

def ensure_demo_tracks(db: Session):
    """Seed demo tracks if none are present in database."""
    count = db.query(DBTrack).filter(DBTrack.user_id == None).count()
    if count == 0:
        for item in STOCK_DEMO_TRACKS:
            db_track = DBTrack(
                id=item["id"],
                title=item["title"],
                artist=item["artist"],
                cover_url=item["cover_url"],
                audio_url=item["audio_url"],
                duration=item["duration"],
                user_id=None,
                artist_bio=item["artist_bio"]
            )
            db.add(db_track)
        db.commit()
        # Update existing demo tracks if they were already seeded with 210
    durations_map = {"1": 372, "2": 425, "3": 346, "4": 302, "5": 353}
    for track_id, real_len in durations_map.items():
        db_track = db.query(DBTrack).filter(DBTrack.id == track_id).first()
        if db_track and db_track.duration == 210:
            db_track.duration = real_len
    db.commit()

@app.get("/api/tracks")
def get_tracks(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    current_user = get_current_user_optional(authorization, db)
    ensure_demo_tracks(db)

    if current_user:
        # Strictly return this user's tracks (returns [] if none uploaded yet)
        tracks = db.query(DBTrack).filter(DBTrack.user_id == current_user.id).all()
    else:
        # Guests only see demo tracks
        tracks = db.query(DBTrack).filter(DBTrack.user_id == None).all()

    return [
        {
            "id": t.id,
            "title": t.title,
            "artist": t.artist,
            "coverUrl": normalize_url(t.cover_url),
            "audioUrl": normalize_url(t.audio_url),
            "duration": t.duration,
            "userId": t.user_id,
            "artistBio": t.artist_bio or "Tune-fy verified creator streaming in lossless high-definition audio."
        }
        for t in tracks
    ]

@app.post("/api/tracks/upload")
@app.post("/api/upload")
def upload_track(
    title: str = Form(...),
    artist: str = Form(...),
    audio: UploadFile = File(...),
    cover: Optional[UploadFile] = File(None),
    cover_url_str: Optional[str] = Form(None),
    artist_bio: Optional[str] = Form(None),
    duration: Optional[int] = Form(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    current_user = get_current_user_optional(authorization, db)
    user_id = current_user.id if current_user else None
    track_id = f"track_{int(time.time() * 1000)}"

    # 1. Read audio bytes and calculate duration
    audio_bytes = audio.file.read()
    audio_ext = os.path.splitext(audio.filename)[1] or ".mp3"
    audio_filename = f"{track_id}{audio_ext}"
    temp_audio_path = os.path.join(STATIC_DIR, audio_filename)
    with open(temp_audio_path, "wb") as buffer:
        buffer.write(audio_bytes)

    final_duration = duration if (duration and duration > 0) else 210
    try:
        from mutagen.mp3 import MP3
        from mutagen.wave import WAVE
        if audio_ext.lower() == ".mp3":
            info = MP3(temp_audio_path)
            final_duration = int(info.info.length)
        elif audio_ext.lower() == ".wav":
            info = WAVE(temp_audio_path)
            final_duration = int(info.info.length)
    except Exception:
        pass

    # 2. Upload Audio to Supabase
    mime_type = "audio/mpeg" if audio_ext.lower() == ".mp3" else "audio/wav"
    audio_url = upload_file_to_supabase(audio_bytes, audio_filename, mime_type)

    # 3. Handle Cover Artwork
    final_cover_url = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop"
    if cover:
        cover_bytes = cover.file.read()
        cover_ext = os.path.splitext(cover.filename)[1] or ".jpg"
        cover_filename = f"{track_id}_cover{cover_ext}"
        final_cover_url = upload_file_to_supabase(cover_bytes, cover_filename, "image/jpeg")
    elif cover_url_str and cover_url_str.startswith("http"):
        try:
            resp = requests.get(cover_url_str, timeout=6)
            if resp.status_code == 200:
                cover_filename = f"{track_id}_cover.jpg"
                final_cover_url = upload_file_to_supabase(resp.content, cover_filename, "image/jpeg")
            else:
                final_cover_url = cover_url_str
        except Exception:
            final_cover_url = cover_url_str

    new_track = DBTrack(
        id=track_id,
        title=title.strip(),
        artist=artist.strip(),
        cover_url=final_cover_url,
        audio_url=audio_url,
        duration=final_duration,
        user_id=user_id,
        artist_bio=artist_bio.strip() if artist_bio else "Tune-fy verified creator streaming in lossless high-definition audio."
    )
    db.add(new_track)
    db.commit()
    db.refresh(new_track)

    return {
        "id": new_track.id,
        "title": new_track.title,
        "artist": new_track.artist,
        "coverUrl": normalize_url(new_track.cover_url),
        "audioUrl": normalize_url(new_track.audio_url),
        "duration": new_track.duration,
        "userId": new_track.user_id,
        "artistBio": new_track.artist_bio,
    }

@app.delete("/api/tracks/{track_id}")
def delete_track(track_id: str, db: Session = Depends(get_db)):
    track = db.query(DBTrack).filter(DBTrack.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    if track.audio_url and "/static/" in track.audio_url:
        f = os.path.join(STATIC_DIR, track.audio_url.split("/static/")[-1])
        if os.path.exists(f):
            try:
                os.remove(f)
            except Exception:
                pass
    if track.cover_url and "/static/" in track.cover_url:
        f = os.path.join(STATIC_DIR, track.cover_url.split("/static/")[-1])
        if os.path.exists(f):
            try:
                os.remove(f)
            except Exception:
                pass
    db.delete(track)
    db.commit()
    return {"status": "deleted"}

@app.patch("/api/tracks/{track_id}")
def update_track(
    track_id: str,
    title: Optional[str] = Form(None),
    artist: Optional[str] = Form(None),
    artist_bio: Optional[str] = Form(None),
    cover: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    track = db.query(DBTrack).filter(DBTrack.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    if title and title.strip():
        track.title = title.strip()
    if artist and artist.strip():
        track.artist = artist.strip()
    if artist_bio is not None:
        track.artist_bio = artist_bio.strip()
    if cover:
        ext = os.path.splitext(cover.filename)[1] or ".jpg"
        cover_filename = f"{track_id}_cover_{int(time.time())}{ext}"
        cover_bytes = cover.file.read()
        track.cover_url = upload_file_to_supabase(cover_bytes, cover_filename, "image/jpeg")

    db.commit()
    db.refresh(track)
    return {
        "id": track.id,
        "title": track.title,
        "artist": track.artist,
        "coverUrl": normalize_url(track.cover_url),
        "audioUrl": normalize_url(track.audio_url),
        "duration": track.duration,
        "userId": track.user_id,
        "artistBio": track.artist_bio,
    }

# --- LIKED TRACKS ---
@app.get("/api/liked")
def get_liked_tracks(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    current_user = get_current_user_optional(authorization, db)
    user_id = current_user.id if current_user else None
    likes = db.query(DBLikedTrack).filter(DBLikedTrack.user_id == user_id).all()
    return [l.track_id for l in likes]

@app.post("/api/liked/{track_id}")
def toggle_like(
    track_id: str,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    current_user = get_current_user_optional(authorization, db)
    user_id = current_user.id if current_user else None
    existing = db.query(DBLikedTrack).filter(
        DBLikedTrack.user_id == user_id,
        DBLikedTrack.track_id == track_id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "unliked"}
    new_like = DBLikedTrack(user_id=user_id, track_id=track_id)
    db.add(new_like)
    db.commit()
    return {"status": "liked"}

# --- PLAYLISTS ---
@app.get("/api/playlists")
def get_playlists(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    current_user = get_current_user_optional(authorization, db)
    user_id = current_user.id if current_user else None
    playlists = db.query(DBPlaylist).filter(DBPlaylist.user_id == user_id).all()
    result = []
    for pl in playlists:
        result.append({
            "id": pl.id,
            "name": pl.name,
            "coverUrl": normalize_url(pl.cover_url),
            "tracks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "artist": t.artist,
                    "coverUrl": normalize_url(t.cover_url),
                    "audioUrl": normalize_url(t.audio_url),
                    "duration": t.duration,
                    "userId": t.user_id,
                    "artistBio": t.artist_bio,
                }
                for t in pl.tracks
            ]
        })
    return result

@app.post("/api/playlists")
def create_playlist(
    payload: PlaylistCreate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    current_user = get_current_user_optional(authorization, db)
    user_id = current_user.id if current_user else None
    new_pl = DBPlaylist(name=payload.name.strip(), user_id=user_id)
    db.add(new_pl)
    db.commit()
    db.refresh(new_pl)
    return {"id": new_pl.id, "name": new_pl.name, "coverUrl": new_pl.cover_url, "tracks": []}

@app.get("/api/playlists/{playlist_id}")
def get_playlist_detail(playlist_id: int, db: Session = Depends(get_db)):
    pl = db.query(DBPlaylist).filter(DBPlaylist.id == playlist_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {
        "id": pl.id,
        "name": pl.name,
        "coverUrl": normalize_url(pl.cover_url),
        "tracks": [
            {
                "id": t.id,
                "title": t.title,
                "artist": t.artist,
                "coverUrl": normalize_url(t.cover_url),
                "audioUrl": normalize_url(t.audio_url),
                "duration": t.duration,
                "userId": t.user_id,
                "artistBio": t.artist_bio,
            }
            for t in pl.tracks
        ]
    }

@app.patch("/api/playlists/{playlist_id}")
def update_playlist(
    playlist_id: int,
    payload: PlaylistUpdate,
    db: Session = Depends(get_db)
):
    pl = db.query(DBPlaylist).filter(DBPlaylist.id == playlist_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if payload.name:
        pl.name = payload.name.strip()
    db.commit()
    return {"status": "updated", "name": pl.name}

@app.post("/api/playlists/{playlist_id}/cover")
def upload_playlist_cover(
    playlist_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    pl = db.query(DBPlaylist).filter(DBPlaylist.id == playlist_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"playlist_{playlist_id}_{int(time.time())}{ext}"
    cover_bytes = file.file.read()
    cover_url = upload_file_to_supabase(cover_bytes, filename, "image/jpeg")
    pl.cover_url = cover_url
    db.commit()
    return {"coverUrl": normalize_url(cover_url)}

@app.post("/api/playlists/{playlist_id}/tracks/{track_id}")
def add_track_to_playlist(playlist_id: int, track_id: str, db: Session = Depends(get_db)):
    pl = db.query(DBPlaylist).filter(DBPlaylist.id == playlist_id).first()
    track = db.query(DBTrack).filter(DBTrack.id == track_id).first()
    if not pl or not track:
        raise HTTPException(status_code=404, detail="Playlist or Track not found")
    if track not in pl.tracks:
        pl.tracks.append(track)
        db.commit()
    return {"status": "added"}

@app.delete("/api/playlists/{playlist_id}/tracks/{track_id}")
def remove_track_from_playlist(playlist_id: int, track_id: str, db: Session = Depends(get_db)):
    pl = db.query(DBPlaylist).filter(DBPlaylist.id == playlist_id).first()
    track = db.query(DBTrack).filter(DBTrack.id == track_id).first()
    if not pl or not track:
        raise HTTPException(status_code=404, detail="Playlist or Track not found")
    if track in pl.tracks:
        pl.tracks.remove(track)
        db.commit()
    return {"status": "removed"}

@app.delete("/api/playlists/{playlist_id}")
def delete_playlist(playlist_id: int, db: Session = Depends(get_db)):
    pl = db.query(DBPlaylist).filter(DBPlaylist.id == playlist_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")
    db.delete(pl)
    db.commit()
    return {"status": "deleted"}

# --- LYRICS PROXY ---
@app.get("/api/lyrics")
def get_lyrics(title: str, artist: Optional[str] = None):
    clean_title = title.split("(")[0].split("[")[0].strip()
    clean_artist = artist.split(",")[0].split("&")[0].strip() if artist else ""
    headers = {"User-Agent": "Tune-fy-App/1.0"}
    try:
        res = requests.get(
            "https://lrclib.net/api/search",
            params={"track_name": clean_title, "artist_name": clean_artist},
            headers=headers,
            timeout=5,
        )
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, list) and len(data) > 0:
                match = next((item for item in data if item.get("syncedLyrics")), data[0])
                return {
                    "syncedLyrics": match.get("syncedLyrics"),
                    "plainLyrics": match.get("plainLyrics"),
                }
    except Exception:
        pass

    try:
        res = requests.get(
            "https://lrclib.net/api/search",
            params={"q": f"{clean_title} {clean_artist}".strip()},
            headers=headers,
            timeout=5,
        )
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, list) and len(data) > 0:
                match = next((item for item in data if item.get("syncedLyrics")), data[0])
                return {
                    "syncedLyrics": match.get("syncedLyrics"),
                    "plainLyrics": match.get("plainLyrics"),
                }
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="No lyrics found")