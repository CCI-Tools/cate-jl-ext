from pathlib import Path

import jupyter_server.serverapp

from ._version import __version__
from .handlers import setup_handlers

MODULE_NAME = Path(__file__).parent.name
EXTENSION_NAME = MODULE_NAME.replace('_', '-')


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": EXTENSION_NAME
    }]


def _jupyter_server_extension_points():
    return [{
        "module": MODULE_NAME
    }]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP
    requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyter_server.serverapp.ServerApp
        Server application instance
    """
    setup_handlers(server_app.web_app)
    server_app.log.info(f"Registered {MODULE_NAME} server extension")


# For backward compatibility with notebook server
# - useful for Binder/JupyterHub
load_jupyter_server_extension = _load_jupyter_server_extension
