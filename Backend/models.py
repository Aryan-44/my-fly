from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class Passenger(Base):
    __tablename__ = "passengers"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    route = Column(String, nullable=False)
    tier = Column(String, nullable=False)
    lastBooking = Column(String, nullable=False)

def get_session(db_url="sqlite:///passengers.db"):
    engine = create_engine(db_url, future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, future=True)()
