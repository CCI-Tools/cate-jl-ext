import json

import jupyter_server.base.handlers
import tornado
import tornado.escape
import tornado.httpclient
import tornado.httputil
import tornado.web

from ..config import has_proxy_key
from ..config import is_jupyter_server_proxy_enabled
from ..config import lab_info_path
from ..config import lab_url_key


# noinspection PyAbstractClass
class LabInfoHandler(jupyter_server.base.handlers.APIHandler):
    # @tornado.web.authenticated
    def get(self):
        self._assert_lab_info_file()
        self.log.info(f"Reading {lab_info_path}")
        with lab_info_path.open(mode="r") as f:
            lab_info = json.load(f)
        self.finish(lab_info)

    # @tornado.web.authenticated
    def put(self):
        if not lab_info_path.parent.exists():
            lab_info_path.parent.mkdir(parents=True, exist_ok=True)
        lab_info = tornado.escape.json_decode(self.request.body)
        self._validate_lab_info(lab_info)
        lab_info[has_proxy_key] = is_jupyter_server_proxy_enabled()
        self.log.info(f"Writing {lab_info_path}: {lab_info}")
        with lab_info_path.open(mode="w") as fp:
            json.dump(lab_info, fp)
        self.finish(lab_info)

    # @tornado.web.authenticated
    # noinspection PyMethodMayBeStatic
    def delete(self):
        self._assert_lab_info_file()
        self.log.info(f"Deleting {lab_info_path}")
        lab_info_path.unlink()
        self.finish({})

    @staticmethod
    def _assert_lab_info_file():
        if not lab_info_path.is_file():
            raise tornado.web.HTTPError(
                404, reason="Lab info not found"
            )

    @staticmethod
    def _validate_lab_info(lab_info):
        lab_url = None
        if isinstance(lab_info, dict):
            lab_url = lab_info.get(lab_url_key)
        if not isinstance(lab_url, str) or lab_url == "":
            raise tornado.web.HTTPError(
                400, reason="Missing or invalid Lab info in request body"
            )
