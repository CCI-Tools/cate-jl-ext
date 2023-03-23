import importlib.metadata
from pathlib import Path

import jupyter_core.paths


# Note: as we are storing runtime information here, we should use
#
data_path = Path("~").expanduser() / ".cate" / "jupyterlab"
lab_info_path = data_path / "lab-info.json"
lab_url_key = "lab_url"
has_proxy_key = "has_proxy"

remote_lab_root = "/home/jovyan"

server_info_file = data_path / "server-info.json"

server_log_file = Path.cwd() / "cate-server.log"
server_config_file = Path.cwd() / "cate-server.yaml"

default_server_port = 9090

default_server_config = """
# Cate server configuration file generated by 
# Cate JupyterLab extension (cate-jl-ext).
"""


def is_jupyter_server_proxy_enabled() -> bool:
    """Check if the Jupyter server extension "jupyter-server-proxy"
     is installed and enabled."""

    # Is it installed?
    try:
        importlib.metadata.version("jupyter-server-proxy")
    except importlib.metadata.PackageNotFoundError:
        return False

    # Is it installed?
    is_installed = False
    for labext_dir in jupyter_core.paths.jupyter_path("labextensions",
                                                      "@jupyterlab",
                                                      "server-proxy"):
        if Path(labext_dir).is_dir():
            is_installed = True
            break
    if not is_installed:
        return False

    # Now check whether it is disabled.
    is_disabled = False
    for config_dir in jupyter_core.paths.jupyter_config_path():
        page_config_file = Path(config_dir) / "labconfig" / "page_config.json"
        # File page_config.json will only exist,
        # if @jupyterlab/server-proxy has been disabled once.
        if page_config_file.is_file():
            with page_config_file.open() as fp:
                page_config = json.load(fp)
            try:
                is_disabled = page_config.get("disabledExtensions", {}) \
                    .get("@jupyterlab/server-proxy", False)
                break
            except AttributeError:
                pass

    return not is_disabled
