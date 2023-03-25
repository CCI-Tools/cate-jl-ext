import json
import os.path
import subprocess
import sys
import threading
from typing import Any, Dict, List, Optional, Tuple

import jupyter_server.base.handlers
import psutil
import tornado.web

from ..config import default_server_port
from ..config import lab_info_path
from ..config import remote_lab_root
from ..config import server_log_file

CateServerInfo = Tuple[Optional[psutil.Popen], Optional[int], List[str]]
CateServerOutput = Tuple[Optional[str], Optional[str]]


# noinspection PyAbstractClass
class ServerHandler(jupyter_server.base.handlers.APIHandler):
    """Manage a single Cate server process."""

    # @tornado.web.authenticated
    def get(self):
        """Respond with server's process state.
        If there is no current server process, respond with status code 404.
        """
        self.finish(self.cate_server_state)

    # @tornado.web.authenticated
    def put(self):
        """Start a new Cate server.
        If the server is already running, do nothing.
        Respond with server's process state.
        If the server could not be started, respond with status code 500.
        """
        self._start_server()
        self.finish(self.cate_server_state)

    # @tornado.web.authenticated
    def delete(self):
        """Terminate a running Cate server.
        Respond with server's process state.
        If there is no current server process, respond with status code 404.
        """
        self._stop_server()
        self.finish(self.cate_server_state)

    @property
    def cate_server_state(self) -> Dict[str, Any]:
        process, port, cmdline = self.cate_server_info
        if process is None:
            raise tornado.web.HTTPError(
                status_code=404,
                log_message='Cate server process not started yet.'
            )
        # if not process.is_running():
        #     raise tornado.web.HTTPError(
        #         status_code=404,
        #         log_message='Cate server could not be started.'
        #     )

        stdout, stderr = self.cate_server_output
        # print(80 * "#")
        # print(type(stdout), type(stderr))
        # print(stdout)
        # print(stderr)
        # print(80 * "#")

        # TODO (forman): include stdout + stderr
        returncode = process.poll()
        server_state = {
            "port": port,
            "pid": process.pid,
            "returncode": returncode,
            "stdout": stdout,
            "stderr": stderr,
        }
        for attr, default_value in [
            ("status", "gone"),
            ("cmdline", cmdline),
            ("name", None),
            ("username", None),
        ]:
            try:
                server_state[attr] = getattr(process, attr)()
            except psutil.NoSuchProcess:
                server_state[attr] = default_value

        # import json
        # print(json.dumps(server_state, indent=2))

        return server_state

    @property
    def cate_server_info(self) -> CateServerInfo:
        try:
            return self.settings["cate_server_info"]
        except KeyError:
            return None, None, []

    @cate_server_info.setter
    def cate_server_info(self, value: CateServerInfo):
        self.settings["cate_server_info"] = value

    @property
    def cate_server_output(self) -> CateServerOutput:
        try:
            return self.settings["cate_server_output"]
        except KeyError:
            return None, None

    @cate_server_output.setter
    def cate_server_output(self, value: CateServerOutput):
        out, err = value
        if isinstance(out, bytes):
            out = out.decode('utf-8')
        if isinstance(err, bytes):
            err = err.decode('utf-8')
        self.settings["cate_server_output"] = out, err

    def _start_server(self):
        process, _, _ = self.cate_server_info
        if process is not None and process.is_running():
            return

        # Assuming already run: PUT /cate/lab_info
        if lab_info_path.exists():
            with lab_info_path.open(mode="r") as f:
                lab_info = json.load(f)
            lab_url = lab_info["lab_url"]
            is_local = any(lab_url.startswith(prefix)
                           for prefix in ("http://localhost",
                                          "http://127.0.0.1"))
        else:
            is_local = False

        # if not server_config_file.exists():
        #     with server_config_file.open("w") as f:
        #         f.write(default_server_config)

        # TODO (forman): Get free port
        port = default_server_port

        cmdline = [
            sys.executable,
            "-m",
            "cate.webapi.start",
            "--port", f"{port}",
            "--caller", "cate-jl-ext",
            "--logfile", f"{server_log_file}",
            "--verbose",
            "--traceback",
        ]
        if not is_local and os.path.isdir(remote_lab_root):
            cmdline.extend(["--root", remote_lab_root])

        self.log.info(f'Starting Cate Server: {cmdline}')
        try:
            process = psutil.Popen(cmdline,
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE)
            self.cate_server_info = process, port, cmdline

            def communicate():
                self.cate_server_output = process.communicate()

            threading.Thread(target=communicate).start()

        except OSError as e:
            raise tornado.web.HTTPError(
                status_code=500,
                log_message=f'Starting Cate Server failed: {e}'
            ) from e

    def _stop_server(self):
        process, _, _ = self.cate_server_info
        if process is not None:
            process.kill()
