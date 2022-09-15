import alembic.config
import alembic.command
import sqlalchemy

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

def run_db_migrations(db_config, db_conn):
    alembic_cfg = alembic.config.Config(db_config.alembic_ini_path)
    alembic_cfg.attributes['connection'] = db_conn
    alembic_cfg.set_main_option("script_location", db_config.alembic_script_path)
    alembic_cfg.set_main_option("sqlalchemy.url", db_config.db_url)

    alembic.command.upgrade(alembic_cfg, "head")
