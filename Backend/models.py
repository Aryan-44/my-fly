from sqlalchemy import Column, Integer, String, Float, DateTime, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

Base = declarative_base()

class Passenger(Base):
    __tablename__ = "passengers"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    route = Column(String, nullable=False)
    tier = Column(String, nullable=False)
    lastBooking = Column(String, nullable=False)


# 🆕 NEW: Table for storing past seat demand analyses
class SeatDemandHistory(Base):
    __tablename__ = "seat_demand_history"
    id = Column(Integer, primary_key=True)
    source = Column(String, nullable=False)  # e.g., "Upload" or "Kaggle"
    dataset_name = Column(String, nullable=True)
    predicted_demand = Column(Float, nullable=True)
    festive_avg = Column(Float, nullable=True)
    message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    


def get_session(db_url="sqlite:///passengers.db"):
    engine = create_engine(db_url, future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, future=True)()
