from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

playlist_tracks = Table(
    "playlist_tracks",
    Base.metadata,
    Column("playlist_id", Integer, ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True),
    Column("track_id", String, ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True),
)

class DBUser(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=True)  # <-- Added
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)

    playlists = relationship("DBPlaylist", back_populates="owner", cascade="all, delete-orphan")
    liked_songs = relationship("DBLikedSong", back_populates="user", cascade="all, delete-orphan")

class DBTrack(Base):
    __tablename__ = "tracks"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    artist = Column(String)
    cover_url = Column(String)
    audio_url = Column(String)
    duration = Column(Integer, default=210)

class DBPlaylist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    cover_url = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    owner = relationship("DBUser", back_populates="playlists")
    tracks = relationship("DBTrack", secondary=playlist_tracks, backref="playlists")

class DBLikedSong(Base):
    __tablename__ = "liked_songs"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(String, ForeignKey("tracks.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    user = relationship("DBUser", back_populates="liked_songs")
    track = relationship("DBTrack")