from jupyter_server.utils import url_path_join

from .labinfo import LabInfoHandler
from .server import ServerHandler


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    web_app.add_handlers(host_pattern, [
        (url_path_join(base_url, "cate", "labinfo"), LabInfoHandler),
        (url_path_join(base_url, "cate", "server"), ServerHandler),
    ])

