import alembic.config
import alembic.command
import sqlalchemy
import sqlalchemy.orm
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func

Session = sqlalchemy.orm.sessionmaker()

class DbConfig():
    def __init__(self, alembic_ini_path, alembic_script_path, db_path):
        # TODO: Support proper URL escaping
        if db_path.count("?") > 0 or db_path.count("%") > 0:
            raise Exception(f"invalid db path: {db_path}")

        self.alembic_ini_path = alembic_ini_path
        self.alembic_script_path = alembic_script_path
        self.db_path = db_path
        self.db_url = f"sqlite:///{db_path}?mode=rwc"

        self.db_engine = sqlalchemy.create_engine(self.db_url)
        Session.configure(bind=self.db_engine)

def run_db_migrations(db_config, db_conn):
    alembic_cfg = alembic.config.Config(db_config.alembic_ini_path)
    alembic_cfg.attributes['connection'] = db_conn
    alembic_cfg.set_main_option("script_location", db_config.alembic_script_path)
    alembic_cfg.set_main_option("sqlalchemy.url", db_config.db_url)

    alembic.command.upgrade(alembic_cfg, "head")

Base = sqlalchemy.orm.declarative_base()

class Dream(Base):
    __tablename__ = 'dreams'

    id = Column(String, primary_key=True)
    prompt = Column(String, nullable=False)
    seed = Column(Integer, nullable=False)
    num_images = Column(Integer, nullable=False)
    settings_json = Column(String, nullable=False)
    base_image_path = Column(String)
    base_image_mask_path = Column(String)
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())

class DreamImage(Base):
    __tablename__ = 'dream_images'

    id = Column(String, primary_key=True)
    dream_id = Column(String, ForeignKey('dreams.id'), nullable=False)
    seed = Column(Integer, nullable=False)
    index = Column(Integer, nullable=False)
    image_path = Column(String, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    blurhash = Column(String, nullable=False)

class Settings(Base):
    __tablename__ = 'settings'

    key = Column(String, primary_key=True)
    settings_json = Column(String, nullable=False)
